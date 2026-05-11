// Per-coin ustawienia wykresu TradingView (override symbolu, motyw, interwał) w localStorage.
import { useEffect, useState } from "react";
import type { TradingViewRange } from "@/components/TradingViewChart";

export type TvTheme = "dark" | "light";
export type TvInterval = "1" | "5" | "15" | "30" | "60" | "240" | "D" | "W" | "M";

export const TV_INTERVAL_OPTIONS: { value: TvInterval; label: string }[] = [
  { value: "5", label: "5m" },
  { value: "15", label: "15m" },
  { value: "60", label: "1h" },
  { value: "240", label: "4h" },
  { value: "D", label: "1D" },
  { value: "W", label: "1W" },
  { value: "M", label: "1M" },
];

export type CoinTvSettings = {
  symbolOverride?: string; // pełen symbol TradingView, np. "KRAKEN:XRPUSD"
  theme: TvTheme;
  interval: TvInterval;
  range?: TradingViewRange;
};

const DEFAULTS: CoinTvSettings = { theme: "dark", interval: "D" };

function key(sym: string) {
  return `coin:tv-settings:v1:${sym.toUpperCase()}`;
}

function read(sym: string): CoinTvSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(key(sym));
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<CoinTvSettings>) };
  } catch {
    return DEFAULTS;
  }
}

function write(sym: string, value: CoinTvSettings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key(sym), JSON.stringify(value));
  } catch {
    /* noop */
  }
}

export function useCoinTvSettings(sym: string) {
  const [settings, setSettings] = useState<CoinTvSettings>(DEFAULTS);
  useEffect(() => setSettings(read(sym)), [sym]);

  const update = (patch: Partial<CoinTvSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      write(sym, next);
      return next;
    });
  };

  return { settings, update };
}
