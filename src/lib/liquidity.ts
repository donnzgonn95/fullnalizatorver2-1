// Liquidity engine — synthetic but data-driven derivations from live coin data.
// All "depth" values are heuristic estimates: real exchange order books / liquidation
// data require futures API + auth. Goal: actionable visual structure, not perfect numbers.
import type { Coin } from "./demo-data";

export type HeatCell = {
  price: number;
  side: "long" | "short";
  notional: number; // estimated USD liquidations clustered at this level
  leverage: number; // dominant leverage bucket (5/10/25/50/100)
  intensity: number; // 0..1 normalized for color
};

export type VolumeCluster = {
  price: number;
  volume: number; // USD traded around the level
  poc: boolean; // point of control
  share: number; // 0..1
};

export type SweepEvent = {
  id: string;
  side: "long" | "short";
  price: number;
  size: number; // USD swept
  age: string; // "2 min", "14 min"
  reclaimed: boolean;
};

export type SpoofZone = {
  side: "bid" | "ask";
  price: number;
  size: number;
  pulledPct: number; // how much disappeared in 30s window
  confidence: number; // 0..100
};

export type BookImbalance = {
  bidsUsd: number;
  asksUsd: number;
  ratio: number; // bids / (bids+asks)
  skew: "bid-heavy" | "ask-heavy" | "balanced";
  topWalls: { side: "bid" | "ask"; price: number; size: number }[];
};

function seedFrom(symbol: string): () => number {
  // Deterministic PRNG so a coin's panel doesn't flicker between renders.
  let h = 2166136261;
  for (let i = 0; i < symbol.length; i++) h = (h ^ symbol.charCodeAt(i)) * 16777619;
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LEV_BUCKETS = [5, 10, 25, 50, 100];

export function buildHeatmap(coin: Coin, levels = 24): HeatCell[] {
  const rnd = seedFrom(coin.symbol + "heat");
  const cells: HeatCell[] = [];
  // Build levels +/- ~6% around price; long liqs below, short liqs above.
  const range = coin.price * 0.06;
  const step = (range * 2) / levels;
  for (let i = 0; i < levels; i++) {
    const offset = -range + i * step;
    const price = coin.price + offset;
    const side: "long" | "short" = offset < 0 ? "long" : "short";
    // Magnetism: bigger clusters near round numbers + at high-leverage liq levels.
    const distPct = Math.abs(offset) / coin.price;
    const levBucket = LEV_BUCKETS[Math.floor(rnd() * LEV_BUCKETS.length)];
    const baseNotional = coin.volume24h * 0.0008 * (1 + rnd() * 2);
    const proximity = Math.exp(-distPct * 28); // closer = denser
    const leverageBoost = levBucket / 50;
    const notional = baseNotional * proximity * leverageBoost;
    cells.push({
      price,
      side,
      notional,
      leverage: levBucket,
      intensity: 0,
    });
  }
  const max = Math.max(...cells.map((c) => c.notional));
  cells.forEach((c) => (c.intensity = max > 0 ? c.notional / max : 0));
  return cells;
}

export function buildVolumeClusters(coin: Coin, count = 12): VolumeCluster[] {
  const rnd = seedFrom(coin.symbol + "vol");
  const range = coin.price * 0.05;
  const out: VolumeCluster[] = [];
  let total = 0;
  for (let i = 0; i < count; i++) {
    const price = coin.price - range + (i / (count - 1)) * range * 2;
    // Bell-shape concentration with noise.
    const t = (i - count / 2) / (count / 2);
    const bell = Math.exp(-t * t * 2.2);
    const vol = coin.volume24h * (0.02 + bell * 0.18) * (0.6 + rnd() * 0.8);
    out.push({ price, volume: vol, poc: false, share: 0 });
    total += vol;
  }
  out.forEach((c) => (c.share = c.volume / total));
  const pocIdx = out.reduce((best, c, i, a) => (c.volume > a[best].volume ? i : best), 0);
  out[pocIdx].poc = true;
  return out;
}

export function detectSweeps(coin: Coin): SweepEvent[] {
  const rnd = seedFrom(coin.symbol + "sweep");
  const events: SweepEvent[] = [];
  // Synthetic event count scales with 24h move.
  const n = 2 + Math.min(4, Math.floor(Math.abs(coin.change24h)));
  for (let i = 0; i < n; i++) {
    const side: "long" | "short" = rnd() > 0.5 ? "long" : "short";
    const offset = (rnd() - 0.5) * coin.price * 0.04;
    const price = coin.price + offset;
    const size = coin.volume24h * (0.001 + rnd() * 0.004);
    const minutes = Math.floor(rnd() * 60) + 1;
    events.push({
      id: `${coin.symbol}-sw-${i}`,
      side,
      price,
      size,
      age: `${minutes} min temu`,
      reclaimed: rnd() > 0.45,
    });
  }
  return events.sort((a, b) => b.size - a.size);
}

export function detectSpoofZones(coin: Coin): SpoofZone[] {
  const rnd = seedFrom(coin.symbol + "spoof");
  const zones: SpoofZone[] = [];
  const n = 2 + Math.floor(rnd() * 3);
  for (let i = 0; i < n; i++) {
    const side: "bid" | "ask" = rnd() > 0.5 ? "bid" : "ask";
    const offset = (side === "bid" ? -1 : 1) * coin.price * (0.005 + rnd() * 0.025);
    zones.push({
      side,
      price: coin.price + offset,
      size: coin.volume24h * (0.003 + rnd() * 0.012),
      pulledPct: 50 + rnd() * 45,
      confidence: 55 + rnd() * 40,
    });
  }
  return zones.sort((a, b) => b.confidence - a.confidence);
}

export function computeBookImbalance(coin: Coin): BookImbalance {
  const rnd = seedFrom(coin.symbol + "book");
  // Bias by 24h move: green day → bid-heavy more often.
  const bias = Math.tanh(coin.change24h / 4) * 0.15;
  const baseRatio = 0.5 + bias + (rnd() - 0.5) * 0.1;
  const ratio = Math.min(0.85, Math.max(0.15, baseRatio));
  const totalDepth = coin.volume24h * 0.04;
  const bidsUsd = totalDepth * ratio;
  const asksUsd = totalDepth * (1 - ratio);
  const skew: BookImbalance["skew"] =
    ratio > 0.58 ? "bid-heavy" : ratio < 0.42 ? "ask-heavy" : "balanced";
  const walls: BookImbalance["topWalls"] = [];
  for (let i = 0; i < 4; i++) {
    const side: "bid" | "ask" = i < 2 ? "bid" : "ask";
    const offset = (side === "bid" ? -1 : 1) * coin.price * (0.004 + rnd() * 0.02);
    walls.push({
      side,
      price: coin.price + offset,
      size: totalDepth * (0.05 + rnd() * 0.18),
    });
  }
  walls.sort((a, b) => b.size - a.size);
  return { bidsUsd, asksUsd, ratio, skew, topWalls: walls };
}
