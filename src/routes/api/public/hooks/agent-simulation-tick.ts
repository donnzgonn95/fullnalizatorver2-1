/**
 * Agent Simulation Loop — pojedynczy tick worker/cron.
 *
 * Tryby:
 *  - tick produkcyjny (POST z body {} lub bez body): pełna pętla z zapisem.
 *  - dry-run preview (POST { dry_run: true, agent_id?, report_id? }):
 *    wylicza decyzje bez zapisu, zwraca listę dla wybranego agenta/raportu.
 *
 * Zabezpieczenia:
 *  - autoryzacja przez `authorizeCronRequest` (CRON_SECRET albo admin JWT).
 *  - advisory lock (pg_try_advisory_lock) — drugi równoległy tick natychmiast
 *    wraca ze statusem `skipped_locked`.
 *  - idempotencja: unique indeksy na agent_report_reads (agent_id, report_id,
 *    report_kind), agent_decisions (agent_id, report_id) i agent_paper_trades
 *    (decision_id) plus `upsert(..., { ignoreDuplicates: true })`.
 *  - parametry SL/TP i nagroda/kara ELJOT są per-agent w
 *    `agent_simulation_config` (fallback do wartości domyślnych).
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
interface SimConfig {
  enabled: boolean;
  stop_loss_pct: number;
  take_profit_pct: number;
  reward_amount: number;
  penalty_amount: number;
  max_reports_per_tick: number;
}

const DEFAULT_CONFIG: SimConfig = {
  enabled: true,
  stop_loss_pct: 0.02,
  take_profit_pct: 0.04,
  reward_amount: 1,
  penalty_amount: 1,
  max_reports_per_tick: 1,
};

const MAX_AGENTS = 10;
// Stały klucz advisory locka — hash z nazwy joba zmieściłby się w bigint,
// używamy ręcznie wybranego identyfikatora.
const LOCK_KEY = 723194571n;

function hashSeed(...parts: string[]): number {
  const h = createHash("sha256").update(parts.join("|")).digest();
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
  return Number((100 + (seed % 59900)).toFixed(2));
}

async function loadConfig(agentId: string): Promise<SimConfig> {
  const { data } = await supabaseAdmin
    .from("agent_simulation_config")
    .select("enabled, stop_loss_pct, take_profit_pct, reward_amount, penalty_amount, max_reports_per_tick")
    .eq("agent_id", agentId)
    .maybeSingle();
  if (!data) return DEFAULT_CONFIG;
  return {
    enabled: data.enabled ?? DEFAULT_CONFIG.enabled,
    stop_loss_pct: Number(data.stop_loss_pct ?? DEFAULT_CONFIG.stop_loss_pct),
    take_profit_pct: Number(data.take_profit_pct ?? DEFAULT_CONFIG.take_profit_pct),
    reward_amount: Number(data.reward_amount ?? DEFAULT_CONFIG.reward_amount),
    penalty_amount: Number(data.penalty_amount ?? DEFAULT_CONFIG.penalty_amount),
    max_reports_per_tick: Number(data.max_reports_per_tick ?? DEFAULT_CONFIG.max_reports_per_tick),
  };
}

interface Preview {
  agent_id: string;
  agent_slug: string;
  report_id: string;
  report_title: string;
  guideline_id: string;
  verdict: Verdict;
  symbol: string;
  entry_price: number;
  stop_loss: number | null;
  take_profit: number | null;
  reward_delta: number;
  confidence: number;
  rationale: string;
}

function buildPreview(
  agent: AgentRow,
  guideline: GuidelineRow,
  report: ReportRow,
  cfg: SimConfig,
): Preview {
  const seed = hashSeed(agent.id, report.id, guideline.id);
  const verdict = pickVerdict(seed, true);
  const symbol = pickSymbol(report.payload, seed);
  const entryPrice = pickPrice(seed);
  const confidence = Number(((seed % 50) / 100 + 0.3).toFixed(2));
  let stop_loss: number | null = null;
  let take_profit: number | null = null;
  if (verdict === "BUY" || verdict === "SELL") {
    stop_loss = Number(
      (verdict === "BUY"
        ? entryPrice * (1 - cfg.stop_loss_pct)
        : entryPrice * (1 + cfg.stop_loss_pct)
      ).toFixed(2),
    );
    take_profit = Number(
      (verdict === "BUY"
        ? entryPrice * (1 + cfg.take_profit_pct)
        : entryPrice * (1 - cfg.take_profit_pct)
      ).toFixed(2),
    );
  }
  const reward_delta =
    verdict === "BUY" || verdict === "SELL"
      ? cfg.reward_amount
      : verdict === "REJECT"
        ? -cfg.penalty_amount
        : 0;
  const rationale =
    `Wytyczna "${guideline.title}" (priorytet ${guideline.priority}) ` +
    `zastosowana do raportu "${report.title}" [${report.kind}]: werdykt ${verdict} ${symbol}.`;
  return {
    agent_id: agent.id,
    agent_slug: agent.slug,
    report_id: report.id,
    report_title: report.title,
    guideline_id: guideline.id,
    verdict,
    symbol,
    entry_price: entryPrice,
    stop_loss,
    take_profit,
    reward_delta,
    confidence,
    rationale,
  };
}

interface TickBody {
  dry_run?: boolean;
  agent_id?: string;
  report_id?: string;
}

export const Route = createFileRoute("/api/public/hooks/agent-simulation-tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authorizeCronRequest(request);
        if (!auth.ok) return unauthorizedResponse(auth.status);

        let body: TickBody = {};
        try {
          const raw = await request.text();
          if (raw && raw.trim().length > 0) body = JSON.parse(raw) as TickBody;
        } catch {
          body = {};
        }
        const dryRun = body.dry_run === true;
        const filterAgentId = typeof body.agent_id === "string" ? body.agent_id : null;
        const filterReportId = typeof body.report_id === "string" ? body.report_id : null;

        // ---------- DRY RUN ----------
        if (dryRun) {
          const previews: Preview[] = [];
          const errs: string[] = [];

          let agentsQ = supabaseAdmin
            .from("agents")
            .select("id, slug, name")
            .eq("status", "active")
            .order("created_at", { ascending: true })
            .limit(MAX_AGENTS);
          if (filterAgentId) agentsQ = agentsQ.eq("id", filterAgentId);
          const { data: agentsData, error: agentsErr } = await agentsQ;
          if (agentsErr)
            return new Response(JSON.stringify({ ok: false, error: agentsErr.message }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          const agents = (agentsData ?? []) as AgentRow[];

          const { data: glData } = await supabaseAdmin
            .from("agent_guidelines")
            .select("id, title, rules, priority, agent_id")
            .eq("is_active", true)
            .order("priority", { ascending: false })
            .limit(50);
          const guidelines = (glData ?? []) as GuidelineRow[];

          for (const agent of agents) {
            const cfg = await loadConfig(agent.id);
            const ag = guidelines.filter((g) => g.agent_id === null || g.agent_id === agent.id);
            if (ag.length === 0) continue;
            const top = ag[0];

            let repQ = supabaseAdmin
              .from("reports")
              .select("id, kind, title, payload, report_date")
              .order("report_date", { ascending: false })
              .order("created_at", { ascending: false })
              .limit(20);
            if (filterReportId) repQ = repQ.eq("id", filterReportId);
            const { data: repData, error: repErr } = await repQ;
            if (repErr) {
              errs.push(`reports[${agent.slug}]: ${repErr.message}`);
              continue;
            }
            for (const r of (repData ?? []).slice(0, cfg.max_reports_per_tick) as ReportRow[]) {
              previews.push(buildPreview(agent, top, r, cfg));
            }
          }

          return new Response(
            JSON.stringify({ ok: true, dry_run: true, count: previews.length, previews, errors: errs }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }

        // ---------- REAL TICK ----------
        // Advisory lock — drugi równoległy run dostaje 200 + skipped_locked.
        const { data: lockData, error: lockErr } = await supabaseAdmin.rpc("try_sim_advisory_lock", {
          p_key: Number(LOCK_KEY),
        });
        if (lockErr) {
          return new Response(JSON.stringify({ ok: false, error: `lock: ${lockErr.message}` }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (lockData !== true) {
          return new Response(
            JSON.stringify({ ok: true, status: "skipped_locked" }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }

        const startedAt = new Date();
        const { data: logRow } = await supabaseAdmin
          .from("cron_run_logs")
          .insert({ job_name: "agent-simulation-tick", status: "running" })
          .select("id")
          .single();
        const logId = logRow?.id as string | undefined;

        const actions: Array<{
          agent_slug: string;
          decision_id: string;
          verdict: Verdict;
          symbol: string;
        }> = [];
        const errorMessages: string[] = [];
        let decisionsCreated = 0;
        let tradesOpened = 0;
        let skippedDuplicates = 0;

        try {
          const { data: agentsData, error: agentsErr } = await supabaseAdmin
            .from("agents")
            .select("id, slug, name")
            .eq("status", "active")
            .order("created_at", { ascending: true })
            .limit(MAX_AGENTS);
          if (agentsErr) throw new Error(`agents: ${agentsErr.message}`);
          const agents = (agentsData ?? []) as AgentRow[];

          const { data: glData } = await supabaseAdmin
            .from("agent_guidelines")
            .select("id, title, rules, priority, agent_id")
            .eq("is_active", true)
            .order("priority", { ascending: false })
            .limit(50);
          const guidelines = (glData ?? []) as GuidelineRow[];

          for (const agent of agents) {
            const cfg = await loadConfig(agent.id);
            if (!cfg.enabled) continue;
            const ag = guidelines.filter((g) => g.agent_id === null || g.agent_id === agent.id);
            if (ag.length === 0) continue;
            const top = ag[0];

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
              .slice(0, cfg.max_reports_per_tick) as ReportRow[];

            for (const report of candidates) {
              const preview = buildPreview(agent, top, report, cfg);

              // a) decyzja PIERWSZA (idempotentny upsert po agent_id+report_id) —
              //    żeby nigdy nie zostawić "przeczytanego" raportu bez decyzji.
              const { data: decisionUpsert, error: decisionErr } = await supabaseAdmin
                .from("agent_decisions")
                .upsert(
                  {
                    agent_id: agent.id,
                    guideline_id: top.id,
                    report_id: report.id,
                    report_kind: "public",
                    symbol: preview.symbol,
                    verdict: preview.verdict,
                    rationale: preview.rationale,
                    confidence: preview.confidence,
                    payload: {
                      entry_price: preview.entry_price,
                      guideline_priority: top.priority,
                      report_date: report.report_date,
                    } as never,
                  },
                  { onConflict: "agent_id,report_id", ignoreDuplicates: true },
                )
                .select("id");
              if (decisionErr) {
                errorMessages.push(`decision[${agent.slug}]: ${decisionErr.message}`);
                continue;
              }
              if (!decisionUpsert || decisionUpsert.length === 0) {
                // decyzja już istnieje — traktujemy jako duplikat i oznaczamy read,
                // żeby nie wracać do tego raportu w kolejnych tickach.
                skippedDuplicates += 1;
                await supabaseAdmin
                  .from("agent_report_reads")
                  .upsert(
                    {
                      agent_id: agent.id,
                      report_id: report.id,
                      report_kind: "public",
                      notes: `tick:${startedAt.toISOString()}:dup`,
                    },
                    { onConflict: "agent_id,report_id,report_kind", ignoreDuplicates: true },
                  );
                continue;
              }
              decisionsCreated += 1;
              const decisionId = decisionUpsert[0].id as string;

              // b) odczyt raportu PO udanej decyzji (idempotentny upsert).
              const { error: readErr } = await supabaseAdmin
                .from("agent_report_reads")
                .upsert(
                  {
                    agent_id: agent.id,
                    report_id: report.id,
                    report_kind: "public",
                    notes: `tick:${startedAt.toISOString()}`,
                  },
                  { onConflict: "agent_id,report_id,report_kind", ignoreDuplicates: true },
                );
              if (readErr) {
                errorMessages.push(`read[${agent.slug}/${report.id}]: ${readErr.message}`);
              }


              // c) paper trade (idempotentny upsert po decision_id)
              let tradeId: string | null = null;
              if (preview.verdict === "BUY" || preview.verdict === "SELL") {
                const side = preview.verdict === "BUY" ? "long" : "short";
                const { data: tradeUpsert, error: tradeErr } = await supabaseAdmin
                  .from("agent_paper_trades")
                  .upsert(
                    {
                      agent_id: agent.id,
                      decision_id: decisionId,
                      report_id: report.id,
                      symbol: preview.symbol,
                      side,
                      quantity: 1,
                      entry_price: preview.entry_price,
                      stop_loss: preview.stop_loss,
                      take_profit: preview.take_profit,
                      status: "open",
                    },
                    { onConflict: "decision_id", ignoreDuplicates: true },
                  )
                  .select("id");
                if (tradeErr) {
                  errorMessages.push(`trade[${agent.slug}]: ${tradeErr.message}`);
                } else if (tradeUpsert && tradeUpsert.length > 0) {
                  tradeId = tradeUpsert[0].id as string;
                  tradesOpened += 1;
                }
              }

              // d) journal
              await supabaseAdmin.from("agent_journal").insert({
                agent_id: agent.id,
                decision_id: decisionId,
                trade_id: tradeId,
                topic: `tick:${preview.verdict}:${preview.symbol}`,
                content: preview.rationale,
                tags: ["simulation", "tick", preview.verdict.toLowerCase()],
              });

              // e) ELJOT + treasury event
              if (preview.reward_delta !== 0) {
                const { data: eljotRow } = await supabaseAdmin
                  .from("eljot_ledger")
                  .insert({
                    agent_id: agent.id,
                    amount: preview.reward_delta,
                    reason: `simulation ${preview.verdict} ${preview.symbol}`,
                  })
                  .select("id")
                  .single();
                await supabaseAdmin.from("treasury_events").insert({
                  agent_id: agent.id,
                  decision_id: decisionId,
                  eljot_entry_id: eljotRow?.id ?? null,
                  currency: "ELJOT",
                  delta: preview.reward_delta,
                  reason: `simulation tick ${preview.verdict}`,
                  payload: { symbol: preview.symbol, report_id: report.id } as never,
                });
              }

              actions.push({
                agent_slug: agent.slug,
                decision_id: decisionId,
                verdict: preview.verdict,
                symbol: preview.symbol,
              });
            }
          }
        } catch (e) {
          errorMessages.push((e as Error).message ?? "unknown");
        } finally {
          await supabaseAdmin.rpc("release_sim_advisory_lock", { p_key: Number(LOCK_KEY) });
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
                skippedDuplicates,
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
            skippedDuplicates,
            actions: actions.length,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
