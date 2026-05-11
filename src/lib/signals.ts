// Generate setups & alerts dynamically from live coin data.
import type { Coin } from "./demo-data";
import type { Setup, Alert } from "./demo-data";
import type { RegimeId } from "./market-regime";

function round(n: number, dp = 2) {
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}

function priceDp(p: number) {
  if (p >= 1000) return 0;
  if (p >= 10) return 2;
  if (p >= 1) return 3;
  if (p >= 0.1) return 4;
  return 5;
}

export type SetupTimeframe = "1H" | "4H" | "1D";

// Per-timeframe scaling: shorter TF = ciaśniejsze SL/TP, niższy R:R potencjał;
// dłuższy TF = większe ruchy, wyższe R:R.
const TF_SCALE: Record<SetupTimeframe, { slMul: number; tpBase: number; tpRange: number; longTf: SetupTimeframe; shortTf: SetupTimeframe }> = {
  "1H": { slMul: 0.55, tpBase: 0.035, tpRange: 0.06,  longTf: "1H", shortTf: "1H" },
  "4H": { slMul: 1.0,  tpBase: 0.08,  tpRange: 0.12,  longTf: "4H", shortTf: "1D" },
  "1D": { slMul: 1.6,  tpBase: 0.14,  tpRange: 0.18,  longTf: "1D", shortTf: "1D" },
};

export function generateSetups(coins: Coin[], timeframe: SetupTimeframe = "4H"): Setup[] {
  if (!coins.length) return [];
  const tf = TF_SCALE[timeframe];
  const sorted = [...coins].sort((a, b) => b.strength - a.strength);
  const top = sorted.slice(0, 3);
  const bottom = sorted.slice(-2).reverse();

  const setups: Setup[] = [];

  for (const c of top) {
    const dp = priceDp(c.price);
    const slPct = (c.rsi > 70 ? 0.045 : 0.05) * tf.slMul;
    const tpPct = tf.tpBase + (c.strength / 100) * tf.tpRange;
    const sl = round(c.price * (1 - slPct), dp);
    const tp = round(c.price * (1 + tpPct), dp);
    const rr = (tp - c.price) / (c.price - sl);
    const confidence = Math.min(95, Math.round(c.strength * 0.85 + (c.change24h > 0 ? 8 : 0) - (timeframe === "1H" ? 5 : 0)));
    const reason =
      c.change7d > 5
        ? `Silny trend 7D (+${c.change7d.toFixed(1)}%), momentum 24h ${c.change24h.toFixed(1)}%, RSI ${c.rsi}.`
        : `Najwyższa siła relatywna w koszyku, RSI ${c.rsi}, wolumen ${(c.volume24h / 1e9).toFixed(2)}B.`;
    setups.push({
      symbol: c.symbol,
      type: c.rsi > 75 ? "Obserwuj" : "Long",
      entry: round(c.price, dp),
      stopLoss: sl,
      takeProfit: tp,
      riskReward: round(rr, 1),
      confidence,
      reason: c.rsi > 75 ? `Wykupienie (RSI ${c.rsi}). ${reason} Czekaj na korektę do EMA20.` : reason,
      timeframe: tf.longTf,
    });
  }

  for (const c of bottom) {
    const dp = priceDp(c.price);
    const slPct = 0.05 * tf.slMul;
    const tpPct = (tf.tpBase + ((100 - c.strength) / 100) * (tf.tpRange * 0.7));
    const sl = round(c.price * (1 + slPct), dp);
    const tp = round(c.price * (1 - tpPct), dp);
    const rr = (c.price - tp) / (sl - c.price);
    const confidence = Math.min(85, Math.round((100 - c.strength) * 0.7 + (c.change24h < 0 ? 8 : 0) - (timeframe === "1H" ? 5 : 0)));
    const isWeakEnough = c.change7d < -2 || c.rsi < 40;
    setups.push({
      symbol: c.symbol,
      type: isWeakEnough ? "Short" : "Obserwuj",
      entry: round(c.price, dp),
      stopLoss: sl,
      takeProfit: tp,
      riskReward: round(rr, 1),
      confidence,
      reason: isWeakEnough
        ? `Najsłabsza relatywnie (${c.change7d.toFixed(1)}% 7D), RSI ${c.rsi}, brak popytu.`
        : `Słabość względna, ale brak potwierdzenia spadku — czekaj na pęknięcie wsparcia.`,
      timeframe: tf.shortTf,
    });
  }

  return setups;
}

