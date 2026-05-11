import { coins as demoCoins, type Coin } from "@/lib/demo-data";

const SYMBOLS = ["BTC", "ETH", "SOL", "BNB", "XRP", "AVAX", "LINK", "DOGE", "MATIC", "ARB"];

type RAW = {
  PRICE: number;
  CHANGEPCT24HOUR: number;
  TOTALVOLUME24HTO: number;
  MKTCAP: number;
};

type PriceMultiFull = { RAW?: Record<string, Record<string, RAW>> };
type HistoDay = { Data?: { Data?: { time: number; close: number }[] } };

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

async function fetch7d(sym: string): Promise<number | null> {
  const url = `https://min-api.cryptocompare.com/data/v2/histoday?fsym=${sym}&tsym=USD&limit=7`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = (await res.json()) as HistoDay;
    const arr = json.Data?.Data;
    if (!arr || arr.length < 2) return null;
    const past = arr[0].close;
    const now = arr[arr.length - 1].close;
    if (!past || !now) return null;
    return ((now - past) / past) * 100;
  } catch {
    return null;
  }
}

export async function fetchCryptoCompareCoins(): Promise<Coin[]> {
  const url = `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${SYMBOLS.join(",")}&tsyms=USD`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CryptoCompare ${res.status}`);
  const json = (await res.json()) as PriceMultiFull;
  const raw = json.RAW ?? {};

  const seven = await Promise.all(SYMBOLS.map(async (s) => [s, await fetch7d(s)] as const));
  const sevenMap = new Map(seven);

  const enriched = demoCoins.map((c) => {
    const r = raw[c.symbol]?.USD;
    if (!r) return c;
    const change7d = sevenMap.get(c.symbol) ?? c.change7d;
    return {
      ...c,
      price: r.PRICE,
      change24h: parseFloat(r.CHANGEPCT24HOUR.toFixed(2)),
      change7d: parseFloat(change7d.toFixed(2)),
      volume24h: r.TOTALVOLUME24HTO,
      marketCap: r.MKTCAP,
    };
  });

  const sortedByVol = [...enriched].sort((a, b) => b.volume24h - a.volume24h);
  const volRank = new Map(sortedByVol.map((c, i) => [c.symbol, i]));
  return enriched.map((c) => ({
    ...c,
    rsi: approxRsi(c.change24h),
    strength: computeStrength(c.change7d, c.change24h, volRank.get(c.symbol) ?? 0, enriched.length),
  }));
}
