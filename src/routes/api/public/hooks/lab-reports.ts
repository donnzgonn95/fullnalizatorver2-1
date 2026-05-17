// Cron endpoint: generates morning/evening lab reports per user, stores them
// in lab_reports, mirrors a summary into decision_logs, and (if Telegram is
// enabled for the user) pushes the report via api.telegram.org with retry.
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authorizeCronRequest, unauthorizedResponse } from "@/lib/cron-auth.server";

type ReportType = "morning" | "evening";

async function tgSend(token: string, chatId: string, text: string): Promise<{ ok: boolean; status: number; body: unknown }> {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  let last: { ok: boolean; status: number; body: unknown } = { ok: false, status: 0, body: null };
  for (let i = 1; i <= 3; i++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      });
      const body = await res.json().catch(() => ({}));
      last = { ok: res.ok, status: res.status, body };
      if (res.ok) return last;
      if (res.status >= 400 && res.status < 500 && res.status !== 429) return last;
    } catch (e) {
      last = { ok: false, status: 0, body: { error: String(e) } };
    }
    await new Promise((r) => setTimeout(r, 500 * i));
  }
  return last;
}

function pl(n: number) {
  return n.toLocaleString("pl-PL", { maximumFractionDigits: 2 });
}

async function buildMorningReport(userId: string, date: string) {
  const { data: trades } = await supabaseAdmin
    .from("lab_paper_trades")
    .select("status")
    .eq("user_id", userId);
  const open = trades?.filter((t) => t.status === "opened" || t.status === "monitoring").length ?? 0;
  const planned = trades?.filter((t) => t.status === "planned").length ?? 0;

  const content = {
    date,
    headline: `Poranny brief ${date}`,
    open_positions: open,
    planned_setups: planned,
    notes: ["Przegląd Asia/Europa pre-market.", "Sprawdź kalendarz makro i kill_switch.", "Zaplanuj max trades zgodnie z risk settings."],
  };
  const text = [
    `🌅 [PAPER] Poranny brief — ${date}`,
    `Otwarte pozycje: ${open}`,
    `Setupy w planie: ${planned}`,
    `Pamiętaj o limitach z Risk Engine.`,
  ].join("\n");
  return { content, text };
}

async function buildEveningReport(userId: string, date: string) {
  const { data: closed } = await supabaseAdmin
    .from("lab_paper_trades")
    .select("result_pnl, closed_at, instrument")
    .eq("user_id", userId)
    .gte("closed_at", `${date}T00:00:00Z`)
    .lte("closed_at", `${date}T23:59:59Z`);

  const realized = (closed ?? []).reduce((s, t) => s + Number(t.result_pnl ?? 0), 0);
  const wins = (closed ?? []).filter((t) => Number(t.result_pnl ?? 0) > 0).length;
  const losses = (closed ?? []).filter((t) => Number(t.result_pnl ?? 0) < 0).length;

  const { count: btRuns } = await supabaseAdmin
    .from("lab_backtest_runs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("started_at", `${date}T00:00:00Z`);

  const content = {
    date,
    headline: `Wieczorny raport ${date}`,
    daily_pnl: realized,
    wins,
    losses,
    closed_trades: closed?.length ?? 0,
    backtest_runs_today: btRuns ?? 0,
  };
  const text = [
    `🌙 [PAPER] Wieczorny raport — ${date}`,
    `Daily PnL: ${pl(realized)}`,
    `Zamknięte: ${closed?.length ?? 0} (W:${wins} / L:${losses})`,
    `Backtest runy dziś: ${btRuns ?? 0}`,
  ].join("\n");
  return { content, text };
}

async function processUser(userId: string, type: ReportType, date: string) {
  const { content, text } = type === "morning"
    ? await buildMorningReport(userId, date)
    : await buildEveningReport(userId, date);

  // Persist report (one per user/type/date)
  await supabaseAdmin.from("lab_reports").insert({
    user_id: userId, report_type: type, report_date: date, content,
  });

  // Mirror to decision journal
  await supabaseAdmin.from("decision_logs").insert({
    user_id: userId, source: "lab-cron", verdict: type === "morning" ? "obserwuj" : "podsumowanie",
    payload: content as never, note: `Auto: raport ${type} (${date})`, approved: null,
  });

  // Optional Telegram push
  const { data: cfg } = await supabaseAdmin
    .from("lab_telegram_config").select("*").eq("user_id", userId).maybeSingle();
  if (cfg?.enabled && cfg.bot_token && cfg.chat_id) {
    const tg = await tgSend(cfg.bot_token, cfg.chat_id, text);
    return { userId, sent: tg.ok, status: tg.status };
  }
  return { userId, sent: false, status: 0 };
}

export const Route = createFileRoute("/api/public/hooks/lab-reports")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authorizeCronRequest(request);
        if (!auth.ok) return unauthorizedResponse(auth.status);
        try {
          const url = new URL(request.url);
          const body = await request.json().catch(() => ({}));
          const type = (body.type ?? url.searchParams.get("type") ?? "morning") as ReportType;
          if (type !== "morning" && type !== "evening") {
            return new Response(JSON.stringify({ error: "Invalid type" }), {
              status: 400, headers: { "Content-Type": "application/json" },
            });
          }
          const rawDate = (body.date ?? url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10)) as string;
          if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
            return new Response(JSON.stringify({ error: "Invalid date (expected YYYY-MM-DD)" }), {
              status: 400, headers: { "Content-Type": "application/json" },
            });
          }
          const date = rawDate;

          // Active users = those with risk settings or telegram config
          const { data: users } = await supabaseAdmin
            .from("lab_risk_settings")
            .select("user_id");
          const userIds = Array.from(new Set((users ?? []).map((u: any) => u.user_id)));

          let processed = 0;
          let sent = 0;
          let failed = 0;
          for (const uid of userIds) {
            try {
              const r = await processUser(uid as string, type, date);
              processed += 1;
              if (r.sent) sent += 1;
            } catch (e) {
              failed += 1;
              console.error(`lab-reports: user ${uid} failed`, e);
            }
          }

          return new Response(JSON.stringify({ ok: true, type, date, processed, sent, failed }), {
            status: 200, headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          console.error("lab-reports cron error", e);
          return new Response(JSON.stringify({ error: "Internal server error" }), {
            status: 500, headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
