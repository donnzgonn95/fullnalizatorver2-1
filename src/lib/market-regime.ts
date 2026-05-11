// Market Regime Engine — wykrywa fazę rynku na podstawie danych z koszyka coinów.
// Zwraca etykietę reżimu, narrację i wskazówki taktyczne.
import type { Coin } from "./demo-data";

export type RegimeId =
  | "risk-on"
  | "risk-off"
  | "rotation"
  | "altseason"
  | "btc-dominance"
  | "stablecoin-inflow"
  | "panic"
  | "neutral";

export type RegimeTone = "bull" | "bear" | "neutral" | "warning";

export type Regime = {
  id: RegimeId;
  label: string;          // krótka etykieta: "Risk-On", "Altseason"
  pl: string;             // polskie tłumaczenie
  tone: RegimeTone;
  confidence: number;     // 0–100
  headline: string;       // jednozdaniowa narracja
  narrative: string;      // 2–3 zdania
  playbook: string[];     // 3–5 wskazówek
  signals: RegimeSignal[];// dowody/składowe
};

export type RegimeSignal = {
  label: string;
  value: string;
  weight: "strong" | "medium" | "weak";
  direction: "bull" | "bear" | "neutral";
};

export type RegimeMetrics = {
  breadth: number;        // % coinów z dodatnim 24h
  avg24h: number;
  avg7d: number;
  btcChange7d: number;
  altsAvg7d: number;      // bez BTC
  altsMinusBtc7d: number; // przewaga altów
  topGainer?: Coin;
  topLoser?: Coin;
  panicCount: number;     // # coinów < -5% 24h
  euphoriaCount: number;  // # coinów > +5% 24h
  highRsiCount: number;   // # RSI ≥ 70
  lowRsiCount: number;    // # RSI ≤ 30
  total: number;
};

export function computeMetrics(coins: Coin[]): RegimeMetrics {
  const total = coins.length || 1;
  const btc = coins.find((c) => c.symbol === "BTC");
  const alts = coins.filter((c) => c.symbol !== "BTC");
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / (arr.length || 1);
  const sorted = [...coins].sort((a, b) => b.change24h - a.change24h);
  const altsAvg7d = avg(alts.map((c) => c.change7d));
  const btcChange7d = btc?.change7d ?? 0;

  return {
    breadth: (coins.filter((c) => c.change24h > 0).length / total) * 100,
    avg24h: avg(coins.map((c) => c.change24h)),
    avg7d: avg(coins.map((c) => c.change7d)),
    btcChange7d,
    altsAvg7d,
    altsMinusBtc7d: altsAvg7d - btcChange7d,
    topGainer: sorted[0],
    topLoser: sorted[sorted.length - 1],
    panicCount: coins.filter((c) => c.change24h <= -5).length,
    euphoriaCount: coins.filter((c) => c.change24h >= 5).length,
    highRsiCount: coins.filter((c) => c.rsi >= 70).length,
    lowRsiCount: coins.filter((c) => c.rsi <= 30).length,
    total,
  };
}

export function detectRegime(coins: Coin[]): Regime {
  const m = computeMetrics(coins);

  // 1. PANIC — wyprzedaż, ekstremalna szerokość spadków
  if (m.avg24h <= -4 || m.panicCount >= Math.max(3, m.total * 0.4)) {
    return build("panic", m);
  }

  // 2. RISK-OFF — szeroka słabość, BTC trzyma lepiej niż alty
  if (m.breadth < 35 && m.avg24h < -1) {
    return build("risk-off", m);
  }

  // 3. ALTSEASON — alty mocno biją BTC w 7D
  if (m.altsMinusBtc7d >= 6 && m.altsAvg7d > 5 && m.breadth > 55) {
    return build("altseason", m);
  }

  // 4. BTC DOMINANCE EXPANSION — BTC mocniejszy niż alty w 7D
  if (m.btcChange7d - m.altsAvg7d >= 3 && m.btcChange7d > 1) {
    return build("btc-dominance", m);
  }

  // 5. RISK-ON — szeroki rynek, mocna euforia, breadth wysoka
  if (m.breadth >= 70 && m.avg24h >= 2 && m.euphoriaCount >= 2) {
    return build("risk-on", m);
  }

  // 6. ROTATION — mieszane: część mocno w górę, część w dół
  if (m.euphoriaCount >= 1 && m.panicCount >= 1) {
    return build("rotation", m);
  }

  // 7. STABLECOIN INFLOW — rynek płaski, niski avg, niski breadth (~50%)
  if (Math.abs(m.avg24h) < 1 && m.breadth >= 40 && m.breadth <= 60 && m.euphoriaCount === 0) {
    return build("stablecoin-inflow", m);
  }

  // 8. NEUTRAL fallback
  return build("neutral", m);
}

