export type Interval = "M15" | "M30" | "M45" | "H1" | "H4";

export const INTERVALS: Interval[] = ["M15", "M30", "M45", "H1", "H4"];

export const BINANCE_INTERVAL: Record<Exclude<Interval, "M45">, string> = {
  M15: "15m",
  M30: "30m",
  H1: "1h",
  H4: "4h",
};

export const INTERVAL_MS: Record<Interval, number> = {
  M15: 15 * 60_000,
  M30: 30 * 60_000,
  M45: 45 * 60_000,
  H1: 60 * 60_000,
  H4: 4 * 60 * 60_000,
};

export interface Candle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closed: boolean;
}

export type FeedProvider = "binance" | "coingecko";
export type FeedStatus = "connected" | "reconnecting" | "fallback" | "offline";

export interface FeedSnapshot {
  provider: FeedProvider;
  status: FeedStatus;
}

export const SCAN_SYMBOLS = ["BTC", "ETH", "SOL", "BNB", "XRP", "AVAX", "LINK", "DOGE", "MATIC", "ARB"] as const;
export type ScanSymbol = (typeof SCAN_SYMBOLS)[number];

export const BINANCE_PAIR: Record<ScanSymbol, string> = {
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
  SOL: "SOLUSDT",
  BNB: "BNBUSDT",
  XRP: "XRPUSDT",
  AVAX: "AVAXUSDT",
  LINK: "LINKUSDT",
  DOGE: "DOGEUSDT",
  MATIC: "POLUSDT",
  ARB: "ARBUSDT",
};

export const COINGECKO_ID: Record<ScanSymbol, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  BNB: "binancecoin",
  XRP: "ripple",
  AVAX: "avalanche-2",
  LINK: "chainlink",
  DOGE: "dogecoin",
  MATIC: "polygon-ecosystem-token",
  ARB: "arbitrum",
};
