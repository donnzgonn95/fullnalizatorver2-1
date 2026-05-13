export interface RiskSettings {
  max_trades_per_day: number;
  max_daily_loss: number;
  max_risk_per_trade: number;
  cooldown_minutes: number;
  kill_switch: boolean;
  block_high_macro_risk: boolean;
  block_correlated: boolean;
}

export interface RiskContext {
  trades_today: number;
  daily_pnl: number;
  last_loss_at?: Date | null;
  proposed_risk: number;
  macro_risk_high?: boolean;
  correlated_with_open?: boolean;
}

export function canOpenTrade(s: RiskSettings, c: RiskContext): { allowed: boolean; reason?: string } {
  if (s.kill_switch) return { allowed: false, reason: "Kill switch ACTIVE" };
  if (c.trades_today >= s.max_trades_per_day) return { allowed: false, reason: `Limit ${s.max_trades_per_day} transakcji dziennie` };
  if (c.daily_pnl <= -s.max_daily_loss) return { allowed: false, reason: "Przekroczono maksymalną dzienną stratę" };
  if (c.proposed_risk > s.max_risk_per_trade) return { allowed: false, reason: "Ryzyko transakcji powyżej limitu" };
  if (c.last_loss_at) {
    const mins = (Date.now() - c.last_loss_at.getTime()) / 60000;
    if (mins < s.cooldown_minutes) return { allowed: false, reason: `Cooldown po stracie (${Math.ceil(s.cooldown_minutes - mins)} min)` };
  }
  if (s.block_high_macro_risk && c.macro_risk_high) return { allowed: false, reason: "Wysokie ryzyko makro — handel zablokowany" };
  if (s.block_correlated && c.correlated_with_open) return { allowed: false, reason: "Pozycja skorelowana z otwartą — odrzucono" };
  return { allowed: true };
}

export function riskLevel(s: RiskSettings, c: { trades_today: number; daily_pnl: number }): "LOW" | "MEDIUM" | "HIGH" | "BLOCKED" {
  if (s.kill_switch) return "BLOCKED";
  if (c.daily_pnl <= -s.max_daily_loss) return "BLOCKED";
  if (c.daily_pnl <= -s.max_daily_loss * 0.6 || c.trades_today >= s.max_trades_per_day - 1) return "HIGH";
  if (c.trades_today >= s.max_trades_per_day / 2) return "MEDIUM";
  return "LOW";
}