export function generateAlerts(coins: Coin[]): Alert[] {
  const out: Alert[] = [];
  const now = new Date();
  const t = (offsetMin: number) => {
    const d = new Date(now.getTime() - offsetMin * 60_000);
    return d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
  };

  let id = 1;
  const push = (a: Omit<Alert, "id">) => out.push({ id: String(id++), ...a });

  for (const c of coins) {
    if (c.change24h >= 5) {
      push({
        time: t(out.length * 7 + 5),
        symbol: c.symbol,
        level: "critical",
        message: `Silny ruch +${c.change24h.toFixed(1)}% w 24h — potwierdzony impet, śledź wolumen.`,
      });
    } else if (c.change24h <= -5) {
      push({
        time: t(out.length * 7 + 5),
        symbol: c.symbol,
        level: "critical",
        message: `Spadek ${c.change24h.toFixed(1)}% w 24h — możliwa kontynuacja, uważaj na SL.`,
      });
    }

    if (c.rsi >= 70) {
      push({
        time: t(out.length * 7 + 8),
        symbol: c.symbol,
        level: "warning",
        message: `RSI ${c.rsi} — strefa wykupienia, ostrożnie z pogonią.`,
      });
    } else if (c.rsi <= 30) {
      push({
        time: t(out.length * 7 + 8),
        symbol: c.symbol,
        level: "warning",
        message: `RSI ${c.rsi} — wyprzedanie, możliwe odbicie techniczne.`,
      });
    }

    if (c.change7d >= 10) {
      push({
        time: t(out.length * 7 + 12),
        symbol: c.symbol,
        level: "info",
        message: `Trend 7D +${c.change7d.toFixed(1)}% — jeden z liderów rotacji kapitału.`,
      });
    } else if (c.change7d <= -8) {
      push({
        time: t(out.length * 7 + 12),
        symbol: c.symbol,
        level: "info",
        message: `Trend 7D ${c.change7d.toFixed(1)}% — odpływ kapitału, słabość relatywna.`,
      });
    }
  }

  // Sort by severity and recency
  const order = { critical: 0, warning: 1, info: 2 } as const;
  out.sort((a, b) => order[a.level] - order[b.level]);

  if (!out.length) {
    push({
      time: t(0),
      symbol: "MKT",
      level: "info",
      message: "Rynek spokojny — brak ekstremów RSI ani gwałtownych zmian wolumenu.",
    });
  }

  return out.slice(0, 12);
}

// ---- Regime-aware adjustments ----
// Filters/boosts setups & alerts based on the active Market Regime.

export type RegimeNote = { tag: string; tone: "bull" | "bear" | "warning" | "neutral" };

export function adjustSetupsForRegime(setups: Setup[], regime: RegimeId): { setups: Setup[]; note: RegimeNote } {
  switch (regime) {
    case "panic":
    case "risk-off": {
      // Drop Long, keep Short/Obserwuj, downgrade confidence on remaining
      const out = setups
        .filter((s) => s.type !== "Long")
        .map((s) => ({ ...s, confidence: Math.max(20, s.confidence - 10) }));
      return { setups: out, note: { tag: regime === "panic" ? "Panic — longi zablokowane" : "Risk-Off — tylko shorty/obserwacja", tone: "bear" } };
    }
    case "altseason": {
      // Boost non-BTC longs, downgrade BTC
      const out = setups.map((s) =>
        s.type === "Long"
          ? { ...s, confidence: Math.min(98, s.confidence + (s.symbol === "BTC" ? -8 : 8)) }
          : s,
      );
      return { setups: out, note: { tag: "Altseason — preferuj alty, BTC w tle", tone: "bull" } };
    }
    case "btc-dominance": {
      // Prefer BTC/ETH, demote small-cap longs to Obserwuj
      const majors = new Set(["BTC", "ETH"]);
      const out = setups.map((s) =>
        s.type === "Long" && !majors.has(s.symbol)
          ? { ...s, type: "Obserwuj" as const, confidence: Math.max(30, s.confidence - 15) }
          : s,
      );
      return { setups: out, note: { tag: "BTC Dominance — przeważ BTC/ETH", tone: "warning" } };
    }
    case "risk-on": {
      const out = setups.map((s) =>
        s.type === "Long" ? { ...s, confidence: Math.min(98, s.confidence + 6) } : s,
      );
      return { setups: out, note: { tag: "Risk-On — momentum wspiera longi", tone: "bull" } };
    }
    case "rotation": {
      const out = setups.filter((s) => s.type !== "Short");
      return { setups: out, note: { tag: "Rotation — selekcja, nie kierunek", tone: "warning" } };
    }
    case "stablecoin-inflow": {
      const out = setups.map((s) =>
        s.type === "Long" ? { ...s, type: "Obserwuj" as const } : s,
      );
      return { setups: out, note: { tag: "Stablecoin Inflow — czekaj na breakout", tone: "neutral" } };
    }
    default:
      return { setups, note: { tag: "Neutral — bez modyfikacji", tone: "neutral" } };
  }
}

export function adjustAlertsForRegime(alerts: Alert[], regime: RegimeId): Alert[] {
  // Prepend a synthetic regime alert at the top so the user sees the active context.
  const map: Record<RegimeId, { level: Alert["level"]; msg: string } | null> = {
    "panic": { level: "critical", msg: "PANIC MODE — wstrzymaj nowe longi, czekaj na stabilizację (≥3% odbicia z wolumenem)." },
    "risk-off": { level: "critical", msg: "RISK-OFF — szeroka słabość, ogranicz ekspozycję, podnieś gotówkę." },
    "altseason": { level: "info", msg: "ALTSEASON — kapitał płynie w alty, realizuj zyski etapami." },
    "btc-dominance": { level: "warning", msg: "BTC DOMINANCE — przeważ BTC/ETH, alty w defensywie." },
    "risk-on": { level: "info", msg: "RISK-ON — szeroki rynek rośnie, trzymaj longi z trailing-SL." },
    "rotation": { level: "warning", msg: "ROTATION — selekcja zamiast indeksu, krótszy timeframe." },
    "stablecoin-inflow": { level: "info", msg: "STABLECOIN INFLOW — kompresja, czekaj na breakout > 70% breadth." },
    "neutral": null,
  };
  const head = map[regime];
  if (!head) return alerts;
  const t = new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
  return [{ id: "regime-0", time: t, symbol: "MKT", level: head.level, message: head.msg }, ...alerts];
}
