// SMA crossover strategy — generates trades on a generated 3M history.
import { generateHistory, type OhlcBar } from "./mock-historical";

export interface SimTrade {
  instrument: string;
  trade_date: string;
  side: "long" | "short";
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  exit_price: number;
  risk_reward: number;
  conviction_score: number;
  risk_score: number;
  rationale: string;
  result_pnl: number;
}

function sma(bars: OhlcBar[], i: number, n: number) {
  if (i + 1 < n) return null;
  let s = 0;
  for (let k = i + 1 - n; k <= i; k++) s += bars[k].close;
  return s / n;
}

export function smaCrossoverBacktest(symbol: string): { trades: SimTrade[]; summary: any } {
  const bars = generateHistory(symbol, 90, 150 + (symbol.charCodeAt(0) % 30));
  const trades: SimTrade[] = [];
  let inPos: { entry: number; idx: number; sl: number; tp: number } | null = null;

  for (let i = 1; i < bars.length; i++) {
    const fast = sma(bars, i, 5);
    const slow = sma(bars, i, 20);
    const fastPrev = sma(bars, i - 1, 5);
    const slowPrev = sma(bars, i - 1, 20);
    if (fast == null || slow == null || fastPrev == null || slowPrev == null) continue;

    const cross = fastPrev <= slowPrev && fast > slow;
    const exitCross = fastPrev >= slowPrev && fast < slow;
    const bar = bars[i];

    if (!inPos && cross) {
      const entry = bar.close;
      const sl = +(entry * 0.97).toFixed(2);
      const tp = +(entry * 1.06).toFixed(2);
      inPos = { entry, idx: i, sl, tp };
    } else if (inPos) {
      const exit = bar.low <= inPos.sl ? inPos.sl : bar.high >= inPos.tp ? inPos.tp : exitCross ? bar.close : null;
      if (exit != null) {
        const rr = (inPos.tp - inPos.entry) / (inPos.entry - inPos.sl);
        trades.push({
          instrument: symbol,
          trade_date: bars[inPos.idx].date,
          side: "long",
          entry_price: inPos.entry,
          stop_loss: inPos.sl,
          take_profit: inPos.tp,
          exit_price: exit,
          risk_reward: +rr.toFixed(2),
          conviction_score: 6,
          risk_score: 4,
          rationale: "SMA(5) crossed above SMA(20) — long entry, fixed 3% SL / 6% TP.",
          result_pnl: +(exit - inPos.entry).toFixed(2),
        });
        inPos = null;
      }
    }
  }

  const wins = trades.filter((t) => t.result_pnl > 0).length;
  const winrate = trades.length ? wins / trades.length : 0;
  const totalPnl = trades.reduce((a, t) => a + t.result_pnl, 0);
  const expectancy = trades.length ? totalPnl / trades.length : 0;
  let peak = 0, dd = 0, eq = 0;
  for (const t of trades) {
    eq += t.result_pnl;
    if (eq > peak) peak = eq;
    if (peak - eq > dd) dd = peak - eq;
  }
  return {
    trades,
    summary: {
      trades: trades.length,
      winrate: +winrate.toFixed(3),
      total_pnl: +totalPnl.toFixed(2),
      expectancy: +expectancy.toFixed(2),
      max_drawdown: +dd.toFixed(2),
    },
  };
}
