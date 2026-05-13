import type { Etf, EtfScore } from "./types";

function s(p: { momentum: number; trend: number; cost: number; liquidity: number; risk: number }): EtfScore {
  const total = Math.round(
    p.momentum * 0.3 + p.trend * 0.2 + p.cost * 0.15 + p.liquidity * 0.2 + p.risk * 0.15,
  );
  return { ...p, total };
}

export const etfs: Etf[] = [
  // Szeroki rynek USA
  {
    symbol: "SPY", name: "SPDR S&P 500", type: "Equity", region: "USA",
    expense: 0.09, aumBn: 580, ytd: 23.0, change1d: 0.4, change1m: 3.2, change3m: 7.8,
    description: "Szeroki rynek USA — 500 największych spółek.",
    category: "Szeroki rynek USA", sectorExposure: ["Technology", "Financials", "Healthcare"],
    topHoldings: ["AAPL", "MSFT", "NVDA", "AMZN", "META"], dividend: 1.3, rating: "Buy",
    score: s({ momentum: 84, trend: 88, cost: 90, liquidity: 100, risk: 70 }),
  },
  {
    symbol: "VOO", name: "Vanguard S&P 500", type: "Equity", region: "USA",
    expense: 0.03, aumBn: 480, ytd: 23.0, change1d: 0.4, change1m: 3.2, change3m: 7.8,
    description: "Tańszy odpowiednik SPY.",
    category: "Szeroki rynek USA", sectorExposure: ["Technology", "Financials"],
    topHoldings: ["AAPL", "MSFT", "NVDA"], dividend: 1.3, rating: "Buy",
    score: s({ momentum: 84, trend: 88, cost: 98, liquidity: 95, risk: 70 }),
  },
  {
    symbol: "VTI", name: "Vanguard Total Stock", type: "Equity", region: "USA",
    expense: 0.03, aumBn: 460, ytd: 22.4, change1d: 0.4, change1m: 3.0, change3m: 7.4,
    description: "Cały rynek USA, ~3800 spółek.",
    category: "Szeroki rynek USA", sectorExposure: ["Technology", "Financials", "Healthcare"],
    topHoldings: ["AAPL", "MSFT", "NVDA"], dividend: 1.3, rating: "Buy",
    score: s({ momentum: 82, trend: 86, cost: 98, liquidity: 95, risk: 72 }),
  },
  {
    symbol: "QQQ", name: "Invesco Nasdaq-100", type: "Equity", region: "USA",
    expense: 0.20, aumBn: 310, ytd: 27.8, change1d: 0.6, change1m: 4.6, change3m: 10.2,
    description: "Big tech i innowacje, 100 niefinansowych spółek Nasdaq.",
    category: "Szeroki rynek USA", sectorExposure: ["Technology", "Communication"],
    topHoldings: ["AAPL", "MSFT", "NVDA", "AMZN", "META"], dividend: 0.6, rating: "Buy",
    score: s({ momentum: 92, trend: 90, cost: 78, liquidity: 100, risk: 55 }),
  },
  {
    symbol: "IWM", name: "iShares Russell 2000", type: "Equity", region: "USA",
    expense: 0.19, aumBn: 75, ytd: 8.4, change1d: -0.3, change1m: -1.4, change3m: 2.1,
    description: "Small cap USA, beneficjent obniżek stóp.",
    category: "Szeroki rynek USA", sectorExposure: ["Financials", "Industrials", "Healthcare"],
    topHoldings: ["SMCI", "MSTR", "CVNA"], dividend: 1.4, rating: "Hold",
    score: s({ momentum: 42, trend: 46, cost: 80, liquidity: 90, risk: 45 }),
  },

  // Sektorowe USA
  {
    symbol: "XLK", name: "Technology Select Sector", type: "Sector", region: "USA",
    expense: 0.09, aumBn: 78, ytd: 32.1, change1d: 0.7, change1m: 4.4, change3m: 11.0,
    description: "ETF sektorowy — Technology.",
    category: "Sektor: Technology", sectorExposure: ["Technology"],
    topHoldings: ["AAPL", "MSFT", "NVDA", "AVGO"], dividend: 0.6, rating: "Buy",
    score: s({ momentum: 92, trend: 90, cost: 92, liquidity: 90, risk: 55 }),
  },
  {
    symbol: "XLF", name: "Financial Select Sector", type: "Sector", region: "USA",
    expense: 0.09, aumBn: 48, ytd: 28.4, change1d: 0.3, change1m: 2.6, change3m: 6.5,
    description: "ETF sektorowy — Financials.",
    category: "Sektor: Financials", sectorExposure: ["Financials"],
    topHoldings: ["BRK.B", "JPM", "V", "MA"], dividend: 1.6, rating: "Buy",
    score: s({ momentum: 80, trend: 78, cost: 92, liquidity: 88, risk: 65 }),
  },
  {
    symbol: "XLE", name: "Energy Select Sector", type: "Sector", region: "USA",
    expense: 0.09, aumBn: 36, ytd: 18.0, change1d: -0.4, change1m: 0.4, change3m: 1.8,
    description: "ETF sektorowy — Energy.",
    category: "Sektor: Energy", sectorExposure: ["Energy"],
    topHoldings: ["XOM", "CVX", "COP"], dividend: 3.4, rating: "Hold",
    score: s({ momentum: 48, trend: 50, cost: 92, liquidity: 88, risk: 55 }),
  },
  {
    symbol: "XLV", name: "Health Care Select Sector", type: "Sector", region: "USA",
    expense: 0.09, aumBn: 42, ytd: 7.8, change1d: 0.1, change1m: -0.4, change3m: -1.6,
    description: "ETF sektorowy — Healthcare.",
    category: "Sektor: Healthcare", sectorExposure: ["Healthcare"],
    topHoldings: ["LLY", "UNH", "JNJ"], dividend: 1.5, rating: "Hold",
    score: s({ momentum: 40, trend: 46, cost: 92, liquidity: 86, risk: 75 }),
  },
  {
    symbol: "XLY", name: "Consumer Disc. Select", type: "Sector", region: "USA",
    expense: 0.09, aumBn: 22, ytd: 19.6, change1d: 0.5, change1m: 5.1, change3m: 8.4,
    description: "ETF sektorowy — Consumer Discretionary.",
    category: "Sektor: Consumer Discretionary", sectorExposure: ["Consumer Disc."],
    topHoldings: ["AMZN", "TSLA", "HD"], dividend: 0.8, rating: "Buy",
    score: s({ momentum: 78, trend: 74, cost: 92, liquidity: 84, risk: 55 }),
  },

  // Region: Europa
  {
    symbol: "EZU", name: "iShares MSCI Eurozone", type: "Region", region: "Europa",
    expense: 0.51, aumBn: 8, ytd: 9.4, change1d: 0.2, change1m: 1.4, change3m: 3.1,
    description: "Strefa euro — szeroka ekspozycja.",
    category: "Region: Europa", sectorExposure: ["Financials", "Industrials", "Consumer"],
    topHoldings: ["ASML", "SAP", "LVMH"], dividend: 3.1, rating: "Hold",
    score: s({ momentum: 50, trend: 54, cost: 50, liquidity: 60, risk: 65 }),
  },
  {
    symbol: "EWG", name: "iShares MSCI Germany", type: "Region", region: "Europa",
    expense: 0.50, aumBn: 2, ytd: 14.0, change1d: 0.3, change1m: 2.0, change3m: 4.6,
    description: "Niemcy, dominacja przemysłu i finansów.",
    category: "Region: Europa", sectorExposure: ["Industrials", "Financials"],
    topHoldings: ["SAP", "SIE", "ALV"], dividend: 2.6, rating: "Hold",
    score: s({ momentum: 58, trend: 60, cost: 50, liquidity: 50, risk: 60 }),
  },
  {
    symbol: "EWU", name: "iShares MSCI UK", type: "Region", region: "Europa",
    expense: 0.50, aumBn: 3, ytd: 11.2, change1d: 0.1, change1m: 1.0, change3m: 2.8,
    description: "UK — energia, banki, defensywni.",
    category: "Region: Europa", sectorExposure: ["Energy", "Financials", "Staples"],
    topHoldings: ["AZN", "SHEL", "HSBA"], dividend: 3.8, rating: "Hold",
    score: s({ momentum: 54, trend: 56, cost: 50, liquidity: 55, risk: 70 }),
  },

  // Surowce
  {
    symbol: "GLD", name: "SPDR Gold", type: "Commodity", region: "Global",
    expense: 0.40, aumBn: 80, ytd: 30.6, change1d: 0.5, change1m: 3.8, change3m: 9.5,
    description: "Złoto fizyczne — bezpieczna przystań.",
    category: "Surowce", sectorExposure: [], dividend: 0, rating: "Buy",
    score: s({ momentum: 90, trend: 88, cost: 60, liquidity: 92, risk: 75 }),
  },

  // Obligacje
  {
    symbol: "TLT", name: "iShares 20+Y Treasury", type: "Bond", region: "USA",
    expense: 0.15, aumBn: 60, ytd: -1.8, change1d: -0.2, change1m: -0.8, change3m: -2.4,
    description: "Długie obligacje USA — czuły na stopy.",
    category: "Obligacje", sectorExposure: [], dividend: 4.1, rating: "Hold",
    score: s({ momentum: 30, trend: 28, cost: 86, liquidity: 88, risk: 50 }),
  },
  {
    symbol: "HYG", name: "iShares HY Corp", type: "Bond", region: "USA",
    expense: 0.49, aumBn: 18, ytd: 7.4, change1d: 0.1, change1m: 0.6, change3m: 2.1,
    description: "Obligacje korporacyjne high yield — risk-on.",
    category: "Obligacje", sectorExposure: [], dividend: 6.8, rating: "Hold",
    score: s({ momentum: 60, trend: 64, cost: 50, liquidity: 78, risk: 55 }),
  },

  // Tematyczne
  {
    symbol: "ARKK", name: "ARK Innovation", type: "Thematic", region: "USA",
    expense: 0.75, aumBn: 6, ytd: 18.0, change1d: 1.2, change1m: 6.4, change3m: 14.0,
    description: "Disrupcyjne tech, wysokie beta.",
    category: "Tematyczne", sectorExposure: ["Technology", "Healthcare"],
    topHoldings: ["TSLA", "COIN", "ROKU"], dividend: 0, rating: "Hold",
    score: s({ momentum: 86, trend: 78, cost: 30, liquidity: 60, risk: 25 }),
  },
];
