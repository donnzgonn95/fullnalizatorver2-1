import type { MarketIndex } from "./types";

export const indices: MarketIndex[] = [
  { symbol: "SPX", name: "S&P 500", region: "USA", value: 5870.4, change1d: 0.42, change1m: 2.1, changeYtd: 23.1 },
  { symbol: "NDX", name: "Nasdaq 100", region: "USA", value: 20810.7, change1d: 0.61, change1m: 3.4, changeYtd: 27.8 },
  { symbol: "DJI", name: "Dow Jones", region: "USA", value: 43210.0, change1d: 0.18, change1m: 1.2, changeYtd: 14.6 },
  { symbol: "RUT", name: "Russell 2000", region: "USA", value: 2331.5, change1d: -0.34, change1m: -1.6, changeYtd: 8.4 },
  { symbol: "DAX", name: "DAX 40", region: "Europa", value: 19450.2, change1d: 0.27, change1m: 1.9, changeYtd: 17.2 },
  { symbol: "CAC", name: "CAC 40", region: "Europa", value: 7480.1, change1d: -0.11, change1m: 0.8, changeYtd: 4.6 },
  { symbol: "FTSE", name: "FTSE 100", region: "Europa", value: 8210.5, change1d: 0.05, change1m: 1.1, changeYtd: 6.9 },
  { symbol: "WIG20", name: "WIG20", region: "Polska", value: 2360.0, change1d: 0.34, change1m: -2.4, changeYtd: 1.8 },
];

export const usStocks = [
  { symbol: "AAPL", name: "Apple", sector: "Technology", price: 235.4, change1d: 0.8, change1m: 4.2, changeYtd: 31.2, marketCap: 3550, pe: 34 },
  { symbol: "MSFT", name: "Microsoft", sector: "Technology", price: 421.6, change1d: 0.5, change1m: 2.6, changeYtd: 18.4, marketCap: 3130, pe: 36 },
  { symbol: "NVDA", name: "Nvidia", sector: "Technology", price: 142.3, change1d: 1.6, change1m: 8.1, changeYtd: 168.4, marketCap: 3490, pe: 65 },
  { symbol: "GOOGL", name: "Alphabet", sector: "Communication", price: 187.2, change1d: 0.4, change1m: 5.1, changeYtd: 32.0, marketCap: 2300, pe: 24 },
  { symbol: "AMZN", name: "Amazon", sector: "Consumer Disc.", price: 215.8, change1d: 1.1, change1m: 6.4, changeYtd: 41.2, marketCap: 2270, pe: 45 },
  { symbol: "META", name: "Meta", sector: "Communication", price: 590.2, change1d: 0.3, change1m: 3.8, changeYtd: 67.1, marketCap: 1490, pe: 28 },
  { symbol: "TSLA", name: "Tesla", sector: "Consumer Disc.", price: 348.0, change1d: -1.2, change1m: 12.8, changeYtd: 41.0, marketCap: 1110, pe: 95 },
  { symbol: "JPM", name: "JPMorgan", sector: "Financials", price: 247.4, change1d: 0.2, change1m: 3.1, changeYtd: 45.0, marketCap: 695, pe: 13 },
  { symbol: "XOM", name: "Exxon Mobil", sector: "Energy", price: 121.0, change1d: -0.4, change1m: 0.5, changeYtd: 19.2, marketCap: 530, pe: 15 },
  { symbol: "UNH", name: "UnitedHealth", sector: "Healthcare", price: 615.3, change1d: 0.6, change1m: 4.4, changeYtd: 16.7, marketCap: 565, pe: 22 },
];

export const euStocks = [
  { symbol: "ASML.AS", name: "ASML", sector: "Technology", price: 678.0, change1d: 0.9, change1m: 6.4, changeYtd: 14.0 },
  { symbol: "SAP.DE", name: "SAP", sector: "Software", price: 235.0, change1d: 0.5, change1m: 3.2, changeYtd: 51.0 },
  { symbol: "MC.PA", name: "LVMH", sector: "Consumer", price: 645.0, change1d: -0.6, change1m: -1.1, changeYtd: -9.0 },
  { symbol: "NESN.SW", name: "Nestlé", sector: "Staples", price: 78.4, change1d: 0.1, change1m: 0.6, changeYtd: -10.2 },
  { symbol: "NOVO-B.CO", name: "Novo Nordisk", sector: "Healthcare", price: 870.0, change1d: -0.3, change1m: -4.1, changeYtd: -2.1 },
  { symbol: "SHEL.L", name: "Shell", sector: "Energy", price: 26.8, change1d: 0.1, change1m: 1.0, changeYtd: 8.6 },
  { symbol: "AIR.PA", name: "Airbus", sector: "Industrials", price: 158.0, change1d: 0.7, change1m: 5.4, changeYtd: 13.4 },
  { symbol: "PKO.WA", name: "PKO BP", sector: "Financials", price: 56.0, change1d: 0.5, change1m: -2.8, changeYtd: 12.4 },
];
