import type { BajtlikState, DecisionLog, AgentNote } from "./types";

export const bajtlikInitial: BajtlikState = {
  startingCapital: 10000,
  currentCapital: 12420,
  realizedPnl: 1840,
  realizedLosses: 420,
  currency: "USD",
  goals: [
    { id: "g1", title: "Pierwsze 25 000 USD", targetAmount: 25000, currency: "USD", deadline: "2026-12-31", note: "Cel średnioterminowy." },
    { id: "g2", title: "Roczna stopa zwrotu 12%", targetAmount: 12, currency: "USD", note: "Mierzymy YoY." },
  ],
  positions: [
    { id: "p1", symbol: "VOO", qty: 12, avgPrice: 472, currentPrice: 528, currency: "USD", openedAt: "2025-01-15", thesis: "Szeroki rynek USA, długi horyzont." },
    { id: "p2", symbol: "QQQ", qty: 6, avgPrice: 460, currentPrice: 510, currency: "USD", openedAt: "2025-02-04", thesis: "Tech rally, AI capex." },
    { id: "p3", symbol: "GLD", qty: 10, avgPrice: 215, currentPrice: 248, currency: "USD", openedAt: "2024-11-20", thesis: "Hedge na inflację i ryzyko geopolityczne." },
  ],
};

export const decisionLogsInitial: DecisionLog[] = [
  {
    id: "d1",
    createdAt: "2025-05-08T09:30:00Z",
    symbol: "QQQ",
    verdict: "akumuluj",
    rationale: "RSI cofnął się do 45 po 8% korekcie, breadth poprawia się.",
    outcome: "approved",
    agentNote: "Wejście częściowe, 1/3 pozycji.",
    userNote: "Dokupiłem 2 sztuki.",
  },
  {
    id: "d2",
    createdAt: "2025-05-10T16:00:00Z",
    symbol: "TLT",
    verdict: "obserwuj",
    rationale: "Yield 10Y wybił 4.30% — czekamy na stabilizację.",
    outcome: "approved",
  },
];

export const agentNotesInitial: AgentNote[] = [
  {
    id: "n1",
    createdAt: "2025-05-12T10:00:00Z",
    topic: "Sezon wyników Q1 2025",
    content: "85% spółek S&P pobiło konsens EPS. Margines forward stabilny. Reakcja kursów selektywna — nagradzane są guidance.",
    tags: ["earnings", "USA"],
  },
  {
    id: "n2",
    createdAt: "2025-05-13T08:00:00Z",
    topic: "Makro USA",
    content: "CPI w trendzie spadkowym, Fed pozostawia drzwi do obniżek otwarte. Risk-on dla equity.",
    tags: ["macro", "Fed"],
  },
];
