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
        const checks: Array<{
          id: string; symbol: string; interval: string; setup_type: string; direction: string;
          entry_price: number; stop_loss: number; take_profit: number;
          range: { high: number; low: number } | null;
          newStatus: "win" | "loss" | "still_active";
          reason: string;
        }> = [];
        for (const s of setups ?? []) {
          const range = await lastCandle(s.symbol, s.interval);
          if (!range) {
            checks.push({
              id: s.id, symbol: s.symbol, interval: s.interval, setup_type: s.setup_type, direction: s.direction,
              entry_price: Number(s.entry_price), stop_loss: Number(s.stop_loss), take_profit: Number(s.take_profit),
              range: null, newStatus: "still_active", reason: "Brak danych z Binance",
            });
            continue;
          }
          let result: "win" | "loss" | null = null;
          let reason = "Cena w korytarzu SL/TP";
          if (s.direction === "long") {
            if (range.high >= Number(s.take_profit)) { result = "win"; reason = `high ${range.high} ≥ TP ${s.take_profit}`; }
            else if (range.low <= Number(s.stop_loss)) { result = "loss"; reason = `low ${range.low} ≤ SL ${s.stop_loss}`; }
          } else {
            if (range.low <= Number(s.take_profit)) { result = "win"; reason = `low ${range.low} ≤ TP ${s.take_profit}`; }
            else if (range.high >= Number(s.stop_loss)) { result = "loss"; reason = `high ${range.high} ≥ SL ${s.stop_loss}`; }
          }
          checks.push({
            id: s.id, symbol: s.symbol, interval: s.interval, setup_type: s.setup_type, direction: s.direction,
            entry_price: Number(s.entry_price), stop_loss: Number(s.stop_loss), take_profit: Number(s.take_profit),
            range, newStatus: result ?? "still_active", reason,
          });
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
          details: {
            scanned: setups?.length ?? 0, updated, errors,
            wins: checks.filter((c) => c.newStatus === "win").length,
            losses: checks.filter((c) => c.newStatus === "loss").length,
            stillActive: checks.filter((c) => c.newStatus === "still_active").length,
            checks,
          } as never,
        }).eq("id", logId);

        return new Response(JSON.stringify({ ok: true, scanned: setups?.length ?? 0, updated }), {
          status: 200, headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