function build(id: RegimeId, m: RegimeMetrics): Regime {
  const fmt = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
  const top = m.topGainer ? `${m.topGainer.symbol} ${fmt(m.topGainer.change24h)}` : "—";
  const bot = m.topLoser ? `${m.topLoser.symbol} ${fmt(m.topLoser.change24h)}` : "—";
  const breadth = `${m.breadth.toFixed(0)}% / ${m.total}`;
  const sig = (
    label: string,
    value: string,
    weight: RegimeSignal["weight"],
    direction: RegimeSignal["direction"],
  ): RegimeSignal => ({ label, value, weight, direction });

  const baseSignals: RegimeSignal[] = [
    sig("Szerokość rynku", breadth, "strong", m.breadth >= 50 ? "bull" : "bear"),
    sig("Średnia 24h", fmt(m.avg24h), "strong", m.avg24h >= 0 ? "bull" : "bear"),
    sig("Średnia 7D", fmt(m.avg7d), "medium", m.avg7d >= 0 ? "bull" : "bear"),
    sig("Alty vs BTC (7D)", fmt(m.altsMinusBtc7d), "medium", m.altsMinusBtc7d >= 0 ? "bull" : "bear"),
    sig("Top: lider / outsider", `${top} · ${bot}`, "weak", "neutral"),
  ];

  const presets: Record<RegimeId, Omit<Regime, "id" | "signals">> = {
    "risk-on": {
      label: "Risk-On",
      pl: "Apetyt na ryzyko",
      tone: "bull",
      confidence: clamp(60 + m.breadth / 4 + m.euphoriaCount * 4),
      headline: `Szeroki rynek rośnie — kapitał wchodzi (${breadth} zielonych, lider ${top})`,
      narrative:
        "Inwestorzy włączają tryb ryzyka: kupowane są zarówno duże, jak i mniejsze aktywa. Momentum jest synchroniczne — to typowo zdrowa faza wzrostu.",
      playbook: [
        "Trzymaj długie pozycje, dokupuj na korektach do EMA20/50",
        "Patrz na liderów siły relatywnej — tam jest kapitał",
        "Podnoś stop-lossy za każdym higher-low (trailing)",
        "Uważaj na RSI > 75 na BTC/ETH — moment do realizacji części zysków",
      ],
    },
    "risk-off": {
      label: "Risk-Off",
      pl: "Ucieczka od ryzyka",
      tone: "bear",
      confidence: clamp(55 + (50 - m.breadth) / 2),
      headline: `Szeroka słabość (${breadth}) — kapitał ucieka z ryzykownych aktywów`,
      narrative:
        "Czerwień przeważa, alty sprzedają się szybciej niż BTC. Faza obronna — gotówka i stablecoiny zyskują na atrakcyjności.",
      playbook: [
        "Zmniejsz ekspozycję, podnieś poziom gotówki do 50–70%",
        "Nie łap spadających noży — czekaj na stabilizację wolumenu",
        "Rozważ shorty na największych słabeuszach (po pęknięciu wsparć)",
        "Ustaw alerty na powrót breadth > 60% jako sygnał odwrócenia",
      ],
    },
    rotation: {
      label: "Rotation",
      pl: "Rotacja kapitału",
      tone: "warning",
      confidence: clamp(55 + m.euphoriaCount * 3 + m.panicCount * 3),
      headline: `Kapitał rotuje: ${top} rośnie, ${bot} traci — selekcja, nie kierunek`,
      narrative:
        "Rynek nie ma jednoznacznego kierunku — pieniądze przesuwają się między sektorami. Wygrywa selekcja konkretnych aktywów, nie ekspozycja na cały rynek.",
      playbook: [
        "Skup się na liderach 7D, unikaj słabeuszy",
        "Mniejsze pozycje, krótszy timeframe (4H)",
        "Nie używaj indeksów (ETF, koszyki) — będą płaskie",
        "Obserwuj wolumeny — tam, gdzie rośnie, tam jest narracja",
      ],
    },
    altseason: {
      label: "Altseason",
      pl: "Sezon altcoinów",
      tone: "bull",
      confidence: clamp(60 + m.altsMinusBtc7d * 3),
      headline: `Alty biją BTC o ${fmt(m.altsMinusBtc7d)} (7D) — kapitał płynie w dół kapitalizacji`,
      narrative:
        "BTC stoi lub rośnie wolniej, podczas gdy alty (zwłaszcza średnia/mała kapitalizacja) wystrzeliwują. Klasyczna faza euforii — najwięcej do ugrania, ale i ryzyko nagłego odwrócenia rośnie.",
      playbook: [
        "Skup się na altach z najwyższą siłą relatywną i wolumenem",
        "Skracaj horyzont — alty potrafią oddać 30% w jedną sesję",
        "Realizuj zyski etapami (1/3 przy +20%, 1/3 przy +40%)",
        "Pierwszy mocny czerwony dzień BTC = sygnał do redukcji",
      ],
    },
    "btc-dominance": {
      label: "BTC Dominance Expansion",
      pl: "Ekspansja dominacji BTC",
      tone: "warning",
      confidence: clamp(55 + (m.btcChange7d - m.altsAvg7d) * 4),
      headline: `BTC ${fmt(m.btcChange7d)} (7D) wyraźnie mocniejszy niż alty (${fmt(m.altsAvg7d)})`,
      narrative:
        "Kapitał konsoliduje się w BTC — to typowo defensywna faza w krypto albo początek nowego cyklu. Alty będą podążać, ale z opóźnieniem; trzymanie ich teraz to underperformance.",
      playbook: [
        "Przeważ BTC w portfelu (60–70%)",
        "Redukuj ekspozycję na małą i średnią kapitalizację",
        "Czekaj aż BTC.D zatrzyma wzrost — wtedy kapitał wróci w alty",
        "ETH/BTC poniżej kluczowego wsparcia = potwierdzenie tezy",
      ],
    },
    "stablecoin-inflow": {
      label: "Stablecoin Inflow",
      pl: "Kapitał czeka w stablecoinach",
      tone: "neutral",
      confidence: 60,
      headline: `Rynek płaski (${fmt(m.avg24h)}) — kapitał gromadzi się, czeka na sygnał`,
      narrative:
        "Brak wyraźnego kierunku, niska zmienność, brak liderów ani outsiderów. Inwestorzy parkują kapitał w stablecoinach — następny silny ruch zaczyna się właśnie z takiej kompresji.",
      playbook: [
        "Nie wymuszaj wejść — czekaj na breakout z wolumenem",
        "Zbuduj listę obserwacyjną z gotowymi entry/SL",
        "Krótkie scalpy zamiast pozycji trendowych",
        "Pierwszy dzień z breadth > 70% = sygnał wejścia",
      ],
    },
    panic: {
      label: "Panic Mode",
      pl: "Panika",
      tone: "bear",
      confidence: clamp(70 + m.panicCount * 4),
      headline: `Wyprzedaż: ${m.panicCount}/${m.total} coinów < -5% w 24h, średnia ${fmt(m.avg24h)}`,
      narrative:
        "Skoordynowana wyprzedaż całego rynku — typowo capitulation lub event makro. Najgorszy moment na panikę, ale też najgorszy na łapanie dna bez potwierdzenia.",
      playbook: [
        "ZERO nowych longów do potwierdzenia stabilizacji",
        "Realizuj ewentualne pozostałe zyski / utnij straty",
        "Czekaj na dzień z odbiciem +3–5% i rosnącym wolumenem",
        "Stablecoiny / gotówka — bezpieczna przystań",
        "Najlepsze okazje pojawiają się 2–5 sesji PO panic-low",
      ],
    },
    neutral: {
      label: "Neutral",
      pl: "Neutralnie",
      tone: "neutral",
      confidence: 50,
      headline: `Rynek bez wyraźnej tezy — breadth ${breadth}, średnia ${fmt(m.avg24h)}`,
      narrative:
        "Brak silnego sygnału w jakimkolwiek kierunku. To dobry moment na pracę nad strategią, listą obserwacyjną i analizą — nie na agresywne wejścia.",
      playbook: [
        "Trzymaj normalną alokację, bez nadmiarowego ryzyka",
        "Czekaj na sygnał: breadth > 70% lub < 30%",
        "Małe pozycje testowe na liderach 7D",
        "Aktualizuj poziomy SL/TP na otwartych pozycjach",
      ],
    },
  };

  return { id, signals: baseSignals, ...presets[id] };
}

