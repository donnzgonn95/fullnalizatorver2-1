import type { Candle, Interval, ScanSymbol } from "./types";
import { BINANCE_INTERVAL, BINANCE_PAIR } from "./types";

export async function fetchBinanceKlines(
  symbol: ScanSymbol,
  interval: Exclude<Interval, "M45">,
  limit = 200,
): Promise<Candle[]> {
  const itv = BINANCE_INTERVAL[interval];
  const url = `https://api.binance.com/api/v3/klines?symbol=${BINANCE_PAIR[symbol]}&interval=${itv}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Binance ${res.status}`);
  const data = (await res.json()) as Array<unknown[]>;
  const now = Date.now();
  return data.map((row) => {
    const openTime = row[0] as number;
    const closeTime = row[6] as number;
    return {
      openTime,
      open: parseFloat(row[1] as string),
      high: parseFloat(row[2] as string),
      low: parseFloat(row[3] as string),
      close: parseFloat(row[4] as string),
      volume: parseFloat(row[5] as string),
      closed: now > closeTime,
    } as Candle;
  });
}

type Listener = (candle: Candle) => void;

export class BinanceKlineSocket {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private failures = 0;
  private closed = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    public symbol: ScanSymbol,
    public interval: Exclude<Interval, "M45">,
    private onError?: (failures: number) => void,
  ) {
    this.connect();
  }

  private connect() {
    if (this.closed) return;
    const itv = BINANCE_INTERVAL[this.interval];
    const stream = `${BINANCE_PAIR[this.symbol].toLowerCase()}@kline_${itv}`;
    const url = `wss://stream.binance.com:9443/ws/${stream}`;
    try {
      this.ws = new WebSocket(url);
    } catch (e) {
      this.scheduleReconnect();
      return;
    }
    this.ws.onopen = () => { this.failures = 0; };
    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string);
        const k = msg.k;
        if (!k) return;
        const candle: Candle = {
          openTime: k.t,
          open: parseFloat(k.o),
          high: parseFloat(k.h),
          low: parseFloat(k.l),
          close: parseFloat(k.c),
          volume: parseFloat(k.v),
          closed: !!k.x,
        };
        this.listeners.forEach((l) => l(candle));
      } catch {/* ignore */}
    };
    this.ws.onerror = () => {
      this.failures += 1;
      this.onError?.(this.failures);
    };
    this.ws.onclose = () => {
      if (!this.closed) this.scheduleReconnect();
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.connect(), Math.min(30_000, 1000 * 2 ** Math.min(this.failures, 5)));
  }

  subscribe(l: Listener) { this.listeners.add(l); return () => this.listeners.delete(l); }

  close() {
    this.closed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
  }

  get failureCount() { return this.failures; }
}
