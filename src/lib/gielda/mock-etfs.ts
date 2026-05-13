import type { Etf } from "./types";

export const etfs: Etf[] = [
  { symbol: "SPY", name: "SPDR S&P 500", type: "Equity", region: "USA", expense: 0.09, aumBn: 580, ytd: 23.0, change1d: 0.4, description: "Szeroki rynek USA — 500 największych spółek." },
  { symbol: "QQQ", name: "Invesco Nasdaq-100", type: "Equity", region: "USA", expense: 0.20, aumBn: 310, ytd: 27.8, change1d: 0.6, description: "Big tech i innowacje, 100 niefinansowych spółek Nasdaq." },
  { symbol: "VTI", name: "Vanguard Total Stock", type: "Equity", region: "USA", expense: 0.03, aumBn: 460, ytd: 22.4, change1d: 0.4, description: "Cały rynek USA, ~3800 spółek." },
  { symbol: "IWM", name: "iShares Russell 2000", type: "Equity", region: "USA", expense: 0.19, aumBn: 75, ytd: 8.4, change1d: -0.3, description: "Small cap USA, beneficjent obniżek stóp." },
  { symbol: "VOO", name: "Vanguard S&P 500", type: "Equity", region: "USA", expense: 0.03, aumBn: 480, ytd: 23.0, change1d: 0.4, description: "Tańszy odpowiednik SPY." },
  { symbol: "EZU", name: "iShares MSCI Eurozone", type: "Region", region: "Europa", expense: 0.51, aumBn: 8, ytd: 9.4, change1d: 0.2, description: "Strefa euro — szeroka ekspozycja." },
  { symbol: "EWG", name: "iShares MSCI Germany", type: "Region", region: "Europa", expense: 0.50, aumBn: 2, ytd: 14.0, change1d: 0.3, description: "Niemcy, dominacja przemysłu i finansów." },
  { symbol: "EWU", name: "iShares MSCI UK", type: "Region", region: "Europa", expense: 0.50, aumBn: 3, ytd: 11.2, change1d: 0.1, description: "UK — energia, banki, defensywni." },
  { symbol: "GLD", name: "SPDR Gold", type: "Commodity", region: "Global", expense: 0.40, aumBn: 80, ytd: 30.6, change1d: 0.5, description: "Złoto fizyczne — bezpieczna przystań." },
  { symbol: "TLT", name: "iShares 20+Y Treasury", type: "Bond", region: "USA", expense: 0.15, aumBn: 60, ytd: -1.8, change1d: -0.2, description: "Długie obligacje USA — czuły na stopy." },
  { symbol: "HYG", name: "iShares HY Corp", type: "Bond", region: "USA", expense: 0.49, aumBn: 18, ytd: 7.4, change1d: 0.1, description: "Obligacje korporacyjne high yield — risk-on." },
  { symbol: "ARKK", name: "ARK Innovation", type: "Thematic", region: "USA", expense: 0.75, aumBn: 6, ytd: 18.0, change1d: 1.2, description: "Disrupcyjne tech, wysokie beta." },
];
