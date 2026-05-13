import { getFeedManager } from "./feed-manager";
import { detectBBBounce, type DetectedSetup } from "./detectors/bb-bounce";
import { detectElliott } from "./detectors/elliott";
import { INTERVALS, SCAN_SYMBOLS, type Candle, type Interval, type ScanSymbol } from "./types";
import { ingestSetup } from "@/lib/setups.functions";

const lastSeenKey = (sym: string, itv: Interval, type: string) => `${sym}|${itv}|${type}`;
const seen = new Map<string, number>(); // key -> entry_time bucket

let started = false;
const unsubs: Array<() => void> = [];

export function startScanner() {
  if (started || typeof window === "undefined") return;
  started = true;
  const fm = getFeedManager();
  let lastClosedTime: Record<string, number> = {};

  for (const symbol of SCAN_SYMBOLS) {
    for (const interval of INTERVALS) {
      const key = `${symbol}:${interval}`;
      const off = fm.subscribe(symbol, interval, (candles: Candle[]) => {
        if (candles.length < 30) return;
        // Trigger on each newly closed candle.
        const lastClosed = [...candles].reverse().find((c) => c.closed);
        if (!lastClosed) return;
        if (lastClosedTime[key] === lastClosed.openTime) return;
        lastClosedTime[key] = lastClosed.openTime;

        const closedSeries = candles.filter((c) => c.closed || c === lastClosed);
        runDetectors(symbol, interval, closedSeries);
      });
      unsubs.push(off);
    }
  }
}

export function stopScanner() {
  unsubs.splice(0).forEach((u) => u());
  started = false;
  seen.clear();
}

async function runDetectors(symbol: ScanSymbol, interval: Interval, candles: Candle[]) {
  const detectors: Array<(c: Candle[]) => DetectedSetup | null> = [detectBBBounce, detectElliott];
  for (const fn of detectors) {
    const setup = fn(candles);
    if (!setup) continue;
    const key = lastSeenKey(symbol, interval, setup.setup_type);
    const bucket = Math.floor(setup.entry_time / (30 * 60_000));
    if (seen.get(key) === bucket) continue;
    seen.set(key, bucket);
    try {
      await ingestSetup({
        data: {
          symbol, interval,
          setup_type: setup.setup_type,
          wave_label: setup.wave_label ?? null,
          direction: setup.direction,
          entry_price: setup.entry_price,
          stop_loss: setup.stop_loss,
          take_profit: setup.take_profit,
          signal_strength: setup.signal_strength,
          entry_time: new Date(setup.entry_time).toISOString(),
          details: setup.details,
        },
      });
    } catch {/* swallow */}
  }
}
