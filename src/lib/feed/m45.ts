import type { Candle } from "./types";

// Aggregate consecutive M15 candles in groups of 3 → M45.
export function aggregateM45(m15: Candle[]): Candle[] {
  const out: Candle[] = [];
  // Anchor groups so first candle's openTime is divisible by 45min where possible.
  const start = m15.findIndex((c) => c.openTime % (45 * 60_000) === 0);
  const begin = start >= 0 ? start : 0;
  for (let i = begin; i + 2 < m15.length; i += 3) {
    const a = m15[i], b = m15[i + 1], c = m15[i + 2];
    out.push({
      openTime: a.openTime,
      open: a.open,
      high: Math.max(a.high, b.high, c.high),
      low: Math.min(a.low, b.low, c.low),
      close: c.close,
      volume: a.volume + b.volume + c.volume,
      closed: c.closed,
    });
  }
  return out;
}
