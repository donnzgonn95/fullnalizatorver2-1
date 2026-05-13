import { useEffect, useState } from "react";
import { getFeedManager } from "./feed-manager";
import type { Candle, FeedSnapshot, Interval, ScanSymbol } from "./types";

export function useLiveCandles(symbol: ScanSymbol | null, interval: Interval) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [snap, setSnap] = useState<FeedSnapshot>({ provider: "binance", status: "offline" });

  useEffect(() => {
    if (!symbol) return;
    const fm = getFeedManager();
    const off = fm.subscribe(symbol, interval, (c, s) => { setCandles([...c]); setSnap(s); });
    return off;
  }, [symbol, interval]);

  return { candles, snapshot: snap };
}

export function useFeedSnapshot() {
  const [snap, setSnap] = useState<FeedSnapshot>({ provider: "binance", status: "offline" });
  useEffect(() => getFeedManager().onSnapshot(setSnap), []);
  return snap;
}