// Public helper: build a Regime by id reusing already computed signals/metrics from another regime.
// Used for manual override — keeps real signals visible while showing the chosen narrative.
export function buildPresetRegime(id: RegimeId, source: Regime): Regime {
  // We need metrics; cheapest is to re-derive from existing signals values is messy,
  // so we just re-run build() with synthetic metrics by reusing source numbers.
  // Trick: the presets only depend on metrics for headline/confidence values that are
  // already baked into source.signals; for override we keep source.signals and rewrite
  // the narrative parts via the same presets table by hand.
  const fakeMetrics = {
    breadth: 0, avg24h: 0, avg7d: 0, btcChange7d: 0, altsAvg7d: 0,
    altsMinusBtc7d: 0, panicCount: 0, euphoriaCount: 0, highRsiCount: 0,
    lowRsiCount: 0, total: 0,
  } as RegimeMetrics;
  const built = build(id, fakeMetrics);
  return { ...built, signals: source.signals, confidence: built.confidence };
}

// Thresholds & weights — exposed so the UI can explain why a regime was chosen.
export const REGIME_THRESHOLDS: Array<{
  id: RegimeId;
  label: string;
  rule: string;
  priority: number;
}> = [
  { id: "panic", label: "Panic", priority: 1, rule: "avg24h ≤ -4% LUB ≥40% koszyka < -5% w 24h" },
  { id: "risk-off", label: "Risk-Off", priority: 2, rule: "breadth < 35% ORAZ avg24h < -1%" },
  { id: "altseason", label: "Altseason", priority: 3, rule: "(alty − BTC) 7D ≥ +6% ORAZ alty 7D > +5% ORAZ breadth > 55%" },
  { id: "btc-dominance", label: "BTC Dominance", priority: 4, rule: "(BTC − alty) 7D ≥ +3% ORAZ BTC 7D > +1%" },
  { id: "risk-on", label: "Risk-On", priority: 5, rule: "breadth ≥ 70% ORAZ avg24h ≥ +2% ORAZ ≥2 coiny > +5% w 24h" },
  { id: "rotation", label: "Rotation", priority: 6, rule: "≥1 coin > +5% i ≥1 coin < -5% w 24h" },
  { id: "stablecoin-inflow", label: "Stablecoin Inflow", priority: 7, rule: "|avg24h| < 1%, breadth 40–60%, brak euforii" },
  { id: "neutral", label: "Neutral", priority: 8, rule: "Brak silnego sygnału (fallback)" },
];

