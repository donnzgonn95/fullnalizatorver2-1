import type { Candle } from "./types";

export interface BBValue { upper: number; middle: number; lower: number }
export interface MACDValue { macd: number; signal: number; histogram: number }

export function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  let s = 0;
  for (let i = values.length - period; i < values.length; i++) s += values[i];
  return s / period;
}

export function stddev(values: number[], period: number, mean: number): number {
  let s = 0;
  for (let i = values.length - period; i < values.length; i++) {
    const d = values[i] - mean;
    s += d * d;
  }
  return Math.sqrt(s / period);
}

export function bollinger(closes: number[], period = 20, mult = 2): BBValue | null {
  const m = sma(closes, period);
  if (m === null) return null;
  const sd = stddev(closes, period, m);
  return { upper: m + mult * sd, middle: m, lower: m - mult * sd };
}

export function rsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gains += d; else losses -= d;
  }
  const ag = gains / period, al = losses / period;
  if (al === 0) return 100;
  const rs = ag / al;
  return 100 - 100 / (1 + rs);
}

export function ema(values: number[], period: number): number[] {
  const out: number[] = [];
  if (values.length < period) return out;
  const k = 2 / (period + 1);
  let prev = sma(values.slice(0, period), period)!;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

export function macd(closes: number[]): MACDValue | null {
  if (closes.length < 35) return null;
  const e12 = ema(closes, 12);
  const e26 = ema(closes, 26);
  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (e12[i] !== undefined && e26[i] !== undefined) macdLine[i] = e12[i] - e26[i];
  }
  const dense = macdLine.filter((v) => v !== undefined);
  const sig = ema(dense, 9);
  const lastSig = sig[sig.length - 1];
  const lastMacd = macdLine[macdLine.length - 1];
  if (lastSig === undefined || lastMacd === undefined) return null;
  return { macd: lastMacd, signal: lastSig, histogram: lastMacd - lastSig };
}

export function liveIndicators(candles: Candle[]) {
  const closes = candles.map((c) => c.close);
  return { bb: bollinger(closes), rsi: rsi(closes), macd: macd(closes) };
}
