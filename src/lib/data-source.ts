// Persisted data-source selection with cross-component reactivity (useSyncExternalStore)
import { useSyncExternalStore } from "react";

export const DATA_SOURCES = ["binance", "coingecko", "cryptocompare"] as const;
export type DataSource = (typeof DATA_SOURCES)[number];

export const DATA_SOURCE_LABELS: Record<DataSource, string> = {
  binance: "Binance",
  coingecko: "CoinGecko",
  cryptocompare: "CryptoCompare",
};

const STORAGE_KEY = "cryptopuls.dataSource";
const DEFAULT: DataSource = "binance";

const listeners = new Set<() => void>();
let current: DataSource = DEFAULT;
let hydrated = false;

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const v = localStorage.getItem(STORAGE_KEY) as DataSource | null;
    if (v && (DATA_SOURCES as readonly string[]).includes(v)) current = v;
  } catch {
    // ignore
  }
}

function subscribe(cb: () => void) {
  hydrate();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): DataSource {
  hydrate();
  return current;
}

function getServerSnapshot(): DataSource {
  return DEFAULT;
}

export function setDataSource(next: DataSource) {
  current = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // ignore
  }
  listeners.forEach((l) => l());
}

export function useDataSource(): DataSource {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
