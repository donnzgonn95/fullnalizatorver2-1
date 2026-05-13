/**
 * Adapter persystencji modułu „Globalny Portal Giełdowy".
 * Na tym etapie wszystko leci do localStorage.
 * Klucze i kształt rekordów dopasowane do przyszłych tabel Supabase:
 *   stock_watchlist, investment_tactics, portfolio_journal,
 *   decision_logs, bajtlik_goals, agent_notes
 */

import type {
  AgentNote,
  BajtlikGoal,
  BajtlikState,
  DecisionLog,
  PortfolioPosition,
  Tactic,
} from "./types";

const KEYS = {
  watchlist: "gielda.stock_watchlist",
  tactics: "gielda.investment_tactics",
  portfolio: "gielda.portfolio_journal",
  decisions: "gielda.decision_logs",
  goals: "gielda.bajtlik_goals",
  agentNotes: "gielda.agent_notes",
  bajtlik: "gielda.bajtlik_state",
} as const;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota */
  }
}

export const gieldaStorage = {
  // Watchlist
  getWatchlist: (): string[] => read<string[]>(KEYS.watchlist, []),
  setWatchlist: (v: string[]) => write(KEYS.watchlist, v),

  // Bajtlik (cały stan)
  getBajtlik: <T extends BajtlikState>(fallback: T): T => read<T>(KEYS.bajtlik, fallback),
  setBajtlik: (v: BajtlikState) => write(KEYS.bajtlik, v),

  // Goals
  getGoals: (): BajtlikGoal[] => read<BajtlikGoal[]>(KEYS.goals, []),
  setGoals: (v: BajtlikGoal[]) => write(KEYS.goals, v),

  // Portfolio positions
  getPositions: (): PortfolioPosition[] => read<PortfolioPosition[]>(KEYS.portfolio, []),
  setPositions: (v: PortfolioPosition[]) => write(KEYS.portfolio, v),

  // Decision log
  getDecisions: (): DecisionLog[] => read<DecisionLog[]>(KEYS.decisions, []),
  setDecisions: (v: DecisionLog[]) => write(KEYS.decisions, v),
  appendDecision: (d: DecisionLog) => {
    const list = gieldaStorage.getDecisions();
    list.unshift(d);
    write(KEYS.decisions, list.slice(0, 200));
  },

  // Tactics (na przyszłość — user-defined warianty)
  getTactics: (): Tactic[] => read<Tactic[]>(KEYS.tactics, []),
  setTactics: (v: Tactic[]) => write(KEYS.tactics, v),

  // Agent notes
  getAgentNotes: (): AgentNote[] => read<AgentNote[]>(KEYS.agentNotes, []),
  setAgentNotes: (v: AgentNote[]) => write(KEYS.agentNotes, v),
  appendAgentNote: (n: AgentNote) => {
    const list = gieldaStorage.getAgentNotes();
    list.unshift(n);
    write(KEYS.agentNotes, list.slice(0, 200));
  },
};
