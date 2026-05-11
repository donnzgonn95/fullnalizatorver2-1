// Fetches top 100 coins by market cap from CoinGecko (open universe).
import type { Coin } from "@/lib/demo-data";

type CGMarket = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  ath: number;
  ath_change_percentage: number;
  circulating_supply: number;
  total_supply: number;
  price_change_percentage_24h_in_currency: number;
  price_change_percentage_7d_in_currency: number;
};

function approxRsi(change24h: number): number {
  const c = Math.max(-10, Math.min(10, change24h));
  return Math.round(50 + c * 3);
}

function computeStrength(change7d: number, change24h: number, volRank: number, total: number): number {
  const trend = Math.max(0, Math.min(100, 50 + change7d * 2.5));
  const momentum = Math.max(0, Math.min(100, 50 + change24h * 5));
  const vol = ((total - volRank) / total) * 100;
  return Math.round(trend * 0.5 + momentum * 0.25 + vol * 0.25);
}

export async function fetchTop100Coins(): Promise<Coin[]> {
  const url =
    "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&price_change_percentage=24h,7d";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CoinGecko top100 ${res.status}`);
  const data = (await res.json()) as CGMarket[];

  const enriched = data.map((m) => ({
    symbol: (m.symbol || "").toUpperCase(),
    name: m.name,
    price: m.current_price ?? 0,
    change24h: parseFloat((m.price_change_percentage_24h_in_currency ?? 0).toFixed(2)),
    change7d: parseFloat((m.price_change_percentage_7d_in_currency ?? 0).toFixed(2)),
    volume24h: m.total_volume ?? 0,
    marketCap: m.market_cap ?? 0,
    rsi: 50,
    strength: 50,
    id: m.id,
    image: m.image,
    rank: m.market_cap_rank,
    high24h: m.high_24h,
    low24h: m.low_24h,
    ath: m.ath,
    athChangePct: m.ath_change_percentage,
    circulatingSupply: m.circulating_supply,
    totalSupply: m.total_supply,
  })) as Coin[];

  const sortedByVol = [...enriched].sort((a, b) => b.volume24h - a.volume24h);
  const volRank = new Map(sortedByVol.map((c, i) => [c.symbol, i]));
  return enriched.map((c) => ({
    ...c,
    rsi: approxRsi(c.change24h),
    strength: computeStrength(c.change7d, c.change24h, volRank.get(c.symbol) ?? 0, enriched.length),
  }));
}

export type Candle = { time: number; open: number; high: number; low: number; close: number };

// CoinGecko OHLC endpoint — returns [time(ms), open, high, low, close]
// days: 1, 7, 14, 30, 90, 180, 365, max
export async function fetchCoinOHLC(id: string, days: number = 30): Promise<Candle[]> {
  const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}/ohlc?vs_currency=usd&days=${days}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CoinGecko OHLC ${res.status}`);
  const data = (await res.json()) as [number, number, number, number, number][];
  return data.map(([t, o, h, l, c]) => ({ time: Math.floor(t / 1000), open: o, high: h, low: l, close: c }));
}

export type VolumePoint = { time: number; value: number };

// market_chart returns total_volumes: [ms, value]. Used to draw volume bars under candles.
export async function fetchCoinVolumes(id: string, days: number): Promise<VolumePoint[]> {
  const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=${days}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CoinGecko market_chart ${res.status}`);
  const json = (await res.json()) as { total_volumes?: [number, number][] };
  return (json.total_volumes ?? []).map(([t, v]) => ({ time: Math.floor(t / 1000), value: v }));
}
