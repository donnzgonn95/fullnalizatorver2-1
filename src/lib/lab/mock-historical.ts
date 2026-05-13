// Mock historical OHLC data generator (3 months) — used by the Backtest module.
export interface OhlcBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function rng(seed: number) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

export function generateHistory(symbol: string, days = 90, startPrice = 100): OhlcBar[] {
  const r = rng(symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0));
  const out: OhlcBar[] = [];
  let price = startPrice;
  const today = new Date();
  for (let i = days; i > 0; i--) {
    const date = new Date(today.getTime() - i * 86400000);
    const drift = (r() - 0.48) * 0.02;
    const open = price;
    const close = +(price * (1 + drift)).toFixed(2);
    const high = +Math.max(open, close, price * (1 + r() * 0.012)).toFixed(2);
    const low = +Math.min(open, close, price * (1 - r() * 0.012)).toFixed(2);
    out.push({ date: date.toISOString().slice(0, 10), open, high, low, close, volume: Math.round(1e6 + r() * 5e6) });
    price = close;
  }
  return out;
}
