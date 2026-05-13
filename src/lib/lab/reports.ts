// Mock generator for morning/evening reports.
export function generateMorningReport(date: string) {
  return {
    date,
    headline: `Sesja ${date}: po umiarkowanej rozgrzewce w Azji USA otwiera się z dodatnim biasem.`,
    last5to7: [
      "S&P 500 +1.2% w 5 dni; breadth poprawia się.",
      "Rentowności 10Y stabilne przy 4.20%.",
      "VIX poniżej 15 — niskie ryzyko zmienności.",
    ],
    key_events: ["10:30 — wstępne PMI EU", "14:30 — Initial Jobless Claims", "20:00 — Minutes Fed"],
    leading_signals: ["XLF i IWM przewodzą — risk-on", "DXY słabnie — wsparcie dla EM"],
    preferred_tactics: ["Trend Following na megacaps", "Sector Rotation ku financials"],
    watchlist: ["SPY", "QQQ", "XLF", "IWM", "EURUSD"],
    risks: ["Powrót zmienności po Minutes Fed", "Słabe wyniki retail"],
  };
}

export function generateEveningReport(date: string) {
  return {
    date,
    headline: `Sesja USA ${date} zamknęła się mieszanie — rotacja z big-tech do financials.`,
    summary: "S&P +0.3%, Nasdaq -0.2%, Russell +0.9%. Defensywne pod presją.",
    sector_rotation: ["Financials +1.4%", "Energy +0.9%", "Tech -0.4%", "Utilities -0.6%"],
    flows: ["Inflow do XLF +$420mln", "Outflow z TLT -$180mln"],
    agent_performance: { decisions: 4, approved: 3, hit: 2, miss: 1, winrate: 0.67 },
    setups_for_tomorrow: ["JPM po wybiciu range", "XLE — kontynuacja", "QQQ — czekamy na test 510"],
  };
}
