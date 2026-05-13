import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { BINANCE_PAIR, type ScanSymbol } from "@/lib/feed/types";

const BINANCE_INTERVAL_MAP: Record<string, string> = {
  M15: "15m", M30: "30m", M45: "15m", H1: "1h", H4: "4h",
};

async function lastCandle(symbol: string, interval: string) {
  const itv = BINANCE_INTERVAL_MAP[interval] ?? "1h";
  const pair = BINANCE_PAIR[symbol as ScanSymbol] ?? `${symbol}USDT`;
  const url = `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${itv}&limit=20`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as Array<unknown[]>;
    let high = -Infinity, low = Infinity;
    for (const row of data) {
      high = Math.max(high, parseFloat(row[2] as string));
      low = Math.min(low, parseFloat(row[3] as string));
    }
    return { high, low };
  } catch { return null; }
}

export const Route = createFileRoute("/api/public/hooks/verify-setups")({
  server: {
    handlers: {
      POST: async () => {
        const startedAt = new Date();
        const { data: logRow } = await supabaseAdmin.from("cron_run_logs").insert({
          job_name: "verify-setups", status: "running",
        }).select("id").single();
        const logId = logRow?.id as string | undefined;

        const { data: setups, error } = await supabaseAdmin
          .from("detected_setups").select("*")
          .in("status", ["pending", "active"]).limit(500);
        if (error) {
          if (logId) await supabaseAdmin.from("cron_run_logs").update({
            finished_at: new Date().toISOString(), status: "error",
            details: { error: error.message },
          }).eq("id", logId);
          return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
        let updated = 0; let errors = 0;
        for (const s of setups ?? []) {
          const range = await lastCandle(s.symbol, s.interval);
          if (!range) continue;
          let result: "win" | "loss" | null = null;
          if (s.direction === "long") {
            if (range.high >= Number(s.take_profit)) result = "win";
            else if (range.low <= Number(s.stop_loss)) result = "loss";
          } else {
            if (range.low <= Number(s.take_profit)) result = "win";
            else if (range.high >= Number(s.stop_loss)) result = "loss";
          }
          if (result) {
            const { error: uerr } = await supabaseAdmin.from("detected_setups").update({
              status: "completed", result, result_checked_at: new Date().toISOString(),
            }).eq("id", s.id);
            if (uerr) errors += 1; else updated += 1;
          }
        }

        const finishedAt = new Date();
        if (logId) await supabaseAdmin.from("cron_run_logs").update({
          finished_at: finishedAt.toISOString(),
          duration_ms: finishedAt.getTime() - startedAt.getTime(),
          status: errors > 0 ? "partial" : "success",
          details: { scanned: setups?.length ?? 0, updated, errors },
        }).eq("id", logId);

        return new Response(JSON.stringify({ ok: true, scanned: setups?.length ?? 0, updated }), {
          status: 200, headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
