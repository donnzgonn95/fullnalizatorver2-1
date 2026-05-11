import { coins as demoCoins, type Coin } from "@/lib/demo-data";

const IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  BNB: "binancecoin",
  XRP: "ripple",
  AVAX: "avalanche-2",
  LINK: "chainlink",
  DOGE: "dogecoin",
  MATIC: "matic-network",
  ARB: "arbitrum",
};

type CGMarket = {
  id: string;
  current_price: number;
  total_volume: number;
  market_cap: number;
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

export async function fetchCoingeckoCoins(): Promise<Coin[]> {
  const ids = Object.values(IDS).join(",");
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&price_change_percentage=24h,7d`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const data = (await res.json()) as CGMarket[];
  const byId = new Map(data.map((d) => [d.id, d]));

  const enriched = demoCoins.map((c) => {
    const m = byId.get(IDS[c.symbol]);
    if (!m) return c;
    return {
      ...c,
      price: m.current_price,
      change24h: parseFloat((m.price_change_percentage_24h_in_currency ?? 0).toFixed(2)),
      change7d: parseFloat((m.price_change_percentage_7d_in_currency ?? 0).toFixed(2)),
      volume24h: m.total_volume,
      marketCap: m.market_cap,
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
