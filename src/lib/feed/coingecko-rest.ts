import type { Candle, Interval, ScanSymbol } from "./types";
import { COINGECKO_ID, INTERVAL_MS } from "./types";

// CoinGecko returns 4-hourly OHLC for 14d, daily for 90d.
// We fall back by mapping our intervals to the closest available granularity.
function days(interval: Interval): number {
  switch (interval) {
    case "M15":
    case "M30":
    case "M45":
      return 1; // 30-min granularity
    case "H1":
      return 7; // 4-hour granularity
    case "H4":
      return 30; // 4-hour granularity
  }
}

export async function fetchCoinGeckoCandles(symbol: ScanSymbol, interval: Interval): Promise<Candle[]> {
  const id = COINGECKO_ID[symbol];
  const url = `https://api.coingecko.com/api/v3/coins/${id}/ohlc?vs_currency=usd&days=${days(interval)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const data = (await res.json()) as Array<[number, number, number, number, number]>;
  const step = INTERVAL_MS[interval];
  return data.map(([t, o, h, l, c]) => ({
    openTime: t,
    open: o,
    high: h,
    low: l,
    close: c,
    volume: 0,
    closed: Date.now() - t > step,
  }));
}
