// Typy dla modułu „Globalny Portal Giełdowy"
// Nazwy pól dopasowane 1:1 do przyszłych tabel Supabase.

export type Region = "USA" | "Europa" | "Polska" | "Global";
export type Horizon = "krótki" | "średni" | "długi";
export type DecisionVerdict =
  | "czekaj"
  | "obserwuj"
  | "akumuluj"
  | "redukuj"
  | "zabezpieczaj";

export interface StockSymbol {
  symbol: string;
  name: string;
  region: Region;
  exchange: string;
  price: number;
  change1d: number; // %
  change1m: number; // %
  changeYtd: number; // %
  marketCap?: number; // USD bn
  pe?: number;
  sector?: string;
}

export interface MarketIndex {
  symbol: string;
  name: string;
  region: Region;
  value: number;
  change1d: number;
  change1m: number;
  changeYtd: number;
}

export interface Etf {
  symbol: string;
  name: string;
  type: "Equity" | "Sector" | "Bond" | "Commodity" | "Region" | "Thematic";
  region: Region;
  expense: number; // %
  aumBn: number;
  ytd: number;
  change1d: number;
  description: string;
}

export interface Sector {
  symbol: string; // np. XLK
  name: string;
  weight: number; // % S&P
  change1d: number;
  change1m: number;
  changeYtd: number;
  trend: "bull" | "bear" | "neutral";
}

export interface MacroIndicator {
  id: string;
  name: string;
  region: Region;
  value: number;
  unit: string;
  change: number; // delta vs poprzedni
  asOf: string; // ISO date
  interpretation: "positive" | "negative" | "neutral";
  note?: string;
}

export interface Tactic {
  id: string;
  name: string;
  description: string;
  entryRules: string[];
  exitRules: string[];
  worksWhen: string;
  failsWhen: string;
  risk: "niskie" | "średnie" | "wysokie";
  backtest: { winRate: number; avgRR: number; trades: number };
  observations: string[];
  horizon: Horizon;
}

export interface DecisionContext {
  vix: number;
  spxTrend: "bull" | "bear" | "neutral";
  rates10yUs: number;
  ratesDirection: "up" | "down" | "flat";
  cpiYoy: number;
  breadth: number; // % spółek nad MA50
}

export interface DecisionVerdictResult {
  verdict: DecisionVerdict;
  conviction: number; // 0–100
  risk: number; // 0–100
  horizon: Horizon;
  rationale: string;
  supports: string[];
  warnings: string[];
}

export interface BajtlikGoal {
  id: string;
  title: string;
  targetAmount: number;
  currency: "USD" | "EUR" | "PLN";
  deadline?: string;
  note?: string;
}

export interface PortfolioPosition {
  id: string;
  symbol: string;
  qty: number;
  avgPrice: number;
  currentPrice: number;
  currency: "USD" | "EUR" | "PLN";
  openedAt: string;
  thesis?: string;
}

export interface BajtlikState {
  startingCapital: number;
  currentCapital: number;
  realizedPnl: number;
  realizedLosses: number;
  currency: "USD" | "EUR" | "PLN";
  goals: BajtlikGoal[];
  positions: PortfolioPosition[];
}

export interface DecisionLog {
  id: string;
  createdAt: string;
  symbol?: string;
  verdict: DecisionVerdict;
  rationale: string;
  outcome?: "approved" | "rejected" | "pending";
  agentNote?: string;
  userNote?: string;
}

export interface AgentNote {
  id: string;
  createdAt: string;
  topic: string;
  content: string;
  tags: string[];
}
