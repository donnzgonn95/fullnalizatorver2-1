export interface TradeSignal {
  instrument: string;
  side: "long" | "short";
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  risk_reward?: number;
  conviction_score?: number;
}

export function formatTelegramAlert(t: TradeSignal, kind: "ENTRY" | "EXIT" = "ENTRY"): string {
  const arrow = t.side === "long" ? "🟢 LONG" : "🔴 SHORT";
  const rr = t.risk_reward != null ? ` | R:R ${t.risk_reward.toFixed(2)}` : "";
  const conv = t.conviction_score != null ? ` | conv ${t.conviction_score}/10` : "";
  return [
    `[PAPER] ${kind}`,
    `${arrow} ${t.instrument} @ ${t.entry_price}`,
    `SL ${t.stop_loss} | TP ${t.take_profit}${rr}${conv}`,
    `⚠ Symulacja — żadne zlecenie nie zostało wysłane.`,
  ].join("\n");
}
