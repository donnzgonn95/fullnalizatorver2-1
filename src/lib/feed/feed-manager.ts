import type { Candle, FeedProvider, FeedSnapshot, FeedStatus, Interval, ScanSymbol } from "./types";
import { INTERVAL_MS } from "./types";
import { BinanceKlineSocket, fetchBinanceKlines } from "./binance-ws";
import { fetchCoinGeckoCandles } from "./coingecko-rest";
import { aggregateM45 } from "./m45";

const PROVIDER_KEY = "feed:provider:v1";

type Sub = (candles: Candle[], snap: FeedSnapshot) => void;

interface Stream {
  candles: Candle[];
  subs: Set<Sub>;
  socket?: BinanceKlineSocket;
  pollTimer?: ReturnType<typeof setInterval>;
  retryTimer?: ReturnType<typeof setTimeout>;
  m15Source?: Stream; // for M45 derivation
  unsubM15?: () => void;
}

class FeedManager {
  private streams = new Map<string, Stream>();
  private snapshot: FeedSnapshot = { provider: "binance", status: "offline" };
  private listeners = new Set<(s: FeedSnapshot) => void>();
  private manualOverride: FeedProvider | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      const v = window.localStorage.getItem(PROVIDER_KEY);
      if (v === "binance" || v === "coingecko") this.manualOverride = v;
    }
  }

  getSnapshot() { return this.snapshot; }

  setProvider(p: FeedProvider | "auto") {
    if (p === "auto") {
      this.manualOverride = null;
      if (typeof window !== "undefined") window.localStorage.removeItem(PROVIDER_KEY);
    } else {
      this.manualOverride = p;
      if (typeof window !== "undefined") window.localStorage.setItem(PROVIDER_KEY, p);
    }
    // Restart all streams with new provider.
    this.streams.forEach((s, key) => this.restartStream(key, s));
  }

  onSnapshot(cb: (s: FeedSnapshot) => void) {
    this.listeners.add(cb);
    cb(this.snapshot);
    return () => this.listeners.delete(cb);
  }

  private setSnapshot(p: Partial<FeedSnapshot>) {
    this.snapshot = { ...this.snapshot, ...p };
    this.listeners.forEach((l) => l(this.snapshot));
  }

  subscribe(symbol: ScanSymbol, interval: Interval, cb: Sub): () => void {
    const key = `${symbol}:${interval}`;
    let s = this.streams.get(key);
    if (!s) {
      s = { candles: [], subs: new Set() };
      this.streams.set(key, s);
      this.startStream(key, s, symbol, interval);
    }
    s.subs.add(cb);
    if (s.candles.length) cb(s.candles, this.snapshot);
    return () => {
      s!.subs.delete(cb);
      if (s!.subs.size === 0) this.stopStream(key);
    };
  }

  private async startStream(key: string, s: Stream, symbol: ScanSymbol, interval: Interval) {
    const provider = this.manualOverride ?? "binance";
    if (provider === "binance") {
      try {
        if (interval === "M45") {
          // Build from M15
          const m15Key = `${symbol}:M15`;
          let m15 = this.streams.get(m15Key);
          if (!m15) {
            m15 = { candles: [], subs: new Set() };
            this.streams.set(m15Key, m15);
            await this.startStream(m15Key, m15, symbol, "M15");
          }
          s.m15Source = m15;
          const apply = () => {
            s.candles = aggregateM45(m15!.candles);
            this.broadcast(s);
          };
          s.unsubM15 = (() => { const cb: Sub = () => apply(); m15!.subs.add(cb); return () => m15!.subs.delete(cb); })();
          apply();
          return;
        }
        const initial = await fetchBinanceKlines(symbol, interval as Exclude<Interval, "M45">, 200);
        s.candles = initial;
        this.setSnapshot({ provider: "binance", status: "connected" });
        const sock = new BinanceKlineSocket(symbol, interval as Exclude<Interval, "M45">, (failures) => {
          if (failures >= 3 && this.manualOverride !== "binance") {
            this.failoverToCoinGecko(key, s, symbol, interval);
          } else {
            this.setSnapshot({ status: "reconnecting" });
          }
        });
        sock.subscribe((c) => {
          const last = s.candles[s.candles.length - 1];
          if (last && last.openTime === c.openTime) s.candles[s.candles.length - 1] = c;
          else s.candles.push(c);
          if (s.candles.length > 500) s.candles.shift();
          this.broadcast(s);
        });
        s.socket = sock;
        this.broadcast(s);
      } catch (e) {
        this.failoverToCoinGecko(key, s, symbol, interval);
      }
    } else {
      this.startCoinGeckoPoll(key, s, symbol, interval);
    }
  }

  private async failoverToCoinGecko(key: string, s: Stream, symbol: ScanSymbol, interval: Interval) {
    s.socket?.close(); s.socket = undefined;
    this.setSnapshot({ provider: "coingecko", status: "fallback" });
    this.startCoinGeckoPoll(key, s, symbol, interval);
    // Try to recover Binance after 60s if no manual override.
    s.retryTimer = setTimeout(() => {
      if (this.manualOverride !== "coingecko") this.restartStream(key, s);
    }, 60_000);
  }

  private async startCoinGeckoPoll(key: string, s: Stream, symbol: ScanSymbol, interval: Interval) {
    const load = async () => {
      try {
        s.candles = await fetchCoinGeckoCandles(symbol, interval);
        this.setSnapshot({
          provider: "coingecko",
          status: this.manualOverride === "coingecko" ? "connected" : "fallback",
        });
        this.broadcast(s);
      } catch {
        this.setSnapshot({ status: "offline" });
      }
    };
    await load();
    s.pollTimer = setInterval(load, 30_000);
  }

  private restartStream(key: string, s: Stream) {
    const [symbol, interval] = key.split(":") as [ScanSymbol, Interval];
    this.cleanup(s);
    s.candles = [];
    void this.startStream(key, s, symbol, interval);
  }

  private stopStream(key: string) {
    const s = this.streams.get(key);
    if (!s) return;
    this.cleanup(s);
    this.streams.delete(key);
  }

  private cleanup(s: Stream) {
    s.socket?.close(); s.socket = undefined;
    if (s.pollTimer) clearInterval(s.pollTimer);
    if (s.retryTimer) clearTimeout(s.retryTimer);
    s.unsubM15?.();
  }

  private broadcast(s: Stream) {
    s.subs.forEach((cb) => cb(s.candles, this.snapshot));
  }
}

let _instance: FeedManager | null = null;
export function getFeedManager(): FeedManager {
  if (typeof window === "undefined") return new FeedManager();
  if (!_instance) _instance = new FeedManager();
  return _instance;
}

export { INTERVAL_MS };