// Per-metric weights used in the engine — surfaced in the UI for transparency.
export const METRIC_WEIGHTS: Array<{
  key: keyof RegimeMetrics;
  label: string;
  weight: "strong" | "medium" | "weak";
  bullThreshold: string;
  bearThreshold: string;
}> = [
  { key: "breadth", label: "Szerokość rynku (% zielonych)", weight: "strong", bullThreshold: "≥ 70%", bearThreshold: "< 35%" },
  { key: "avg24h", label: "Średnia zmiana 24h", weight: "strong", bullThreshold: "≥ +2%", bearThreshold: "≤ -4%" },
  { key: "avg7d", label: "Średnia zmiana 7D", weight: "medium", bullThreshold: "> 0%", bearThreshold: "< 0%" },
  { key: "altsMinusBtc7d", label: "Alty vs BTC (7D)", weight: "medium", bullThreshold: "≥ +6% (altseason)", bearThreshold: "≤ -3% (BTC dom.)" },
  { key: "euphoriaCount", label: "Coiny > +5% (24h)", weight: "weak", bullThreshold: "≥ 2", bearThreshold: "0" },
  { key: "panicCount", label: "Coiny < -5% (24h)", weight: "weak", bullThreshold: "0", bearThreshold: "≥ 40% koszyka" },
  { key: "highRsiCount", label: "RSI ≥ 70 (wykupienie)", weight: "weak", bullThreshold: "—", bearThreshold: "≥ 3 → uważaj" },
  { key: "lowRsiCount", label: "RSI ≤ 30 (wyprzedanie)", weight: "weak", bullThreshold: "≥ 3 → odbicie", bearThreshold: "—" },
];

export const ALL_REGIME_IDS: RegimeId[] = [
  "risk-on", "risk-off", "rotation", "altseason",
  "btc-dominance", "stablecoin-inflow", "panic", "neutral",
];

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}
