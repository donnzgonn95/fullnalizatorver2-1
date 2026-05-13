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

export interface EtfScore {
  momentum: number;   // 0-100 — siła trendu (1M/3M)
  trend: number;      // 0-100 — pozycja względem MA
  cost: number;       // 0-100 — niski koszt = wysoki score
  liquidity: number;  // 0-100 — AUM, spread
  risk: number;       // 0-100 — odwrotnie: wysokie ryzyko = niski
  total: number;      // ważona suma
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
  change1m?: number;
  change3m?: number;
  description: string;
  category?: string;          // np. „Szeroki rynek USA", „Sektor: Technology"
  sectorExposure?: string[];  // sektory dominujące
  topHoldings?: string[];     // 3-5 największych pozycji
  dividend?: number;          // % yield
  rating?: "Buy" | "Hold" | "Reduce" | "Avoid";
  score?: EtfScore;
}

export interface SectorScore {
  momentum: number;        // 0-100
  trendStrength: number;   // 0-100
  breadth: number;         // 0-100 — % spółek nad MA50
  valuation: number;       // 0-100 — niski P/E = wysoki
  flows: number;           // 0-100 — napływy do sektora
  risk: number;            // 0-100 — odwrotnie do zmienności
  total: number;           // 0-100
}

export interface Sector {
  symbol: string; // np. XLK
  name: string;
  weight: number; // % S&P
  change1d: number;
  change1m: number;
  changeYtd: number;
  trend: "bull" | "bear" | "neutral";
  description?: string;
  topHoldings?: string[];
  pe?: number;
  breadth?: number;       // % spółek nad MA50
  relativeStrength?: number; // vs S&P, -100..+100
  score?: SectorScore;
  rating?: "Overweight" | "Neutral" | "Underweight";
  catalysts?: string[];
  risks?: string[];
}

export interface MacroIndicator {
  id: string;
  name: string;
  nameEn?: string;
  region: Region;
  value: number;
  unit: string;
  change: number; // delta vs poprzedni
  asOf: string; // ISO date
  interpretation: "positive" | "negative" | "neutral";
  note?: string;
  category?: "Inflacja" | "Stopy" | "Rynek pracy" | "Aktywność" | "Sentyment" | "Waluty" | "Surowce" | "Obligacje";
  description?: string;        // co to jest
  whyItMatters?: string;       // dlaczego to ważne dla rynku
  impact?: string;             // wpływ na akcje/obligacje
  trend?: "rising" | "falling" | "stable";
  target?: number;             // cel (np. 2% dla CPI)
  source?: string;
}

export interface TacticParameter {
  name: string;
  value: string;
  description?: string;
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
  longDescription?: string;
  instruments?: string[];            // np. SPY, QQQ
  parameters?: TacticParameter[];
  dependencies?: string[];           // od czego zależy skuteczność
  examples?: { date: string; setup: string; outcome: string }[];
  marketRegime?: string[];           // np. „bull-low-vol", „risk-on"
  capitalRequirement?: string;
  timeCommitment?: string;
  pros?: string[];
  cons?: string[];
  related?: string[];                // ID powiązanych taktyk
  source?: string;
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
