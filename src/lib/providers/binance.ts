import { coins as demoCoins, type Coin } from "@/lib/demo-data";

const PAIRS: Record<string, string> = {
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
  SOL: "SOLUSDT",
  BNB: "BNBUSDT",
  XRP: "XRPUSDT",
  AVAX: "AVAXUSDT",
  LINK: "LINKUSDT",
  DOGE: "DOGEUSDT",
  MATIC: "POLUSDT", // MATIC was renamed to POL
  ARB: "ARBUSDT",
};

type BinanceTicker = {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  quoteVolume: string;
};

// Klines: [openTime, open, high, low, close, volume, closeTime, quoteVolume, trades, ...]
type Kline = [number, string, string, string, string, string, number, string, number, ...unknown[]];

async function fetchTickers(): Promise<BinanceTicker[]> {
  const symbols = Object.values(PAIRS);
  const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(symbols))}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Binance ticker ${res.status}`);
  return res.json();
}

async function fetch7dChange(pair: string): Promise<number | null> {
  // 8 daily candles → compare close 7 days ago to last close
  const url = `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=1d&limit=8`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as Kline[];
    if (data.length < 2) return null;
    const past = parseFloat(data[0][4]); // close 7 days ago
    const now = parseFloat(data[data.length - 1][4]); // last close
    if (!past || !now) return null;
    return ((now - past) / past) * 100;
  } catch {
    return null;
  }
}

function approxRsi(change24h: number): number {
  const c = Math.max(-10, Math.min(10, change24h));
  return Math.round(50 + c * 3);
}

function computeStrength(change7d: number, change24h: number, volRank: number, total: number): number {
  // 50% weight on 7d trend, 25% on momentum (24h), 25% on relative volume
  const trend = Math.max(0, Math.min(100, 50 + change7d * 2.5));
  const momentum = Math.max(0, Math.min(100, 50 + change24h * 5));
  const vol = ((total - volRank) / total) * 100;
  return Math.round(trend * 0.5 + momentum * 0.25 + vol * 0.25);
}

export async function fetchBinanceCoins(): Promise<Coin[]> {
  const tickers = await fetchTickers();
  const bySymbol = new Map(tickers.map((t) => [t.symbol, t]));

  // Real 7D in parallel
  const seven = await Promise.all(
    demoCoins.map(async (c) => {
      const pair = PAIRS[c.symbol];
      if (!pair) return [c.symbol, null] as const;
      return [c.symbol, await fetch7dChange(pair)] as const;
    }),
  );
  const sevenMap = new Map(seven);

  const enriched = demoCoins.map((c) => {
    const pair = PAIRS[c.symbol];
    const t = pair ? bySymbol.get(pair) : undefined;
    if (!t) return c;
    const price = parseFloat(t.lastPrice);
    const change24h = parseFloat(t.priceChangePercent);
    const volume24h = parseFloat(t.quoteVolume);
    const change7d = sevenMap.get(c.symbol) ?? c.change7d;
    return { ...c, price, change24h, change7d: parseFloat(change7d.toFixed(2)), volume24h };
  });

  const sortedByVol = [...enriched].sort((a, b) => b.volume24h - a.volume24h);
  const volRank = new Map(sortedByVol.map((c, i) => [c.symbol, i]));
  return enriched.map((c) => ({
    ...c,
    rsi: approxRsi(c.change24h),
    strength: computeStrength(c.change7d, c.change24h, volRank.get(c.symbol) ?? 0, enriched.length),
  }));
}
