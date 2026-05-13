import type { Sector } from "./types";

export const sectors: Sector[] = [
  { symbol: "XLK", name: "Technology", weight: 31.2, change1d: 0.7, change1m: 4.4, changeYtd: 32.1, trend: "bull" },
  { symbol: "XLF", name: "Financials", weight: 13.0, change1d: 0.3, change1m: 2.6, changeYtd: 28.4, trend: "bull" },
  { symbol: "XLV", name: "Healthcare", weight: 11.6, change1d: 0.1, change1m: -0.4, changeYtd: 7.8, trend: "neutral" },
  { symbol: "XLY", name: "Consumer Disc.", weight: 10.4, change1d: 0.5, change1m: 5.1, changeYtd: 19.6, trend: "bull" },
  { symbol: "XLC", name: "Communication", weight: 9.0, change1d: 0.4, change1m: 3.8, changeYtd: 28.0, trend: "bull" },
  { symbol: "XLI", name: "Industrials", weight: 8.4, change1d: 0.2, change1m: 1.6, changeYtd: 21.0, trend: "bull" },
  { symbol: "XLP", name: "Staples", weight: 5.7, change1d: -0.1, change1m: -0.6, changeYtd: 12.4, trend: "neutral" },
  { symbol: "XLE", name: "Energy", weight: 3.4, change1d: -0.4, change1m: 0.4, changeYtd: 18.0, trend: "neutral" },
  { symbol: "XLU", name: "Utilities", weight: 2.6, change1d: 0.0, change1m: -1.2, changeYtd: 24.4, trend: "neutral" },
  { symbol: "XLRE", name: "Real Estate", weight: 2.3, change1d: -0.2, change1m: -2.0, changeYtd: 8.2, trend: "bear" },
  { symbol: "XLB", name: "Materials", weight: 2.4, change1d: 0.1, change1m: 1.0, changeYtd: 9.4, trend: "neutral" },
];
