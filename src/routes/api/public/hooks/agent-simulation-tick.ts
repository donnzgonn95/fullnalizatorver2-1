/**
 * Agent Simulation Loop — pojedynczy tick worker/cron.
 *
 * Pętla:
 *  1) Pobiera aktywnych agentów (status='active').
 *  2) Pobiera aktywne wytyczne (agent_guidelines.is_active=true).
 *  3) Dla każdego agenta wybiera najnowszy nieprzeczytany raport (public reports).
 *  4) Tworzy deterministyczną decyzję (BUY/SELL/WAIT/REJECT) z rationale.
 *  5) Zapisuje agent_report_reads + agent_decisions + agent_journal.
 *  6) Dla BUY/SELL otwiera agent_paper_trades (status='open').
 *  7) Nagroda ELJOT → eljot_ledger + treasury_events (trigger zapisuje balance).
 *
 * Endpoint publiczny `/api/public/*` chroniony przez `authorizeCronRequest`
 * (CRON_SECRET albo admin JWT). Tryb symulacji — brak realnych zleceń.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authorizeCronRequest, unauthorizedResponse } from "@/lib/cron-auth.server";

type Verdict = "BUY" | "SELL" | "WAIT" | "REJECT";

interface AgentRow {
  id: string;
  slug: string;
  name: string;
}
interface ReportRow {
  id: string;
  kind: string;
  title: string;
  payload: Record<string, unknown> | null;
  report_date: string;
}
interface GuidelineRow {
  id: string;
  title: string;
  rules: Record<string, unknown> | null;
  priority: number;
  agent_id: string | null;
}

interface TickAction {
  agent_id: string;
  agent_slug: string;
  report_id: string;
  decision_id: string;
  verdict: Verdict;
  symbol: string;
  trade_id: string | null;
}

const MAX_AGENTS = 10;
const MAX_REPORTS_PER_AGENT = 1;
const REWARD_AMOUNT = 1;

function hashSeed(...parts: string[]): number {
  const h = createHash("sha256").update(parts.join("|")).digest();
  // 32-bit unsigned from first 4 bytes
  return h.readUInt32BE(0);
}

function pickVerdict(seed: number, hasGuidelines: boolean): Verdict {
  if (!hasGuidelines) return "WAIT";
  const m = seed % 100;
  if (m < 35) return "BUY";
  if (m < 60) return "SELL";
  if (m < 90) return "WAIT";
  return "REJECT";
}

function pickSymbol(payload: Record<string, unknown> | null, fallbackSeed: number): string {
  const candidates = ["BTC", "ETH", "SOL", "BNB", "XRP"];
  if (payload && typeof payload === "object") {
    const s = (payload as Record<string, unknown>).symbol;
    if (typeof s === "string" && s.length >= 2 && s.length <= 12) return s.toUpperCase();
  }
  return candidates[fallbackSeed % candidates.length];
}

function pickPrice(seed: number): number {
  // 100 .. 60000 deterministic
  return Number((100 + (seed % 59900)).toFixed(2));
}

export const Route = createFileRoute("/api/public/hooks/agent-simulation-tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authorizeCronRequest(request);
        if (!auth.ok) return unauthorizedResponse(auth.status);

        const startedAt = new Date();
        const { data: logRow } = await supabaseAdmin
          .from("cron_run_logs")
          .insert({ job_name: "agent-simulation-tick", status: "running" })
          .select("id")
          .single();
        const logId = logRow?.id as string | undefined;

        const actions: TickAction[] = [];
        const errorMessages: string[] = [];
        let decisionsCreated = 0;
        let tradesOpened = 0;

        try {
          // 1) Active agents
          const { data: agentsData, error: agentsErr } = await supabaseAdmin
            .from("agents")
            .select("id, slug, name")
            .eq("status", "active")
            .order("created_at", { ascending: true })
            .limit(MAX_AGENTS);
          if (agentsErr) throw new Error(`agents: ${agentsErr.message}`);
          const agents = (agentsData ?? []) as AgentRow[];

          // 2) Active guidelines (global + per-agent)
          const { data: guidelinesData } = await supabaseAdmin
            .from("agent_guidelines")
            .select("id, title, rules, priority, agent_id")
            .eq("is_active", true)
            .order("priority", { ascending: false })
            .limit(50);
          const guidelines = (guidelinesData ?? []) as GuidelineRow[];

          for (const agent of agents) {
            const agentGuidelines = guidelines.filter(
              (g) => g.agent_id === null || g.agent_id === agent.id,
            );
            if (agentGuidelines.length === 0) {
              // Brak wytycznych → agent nic nie robi w tym ticku.
              continue;
            }
            const topGuideline = agentGuidelines[0];

            // 3) Najnowsze raporty (public) jeszcze nieprzeczytane przez agenta
            const { data: readRows } = await supabaseAdmin
              .from("agent_report_reads")
              .select("report_id")
              .eq("agent_id", agent.id)
              .eq("report_kind", "public")
              .order("read_at", { ascending: false })
              .limit(200);
            const readIds = new Set((readRows ?? []).map((r) => r.report_id as string));

            const { data: reportsData, error: reportsErr } = await supabaseAdmin
              .from("reports")
              .select("id, kind, title, payload, report_date")
              .order("report_date", { ascending: false })
              .order("created_at", { ascending: false })
              .limit(20);
            if (reportsErr) {
              errorMessages.push(`reports[${agent.slug}]: ${reportsErr.message}`);
              continue;
            }
            const candidates = (reportsData ?? [])
              .filter((r) => !readIds.has(r.id as string))
              .slice(0, MAX_REPORTS_PER_AGENT) as ReportRow[];

            for (const report of candidates) {
              const seed = hashSeed(agent.id, report.id, topGuideline.id);
              const verdict = pickVerdict(seed, true);
              const symbol = pickSymbol(report.payload, seed);
              const entryPrice = pickPrice(seed);
              const confidence = Number(((seed % 50) / 100 + 0.3).toFixed(2)); // 0.30..0.79
              const rationale =
                `Wytyczna "${topGuideline.title}" (priorytet ${topGuideline.priority}) ` +
                `zastosowana do raportu "${report.title}" [${report.kind}]: werdykt ${verdict} ${symbol}.`;

              // a) zapis odczytu raportu
              const { error: readErr } = await supabaseAdmin
                .from("agent_report_reads")
                .insert({
                  agent_id: agent.id,
                  report_id: report.id,
                  report_kind: "public",
                  notes: `tick:${startedAt.toISOString()}`,
                });
              if (readErr) {
                errorMessages.push(`read[${agent.slug}/${report.id}]: ${readErr.message}`);
                continue;
              }

              // b) decyzja
              const { data: decisionRow, error: decisionErr } = await supabaseAdmin
                .from("agent_decisions")
                .insert({
                  agent_id: agent.id,
                  guideline_id: topGuideline.id,
                  report_id: report.id,
                  report_kind: "public",
                  symbol,
                  verdict,
                  rationale,
                  confidence,
                  payload: {
                    entry_price: entryPrice,
                    guideline_priority: topGuideline.priority,
                    report_date: report.report_date,
                  } as never,
                })
                .select("id")
                .single();
              if (decisionErr || !decisionRow) {
                errorMessages.push(`decision[${agent.slug}]: ${decisionErr?.message ?? "no row"}`);
                continue;
              }
              decisionsCreated += 1;
              const decisionId = decisionRow.id as string;

              // c) paper trade dla BUY/SELL
              let tradeId: string | null = null;
              if (verdict === "BUY" || verdict === "SELL") {
                const side = verdict === "BUY" ? "long" : "short";
                const slPct = 0.02;
                const tpPct = 0.04;
                const stop_loss = Number(
                  (verdict === "BUY" ? entryPrice * (1 - slPct) : entryPrice * (1 + slPct)).toFixed(2),
                );
                const take_profit = Number(
                  (verdict === "BUY" ? entryPrice * (1 + tpPct) : entryPrice * (1 - tpPct)).toFixed(2),
                );
                const { data: tradeRow, error: tradeErr } = await supabaseAdmin
                  .from("agent_paper_trades")
                  .insert({
                    agent_id: agent.id,
                    decision_id: decisionId,
                    report_id: report.id,
                    symbol,
                    side,
                    quantity: 1,
                    entry_price: entryPrice,
                    stop_loss,
                    take_profit,
                    status: "open",
                  })
                  .select("id")
                  .single();
                if (tradeErr || !tradeRow) {
                  errorMessages.push(`trade[${agent.slug}]: ${tradeErr?.message ?? "no row"}`);
                } else {
                  tradeId = tradeRow.id as string;
                  tradesOpened += 1;
                }
              }

              // d) journal
              await supabaseAdmin.from("agent_journal").insert({
                agent_id: agent.id,
                decision_id: decisionId,
                trade_id: tradeId,
                topic: `tick:${verdict}:${symbol}`,
                content: rationale,
                tags: ["simulation", "tick", verdict.toLowerCase()],
              });

              // e) ELJOT + treasury event (kary/nagrody przez ledger)
              const rewardAmount =
                verdict === "BUY" || verdict === "SELL" ? REWARD_AMOUNT : verdict === "WAIT" ? 0 : -REWARD_AMOUNT;
              if (rewardAmount !== 0) {
                const { data: eljotRow } = await supabaseAdmin
                  .from("eljot_ledger")
                  .insert({
                    agent_id: agent.id,
                    amount: rewardAmount,
                    reason: `simulation ${verdict} ${symbol}`,
                  })
                  .select("id")
                  .single();
                await supabaseAdmin.from("treasury_events").insert({
                  agent_id: agent.id,
                  decision_id: decisionId,
                  eljot_entry_id: eljotRow?.id ?? null,
                  currency: "ELJOT",
                  delta: rewardAmount,
                  reason: `simulation tick ${verdict}`,
                  payload: { symbol, report_id: report.id } as never,
                });
              }

              actions.push({
                agent_id: agent.id,
                agent_slug: agent.slug,
                report_id: report.id,
                decision_id: decisionId,
                verdict,
                symbol,
                trade_id: tradeId,
              });
            }
          }
        } catch (e) {
          errorMessages.push((e as Error).message ?? "unknown");
        }

        const finishedAt = new Date();
        const status =
          errorMessages.length > 0 ? (decisionsCreated > 0 ? "partial" : "error") : "success";
        if (logId) {
          await supabaseAdmin
            .from("cron_run_logs")
            .update({
              finished_at: finishedAt.toISOString(),
              duration_ms: finishedAt.getTime() - startedAt.getTime(),
              status,
              details: {
                decisionsCreated,
                tradesOpened,
                actionsCount: actions.length,
                actions: actions.slice(0, 50),
                errorMessages: errorMessages.slice(0, 20),
              } as never,
            })
            .eq("id", logId);
        }

        return new Response(
          JSON.stringify({
            ok: errorMessages.length === 0,
            decisionsCreated,
            tradesOpened,
            actions: actions.length,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
