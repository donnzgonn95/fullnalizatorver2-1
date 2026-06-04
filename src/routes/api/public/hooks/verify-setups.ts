import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authorizeCronRequest, unauthorizedResponse } from "@/lib/cron-auth.server";
import { BINANCE_PAIR, type ScanSymbol } from "@/lib/feed/types";

const BINANCE_INTERVAL_MAP: Record<string, string> = {
  M15: "15m", M30: "30m", M45: "15m", H1: "1h", H4: "4h",
};

interface PostEntryCandle { openTime: number; high: number; low: number }

async function candlesAfterEntry(symbol: string, interval: string, entryTimeIso: string): Promise<PostEntryCandle[] | null> {
  const itv = BINANCE_INTERVAL_MAP[interval] ?? "1h";
  const pair = BINANCE_PAIR[symbol as ScanSymbol] ?? `${symbol}USDT`;
  // Fetch up to 500 candles starting from entry_time so we can chronologically
  // determine whether SL or TP was hit first (avoids the aggregate min/max
  // artefact where a tight TP near entry is "won" by any future candle).
  const startMs = Date.parse(entryTimeIso);
  if (!Number.isFinite(startMs)) return null;
  const url = `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${itv}&startTime=${startMs}&limit=500`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as Array<unknown[]>;
    return data.map((row) => ({
      openTime: Number(row[0]),
      high: parseFloat(row[2] as string),
      low: parseFloat(row[3] as string),
    }));
  } catch { return null; }
}

function resolveOutcome(
  direction: string,
  sl: number,
  tp: number,
  candles: PostEntryCandle[],
): { result: "win" | "loss" | null; reason: string } {
  for (const c of candles) {
    if (direction === "long") {
      const hitSl = c.low <= sl;
      const hitTp = c.high >= tp;
      // Ambiguous bar: assume worst case (SL first) — conservative verifier.
      if (hitSl && hitTp) return { result: "loss", reason: `ambiguous bar @ ${c.openTime}: low ${c.low} ≤ SL ${sl} & high ${c.high} ≥ TP ${tp} (conservative=loss)` };
      if (hitSl) return { result: "loss", reason: `low ${c.low} ≤ SL ${sl} @ ${c.openTime}` };
      if (hitTp) return { result: "win", reason: `high ${c.high} ≥ TP ${tp} @ ${c.openTime}` };
    } else {
      const hitSl = c.high >= sl;
      const hitTp = c.low <= tp;
      if (hitSl && hitTp) return { result: "loss", reason: `ambiguous bar @ ${c.openTime}: high ${c.high} ≥ SL ${sl} & low ${c.low} ≤ TP ${tp} (conservative=loss)` };
      if (hitSl) return { result: "loss", reason: `high ${c.high} ≥ SL ${sl} @ ${c.openTime}` };
      if (hitTp) return { result: "win", reason: `low ${c.low} ≤ TP ${tp} @ ${c.openTime}` };
    }
  }
  return { result: null, reason: "Cena nadal w korytarzu SL/TP" };
}

export const Route = createFileRoute("/api/public/hooks/verify-setups")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authorizeCronRequest(request);
        if (!auth.ok) return unauthorizedResponse(auth.status);
        const startedAt = new Date();
        const { data: logRow } = await supabaseAdmin.from("cron_run_logs").insert({
          job_name: "verify-setups", status: "running",
        }).select("id").single();
        const logId = logRow?.id as string | undefined;
        let terminalWritten = false;

        const writeTerminal = async (
          status: "success" | "partial" | "error",
          details: Record<string, unknown>,
          errorMessage: string | null,
        ) => {
          if (!logId || terminalWritten) return;
          terminalWritten = true;
          const finishedAt = new Date();
          await supabaseAdmin.from("cron_run_logs").update({
            finished_at: finishedAt.toISOString(),
            duration_ms: finishedAt.getTime() - startedAt.getTime(),
            status,
            error_message: errorMessage,
            details: details as never,
          }).eq("id", logId);
        };

        try {
          const { data: setups, error } = await supabaseAdmin
            .from("detected_setups").select("*")
            .in("status", ["pending", "active"]).limit(500);
          if (error) {
            console.error("verify-setups: load error", error);
            await writeTerminal("error", { error: "internal_error", message: error.message }, error.message);
            return new Response(JSON.stringify({ error: "Internal server error" }), {
              status: 500, headers: { "Content-Type": "application/json" },
            });
          }
          let updated = 0; let errors = 0;
          const checks: Array<{
            id: string; symbol: string; interval: string; setup_type: string; direction: string;
            entry_price: number; stop_loss: number; take_profit: number;
            candlesScanned: number;
            newStatus: "win" | "loss" | "still_active";
            reason: string;
          }> = [];
          for (const s of setups ?? []) {
            const candles = await candlesAfterEntry(s.symbol, s.interval, s.entry_time as unknown as string);
            if (!candles || candles.length === 0) {
              checks.push({
                id: s.id, symbol: s.symbol, interval: s.interval, setup_type: s.setup_type, direction: s.direction,
                entry_price: Number(s.entry_price), stop_loss: Number(s.stop_loss), take_profit: Number(s.take_profit),
                candlesScanned: 0, newStatus: "still_active", reason: "Brak danych z Binance po entry_time",
              });
              continue;
            }
            const { result, reason } = resolveOutcome(
              s.direction,
              Number(s.stop_loss),
              Number(s.take_profit),
              candles,
            );
            checks.push({
              id: s.id, symbol: s.symbol, interval: s.interval, setup_type: s.setup_type, direction: s.direction,
              entry_price: Number(s.entry_price), stop_loss: Number(s.stop_loss), take_profit: Number(s.take_profit),
              candlesScanned: candles.length, newStatus: result ?? "still_active", reason,
            });
            if (result) {
              const { error: uerr } = await supabaseAdmin.from("detected_setups").update({
                status: "completed", result, result_checked_at: new Date().toISOString(),
              }).eq("id", s.id);
              if (uerr) errors += 1; else updated += 1;
            }
          }


          await writeTerminal(errors > 0 ? "partial" : "success", {
            scanned: setups?.length ?? 0, updated, errors,
            wins: checks.filter((c) => c.newStatus === "win").length,
            losses: checks.filter((c) => c.newStatus === "loss").length,
            stillActive: checks.filter((c) => c.newStatus === "still_active").length,
            checks,
          }, null);

          return new Response(JSON.stringify({ ok: true, scanned: setups?.length ?? 0, updated }), {
            status: 200, headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          const msg = (e as Error)?.message ?? "unknown_fatal_error";
          console.error("verify-setups: fatal", e);
          await writeTerminal("error", { fatal: msg }, msg);
          return new Response(JSON.stringify({ ok: false, status: "error", error: msg }), {
            status: 500, headers: { "Content-Type": "application/json" },
          });
        } finally {
          // Safety net: if neither success nor explicit error path wrote a terminal status,
          // mark the row as error so it can never remain stuck in 'running'.
          if (logId && !terminalWritten) {
            await writeTerminal("error", { fatal: "handler_exited_without_terminal_status" }, "handler_exited_without_terminal_status");
          }
        }
      },

    },
  },
});
