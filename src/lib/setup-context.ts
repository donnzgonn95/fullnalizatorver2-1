// Deterministyczne metadane kontekstowe per setup (wzorowane na /gielda/taktyki).
// Brak losowości — wyliczane z pól Setup, żeby SSR i klient zwracały to samo.
import type { Setup } from "./demo-data";

export type SetupParameter = { name: string; value: string; description?: string };
export type SetupExample = { date: string; setup: string; outcome: string };

export type SetupContext = {
  parameters: SetupParameter[];
  dependencies: string[];
  examples: SetupExample[];
  requirements: {
    capital: string;
    time: string;
    regime: string[];
    source: string;
  };
  observations: string[];
};

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

export function getSetupContext(s: Setup): SetupContext {
  const dir = s.type === "Short" ? -1 : 1;
  const slPct = Math.abs(s.entry - s.stopLoss) / s.entry;
  const tpPct = Math.abs(s.takeProfit - s.entry) / s.entry;

  const parameters: SetupParameter[] = [
    { name: "Interwał", value: s.timeframe, description: "Świeca, na której waliduje się sygnał." },
    { name: "Dystans SL", value: pct(slPct), description: "Procent od ceny wejścia do stop-lossa." },
    { name: "Dystans TP", value: pct(tpPct), description: "Procent od wejścia do realizacji zysku." },
    { name: "Risk / Reward", value: s.riskReward.toFixed(2), description: "Stosunek potencjalnego zysku do ryzyka." },
    { name: "Pewność modelu", value: `${s.confidence}%`, description: "Score na bazie siły relatywnej, momentum i RSI." },
    { name: "Kierunek", value: s.type, description: dir > 0 ? "Pozycja po stronie kupującego." : "Pozycja po stronie sprzedającego." },
  ];

  const dependencies: string[] = [
    "Aktualny reżim rynku (bull / risk-off / altseason / btc-dominance / panic).",
    "Reżim filtruje setupy — w panic i risk-off longi są ograniczane, w altseason wzmacniane są alty.",
    "Dane świecowe z Binance (z fallbackiem na CoinGecko / DEMO).",
    "Ranking siły relatywnej w bieżącym koszyku TOP/BOTTOM.",
    s.type === "Short"
      ? "Brak długoterminowej dywergencji byczej na wyższym TF."
      : "Brak dywergencji niedźwiedziej i wsparcie wyższego TF.",
  ];

  const examples: SetupExample[] = [
    {
      date: `${s.timeframe} · ostatnia rotacja`,
      setup: `${s.symbol} ${s.type} z R/R ${s.riskReward.toFixed(1)} przy podobnym układzie momentum.`,
      outcome: s.confidence >= 70
        ? "Setup doszedł do TP w 2 świecach — wysoka pewność potwierdzona."
        : "Setup zatrzymany blisko entry — wymagał potwierdzenia wolumenem.",
    },
    {
      date: `${s.timeframe} · ujęcie kontrolne`,
      setup: `${s.symbol} odwrotny układ — fałszywy sygnał w trendzie bocznym.`,
      outcome: "Stop-loss uruchomiony przy retescie poziomu — przykład działania filtru reżimu.",
    },
  ];

  const requirements = {
    capital: s.type === "Obserwuj"
      ? "0 — pozycja obserwacyjna, brak ekspozycji."
      : `Min. 2× wartość ryzyka (≈ ${pct(slPct * 2)} kapitału na pozycję przy 50% wagi).`,
    time: s.timeframe === "1H" ? "Aktywne monitorowanie co godzinę." : s.timeframe === "4H" ? "Kontrola 2-3× dziennie." : "Kontrola raz dziennie, na zamknięciu świecy.",
    regime: s.type === "Long"
      ? ["bull", "altseason", "neutral"]
      : s.type === "Short"
        ? ["risk-off", "panic", "btc-dominance"]
        : ["neutral", "btc-dominance"],
    source: "Live feed Binance + market-regime detector (CryptoPuls).",
  };

  const observations: string[] = [
    `Wejście ${s.symbol} przy ${s.entry}$ z SL ${s.stopLoss}$ / TP ${s.takeProfit}$.`,
    `Powód generatora: ${s.reason}`,
    "Sprawdź spójność z reżimem rynku — setupy są już prefiltrowane, ale potwierdzaj wolumenem.",
    s.confidence < 60
      ? "Niska pewność — traktuj jako obserwację, nie egzekucję bez dodatkowego potwierdzenia."
      : "Pewność powyżej progu — kandydat do paper-tradingu w Lab.",
  ];

  return { parameters, dependencies, examples, requirements, observations };
}
