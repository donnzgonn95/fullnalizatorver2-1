import type { MacroIndicator } from "./types";

export const macroIndicators: MacroIndicator[] = [
  { id: "us-cpi", name: "CPI (USA, YoY)", region: "USA", value: 2.6, unit: "%", change: -0.1, asOf: "2025-04-15", interpretation: "positive", note: "Inflacja schładza się w kierunku celu 2%." },
  { id: "us-fed", name: "Fed Funds Rate", region: "USA", value: 4.50, unit: "%", change: -0.25, asOf: "2025-05-02", interpretation: "positive", note: "Cykl obniżek wciąż otwarty." },
  { id: "us-10y", name: "US 10Y Yield", region: "USA", value: 4.32, unit: "%", change: 0.06, asOf: "2025-05-13", interpretation: "neutral" },
  { id: "us-unemp", name: "Bezrobocie USA", region: "USA", value: 4.1, unit: "%", change: 0.0, asOf: "2025-05-01", interpretation: "neutral" },
  { id: "vix", name: "VIX", region: "USA", value: 14.8, unit: "pkt", change: -0.6, asOf: "2025-05-13", interpretation: "positive", note: "Rynek spokojny, brak strachu." },
  { id: "ecb", name: "ECB Rate", region: "Europa", value: 3.25, unit: "%", change: -0.25, asOf: "2025-04-30", interpretation: "positive" },
  { id: "eu-cpi", name: "CPI (EU, YoY)", region: "Europa", value: 2.2, unit: "%", change: -0.1, asOf: "2025-04-30", interpretation: "positive" },
  { id: "eurusd", name: "EUR/USD", region: "Global", value: 1.085, unit: "", change: 0.004, asOf: "2025-05-13", interpretation: "neutral" },
  { id: "dxy", name: "DXY", region: "Global", value: 103.2, unit: "pkt", change: -0.2, asOf: "2025-05-13", interpretation: "positive", note: "Słabszy dolar wspiera ryzykowne aktywa." },
  { id: "wti", name: "Ropa WTI", region: "Global", value: 71.4, unit: "USD", change: -0.8, asOf: "2025-05-13", interpretation: "neutral" },
];
