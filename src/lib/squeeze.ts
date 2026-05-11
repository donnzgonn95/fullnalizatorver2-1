// Squeeze Radar scoring — heuristic model based on available coin metrics.
// We don't have funding/OI/L-S ratios in the demo dataset, so we proxy them
// from price change, RSI, volume and 7D trend. The shape of the scoring
// matches the framework discussed with the user (0–100, 6 components).

import type { Coin } from "./demo-data";

export type SqueezeMode = "long" | "short";

export type SqueezeComponent = {
  key: string;
  label: string;
  weight: number;     // max points
  score: number;      // achieved points
  detail: string;     // short explanation
};

export type SqueezeRow = {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  change7d: number;
  rsi: number;
  total: number;            // 0-100
  components: SqueezeComponent[];
  verdict: SqueezeVerdict;
};

export type SqueezeVerdict = {
  label: string;
  tone: "bull" | "bear" | "warning" | "neutral";
};

const clamp = (n: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));

// ---- SHORT SQUEEZE ----
// Bullish bias: looks for negative funding proxy (price up + RSI low/mid),
// rising OI proxy (volume vs cap), tight structure (7D positive but 24h flat),
// breakout potential.
function scoreShort(c: Coin): SqueezeComponent[] {
  // 1. Funding proxy (30 pts) — strong negative funding = price up but RSI not euphoric
  const fundingProxy = c.change24h > 0 && c.rsi < 65 ? c.change24h / 6 : c.change24h > 0 ? 0.4 : 0;
  const funding = Math.round(clamp(fundingProxy) * 30);

  // 2. OI proxy (20 pts) — relative volume strength + holding price
  const volRel = clamp(c.volume24h / Math.max(c.marketCap, 1) / 0.05);
  const oi = Math.round(volRel * (c.change24h >= 0 ? 1 : 0.4) * 20);

  // 3. L/S ratio proxy (10 pts) — strength low + price not falling = shorts trapped
  const lsScore = c.strength < 50 && c.change24h >= 0 ? 1 : c.strength < 65 && c.change24h > 1 ? 0.6 : 0.2;
  const ls = Math.round(lsScore * 10);

  // 4. Liquidation clusters (15 pts) — proximity to recent high (proxy via 7D positive)
  const liq = Math.round(clamp(c.change7d / 12) * 15);

  // 5. Structure / breakout (15 pts) — RSI 55-72 + 24h > 1.5%
  const structOk = c.rsi >= 55 && c.rsi <= 72 && c.change24h > 1.5;
  const struct = structOk ? 15 : c.change24h > 0 ? 7 : 0;

  // 6. Market regime fit (10 pts) — favored by risk-on; we use 7D > 0 as proxy
  const regime = c.change7d > 0 ? 10 : c.change7d > -3 ? 5 : 0;

  return [
    { key: "funding", label: "Funding (proxy)", weight: 30, score: funding, detail: `24h ${c.change24h.toFixed(2)}% · RSI ${c.rsi}` },
    { key: "oi",      label: "OI (proxy: vol/cap)", weight: 20, score: oi, detail: `vol/cap ${(c.volume24h / Math.max(c.marketCap, 1) * 100).toFixed(2)}%` },
    { key: "ls",      label: "L/S ratio (proxy)", weight: 10, score: ls, detail: `siła ${c.strength}` },
    { key: "liq",     label: "Klastry likwidacji", weight: 15, score: liq, detail: `7D ${c.change7d.toFixed(1)}%` },
    { key: "struct",  label: "Struktura / breakout", weight: 15, score: struct, detail: `RSI ${c.rsi}` },
    { key: "regime",  label: "Reżim rynku", weight: 10, score: regime, detail: c.change7d > 0 ? "risk-on" : "risk-off" },
  ];
}

