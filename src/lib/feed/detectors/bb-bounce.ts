import { bollinger, rsi } from "../indicators";
import type { Candle } from "../types";

export interface DetectedSetup {
  setup_type: "elliott_wave" | "bb_bounce";
  wave_label?: string;
  direction: "long" | "short";
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  signal_strength: number;
  entry_time: number;
  details: Record<string, unknown>;
}

export function detectBBBounce(candles: Candle[]): DetectedSetup | null {
  if (candles.length < 25) return null;
  const closes = candles.map((c) => c.close);
  const bb = bollinger(closes);
  const r = rsi(closes);
  if (!bb || r === null) return null;
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];

  // Long bounce off lower band
  if (prev.low <= bb.lower && last.close > bb.lower && r < 40) {
    const entry = last.close;
    const sl = Math.min(prev.low, last.low) * 0.998;
    const tp = bb.middle;
    if (tp <= entry) return null;
    const dist = (bb.lower - prev.low) / bb.lower;
    const strength = Math.min(100, Math.round((dist * 1000) + (40 - r) * 1.5));
    return {
      setup_type: "bb_bounce", direction: "long",
      entry_price: entry, stop_loss: sl, take_profit: tp,
      signal_strength: Math.max(20, strength),
      entry_time: last.openTime,
      details: { rsi: r, bb_lower: bb.lower, bb_middle: bb.middle },
    };
  }
  // Short bounce off upper band
  if (prev.high >= bb.upper && last.close < bb.upper && r > 60) {
    const entry = last.close;
    const sl = Math.max(prev.high, last.high) * 1.002;
    const tp = bb.middle;
    if (tp >= entry) return null;
    const dist = (prev.high - bb.upper) / bb.upper;
    const strength = Math.min(100, Math.round((dist * 1000) + (r - 60) * 1.5));
    return {
      setup_type: "bb_bounce", direction: "short",
      entry_price: entry, stop_loss: sl, take_profit: tp,
      signal_strength: Math.max(20, strength),
      entry_time: last.openTime,
      details: { rsi: r, bb_upper: bb.upper, bb_middle: bb.middle },
    };
  }
  return null;
}
