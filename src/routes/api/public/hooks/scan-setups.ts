import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { detectBBBounce, type DetectedSetup } from "@/lib/feed/detectors/bb-bounce";
import { detectElliott } from "@/lib/feed/detectors/elliott";
import { aggregateM45 } from "@/lib/feed/m45";
import {
  BINANCE_INTERVAL,
  BINANCE_PAIR,
  INTERVALS,
  SCAN_SYMBOLS,
  type Candle,
  type Interval,
  type ScanSymbol,
} from "@/lib/feed/types";

async function fetchKlines(pair: string, binItv: string, limit = 200): Promise<Candle[]> {
  const url = `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${binItv}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const rows = (await res.json()) as Array<unknown[]>;
  const now = Date.now();
  return rows.map((r) => {
    const closeTime = Number(r[6]);
    return {
      openTime: Number(r[0]),
      open: parseFloat(r[1] as string),
      high: parseFloat(r[2] as string),
      low: parseFloat(r[3] as string),
      close: parseFloat(r[4] as string),
      volume: parseFloat(r[5] as string),
      closed: closeTime < now,
    } as Candle;
  });
}

async function loadCandles(symbol: ScanSymbol, interval: Interval): Promise<Candle[]> {
  const pair = BINANCE_PAIR[symbol];
  if (interval === "M45") {
    const m15 = await fetchKlines(pair, "15m", 300);
    return aggregateM45(m15.filter((c) => c.closed));
  }
  const all = await fetchKlines(pair, BINANCE_INTERVAL[interval], 200);
  return all.filter((c) => c.closed);
}

async function alreadyExists(
  symbol: string,
  interval: Interval,
  setup_type: string,
  entryISO: string,
): Promise<boolean> {
  const start = new Date(new Date(entryISO).getTime() - 30 * 60_000).toISOString();
  const { data } = await supabaseAdmin
    .from("detected_setups")
    .select("id")
    .is("user_id", null)
    .eq("symbol", symbol)
    .eq("interval", interval)
    .eq("setup_type", setup_type)
    .gte("entry_time", start)
    .limit(1);
  return !!(data && data.length > 0);
}

export const Route = createFileRoute("/api/public/hooks/scan-setups")({
  server: {
    handlers: {
      POST: async () => {
        let detected = 0, inserted = 0, errors = 0;
        for (const symbol of SCAN_SYMBOLS) {
          for (const interval of INTERVALS) {
            try {
              const candles = await loadCandles(symbol, interval);
              if (candles.length < 35) continue;
              const detectors: Array<(c: Candle[]) => DetectedSetup | null> = [
                detectBBBounce,
                detectElliott,
              ];
              for (const fn of detectors) {
                const setup = fn(candles);
                if (!setup) continue;
                detected += 1;
                const entryISO = new Date(setup.entry_time).toISOString();
                if (await alreadyExists(symbol, interval, setup.setup_type, entryISO)) continue;
                const { error } = await supabaseAdmin.from("detected_setups").insert({
                  user_id: null,
                  symbol,
                  interval,
                  setup_type: setup.setup_type,
                  wave_label: setup.wave_label ?? null,
                  direction: setup.direction,
                  entry_price: setup.entry_price,
                  stop_loss: setup.stop_loss,
                  take_profit: setup.take_profit,
                  signal_strength: setup.signal_strength,
                  entry_time: entryISO,
                  status: "active",
                  details: setup.details as never,
                });
                if (error) errors += 1;
                else inserted += 1;
              }
            } catch {
              errors += 1;
            }
          }
        }
        return new Response(
          JSON.stringify({ ok: true, detected, inserted, errors }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
