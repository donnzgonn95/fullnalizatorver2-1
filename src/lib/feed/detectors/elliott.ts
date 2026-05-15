import type { Candle } from "../types";
import type { DetectedSetup } from "./bb-bounce";

export const ELLIOTT_PARAMS = {
  zigzagThresholdPct: 1.5,
  tailPivots: 5,
  minCandles: 60,
  tpFib: 0.618,
  slBufferPct: 0.3,
  w3MinRatio: 0.8,
  baseStrength: 60,
} as const;

interface Pivot { i: number; price: number; type: "H" | "L"; time: number }

function zigzag(candles: Candle[], threshold = 0.015): Pivot[] {
  if (candles.length < 5) return [];
  const piv: Pivot[] = [];
  let lastType: "H" | "L" = candles[1].high > candles[0].high ? "H" : "L";
  let lastIdx = 0;
  let lastPrice = lastType === "H" ? candles[0].high : candles[0].low;
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    if (lastType === "H") {
      if (c.high > lastPrice) { lastPrice = c.high; lastIdx = i; }
      else if ((lastPrice - c.low) / lastPrice >= threshold) {
        piv.push({ i: lastIdx, price: lastPrice, type: "H", time: candles[lastIdx].openTime });
        lastType = "L"; lastPrice = c.low; lastIdx = i;
      }
    } else {
      if (c.low < lastPrice) { lastPrice = c.low; lastIdx = i; }
      else if ((c.high - lastPrice) / lastPrice >= threshold) {
        piv.push({ i: lastIdx, price: lastPrice, type: "L", time: candles[lastIdx].openTime });
        lastType = "H"; lastPrice = c.high; lastIdx = i;
      }
    }
  }
  piv.push({ i: lastIdx, price: lastPrice, type: lastType, time: candles[lastIdx].openTime });
  return piv;
}

export function detectElliott(candles: Candle[]): DetectedSetup | null {
  if (candles.length < 60) return null;
  const piv = zigzag(candles);
  if (piv.length < 5) return null;
  const tail = piv.slice(-5);
  const types = tail.map((p) => p.type).join("");
  const last = candles[candles.length - 1];

  if (types === "LHLHL") {
    const w1 = tail[1].price - tail[0].price;
    const w3 = tail[3].price - tail[2].price;
    if (w3 > 0 && w1 > 0 && w3 >= w1 * 0.8 && tail[4].price > tail[1].price) {
      const entry = last.close;
      const sl = tail[4].price * 0.997;
      const tp = entry + w3 * 0.618;
      if (tp <= entry) return null;
      return {
        setup_type: "elliott_wave", wave_label: "wave_5",
        direction: "long",
        entry_price: entry, stop_loss: sl, take_profit: tp,
        signal_strength: 60,
        entry_time: last.openTime,
        details: { pivots: tail, w1, w3 },
      };
    }
  }
  if (types === "HLHLH") {
    const w1 = tail[0].price - tail[1].price;
    const w3 = tail[2].price - tail[3].price;
    if (w3 > 0 && w1 > 0 && w3 >= w1 * 0.8 && tail[4].price < tail[1].price) {
      const entry = last.close;
      const sl = tail[4].price * 1.003;
      const tp = entry - w3 * 0.618;
      if (tp >= entry) return null;
      return {
        setup_type: "elliott_wave", wave_label: "wave_5",
        direction: "short",
        entry_price: entry, stop_loss: sl, take_profit: tp,
        signal_strength: 60,
        entry_time: last.openTime,
        details: { pivots: tail, w1, w3 },
      };
    }
  }
  return null;
}