// ---- LONG SQUEEZE ----
// Bearish bias: dodatni funding (RSI wysoki + 24h rośnie), słaba struktura,
// klastry pod ceną, RSI > 75, 7D euforia.
function scoreLong(c: Coin): SqueezeComponent[] {
  // 1. Funding (30 pts) — pozytywny: RSI > 70 i 24h > 0
  const fundingScore = c.rsi > 75 && c.change24h > 1 ? 1 : c.rsi > 70 ? 0.7 : c.rsi > 65 ? 0.3 : 0;
  const funding = Math.round(fundingScore * 30);

  // 2. OI proxy (20 pts) — wysoki volume + RSI > 65
  const volRel = clamp(c.volume24h / Math.max(c.marketCap, 1) / 0.05);
  const oi = Math.round(volRel * (c.rsi > 65 ? 1 : 0.4) * 20);

  // 3. L/S ratio (10 pts) — siła > 80 (longi przeciążone)
  const ls = c.strength > 85 ? 10 : c.strength > 75 ? 6 : c.strength > 65 ? 3 : 0;

  // 4. Klastry likwidacji pod ceną (15 pts) — 7D > 8% (dużo SL longów blisko)
  const liq = Math.round(clamp(c.change7d / 18) * 15);

  // 5. Struktura / breakdown (15 pts) — RSI > 75 + 24h zaczyna słabnąć
  const struct = c.rsi > 78 ? 15 : c.rsi > 72 && c.change24h < c.change7d / 7 ? 10 : c.rsi > 70 ? 5 : 0;

  // 6. Reżim (10 pts) — risk-off / btc-dom proxy: 7D ujemny lub flat
  const regime = c.change7d < 0 ? 10 : c.change7d < 3 ? 5 : 0;

  return [
    { key: "funding", label: "Funding (proxy)", weight: 30, score: funding, detail: `RSI ${c.rsi} · 24h ${c.change24h.toFixed(2)}%` },
    { key: "oi",      label: "OI (proxy: vol/cap)", weight: 20, score: oi, detail: `vol/cap ${(c.volume24h / Math.max(c.marketCap, 1) * 100).toFixed(2)}%` },
    { key: "ls",      label: "L/S ratio (proxy)", weight: 10, score: ls, detail: `siła ${c.strength}` },
    { key: "liq",     label: "Klastry pod ceną", weight: 15, score: liq, detail: `7D ${c.change7d.toFixed(1)}%` },
    { key: "struct",  label: "Struktura / breakdown", weight: 15, score: struct, detail: `RSI ${c.rsi}` },
    { key: "regime",  label: "Reżim rynku", weight: 10, score: regime, detail: c.change7d < 0 ? "risk-off" : "neutral" },
  ];
}

export function verdict(total: number, mode: SqueezeMode): SqueezeVerdict {
  if (total >= 70) return { label: mode === "long" ? "Wysokie ryzyko long squeeze" : "Wysoka szansa short squeeze", tone: mode === "long" ? "bear" : "bull" };
  if (total >= 50) return { label: "Setup w budowie — obserwuj", tone: "warning" };
  if (total >= 30) return { label: "Słaby sygnał — niska konwersja", tone: "neutral" };
  return { label: "Brak setupu", tone: "neutral" };
}

export function buildSqueezeRows(coins: Coin[], mode: SqueezeMode): SqueezeRow[] {
  return coins
    .map<SqueezeRow>((c) => {
      const components = mode === "short" ? scoreShort(c) : scoreLong(c);
      const total = Math.min(100, components.reduce((s, x) => s + x.score, 0));
      return {
        symbol: c.symbol,
        name: c.name,
        price: c.price,
        change24h: c.change24h,
        change7d: c.change7d,
        rsi: c.rsi,
        total,
        components,
        verdict: verdict(total, mode),
      };
    })
    .sort((a, b) => b.total - a.total);
}

// Color thresholds for the visual scale
export const SCALE_BANDS = [
  { from: 0,  to: 30,  color: "var(--muted-foreground)", label: "Brak" },
  { from: 30, to: 50,  color: "hsl(45 90% 55%)",          label: "Słaby" },
  { from: 50, to: 70,  color: "hsl(28 92% 55%)",          label: "Buduje się" },
  { from: 70, to: 100, color: "hsl(0 78% 55%)",           label: "Wysokie ryzyko" },
] as const;
