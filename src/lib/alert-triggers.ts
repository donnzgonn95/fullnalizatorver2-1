// Per-coin price alert triggers ("above"/"below" thresholds + percent change).
// Stored in localStorage; checked by useAlertNotifications against live prices.
//
// Re-arming model:
//   Re-arm jest **per wyzwalacz** (czyli per coin + per poziom/kierunek), nie globalny.
//   Trigger przechodzi w stan "armed=false" po wystrzeleniu i wraca do "armed=true"
//   dopiero gdy cena wróci na drugą stronę progu (histerezis). Dzięki temu jeden coin
//   z kilkoma poziomami nie blokuje pozostałych poziomów / pozostałych coinów.
import { useEffect, useState } from "react";

export type Trigger =
  | {
      id: string;
      kind: "price";
      symbol: string;
      side: "above" | "below";
      price: number;
      enabled: boolean;
      armed?: boolean;
      createdAt: number;
    }
  | {
      id: string;
      kind: "pct";
      symbol: string;
      /** Reference price snapshot taken when the trigger was created. */
      refPrice: number;
      /** Percent above ref to fire (e.g. 5 for +5%). Optional. */
      pctUp?: number;
      /** Percent below ref to fire (e.g. 3 for -3%). Optional. */
      pctDown?: number;
      enabled: boolean;
      /** Per-direction armed flags, default true. */
      armedUp?: boolean;
      armedDown?: boolean;
      createdAt: number;
    };

const KEY = "alert-triggers:v1";
const FIRED_KEY = "alert-triggers:fired:v1";
const EVT = "alert-triggers:changed";

export function readTriggers(): Trigger[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as Trigger[];
    // Backfill kind for legacy entries persisted before pct support.
    return arr.map((t) => (t.kind ? t : ({ ...(t as Trigger), kind: "price" } as Trigger)));
  } catch {
    return [];
  }
}

function write(list: Trigger[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function writeTriggers(list: Trigger[]) {
  write(list);
}

export function readFired(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(FIRED_KEY) || "{}");
  } catch {
    return {};
  }
}

export function writeFired(map: Record<string, number>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FIRED_KEY, JSON.stringify(map));
}

export function useTriggers(symbol?: string) {
  const [list, setList] = useState<Trigger[]>([]);
  useEffect(() => {
    const reload = () => setList(readTriggers());
    reload();
    window.addEventListener(EVT, reload);
    window.addEventListener("storage", reload);
    return () => {
      window.removeEventListener(EVT, reload);
      window.removeEventListener("storage", reload);
    };
  }, []);

  const filtered = symbol ? list.filter((t) => t.symbol === symbol.toUpperCase()) : list;

  const add = (t: Omit<Extract<Trigger, { kind: "price" }>, "id" | "createdAt" | "enabled" | "kind"> & { enabled?: boolean }) => {
    const next: Trigger = {
      kind: "price",
      symbol: t.symbol.toUpperCase(),
      side: t.side,
      price: t.price,
      enabled: t.enabled ?? true,
      armed: true,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
    };
    const all = [...readTriggers(), next];
    write(all);
    setList(all);
  };

  const addPct = (params: { symbol: string; refPrice: number; pctUp?: number; pctDown?: number; enabled?: boolean }) => {
    const next: Trigger = {
      kind: "pct",
      symbol: params.symbol.toUpperCase(),
      refPrice: params.refPrice,
      pctUp: params.pctUp,
      pctDown: params.pctDown,
      enabled: params.enabled ?? true,
      armedUp: true,
      armedDown: true,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
    };
    const all = [...readTriggers(), next];
    write(all);
    setList(all);
  };

  const remove = (id: string) => {
    const all = readTriggers().filter((t) => t.id !== id);
    write(all);
    setList(all);
  };
  const toggle = (id: string) => {
    const all = readTriggers().map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t));
    write(all);
    setList(all);
  };

  const setAllForSymbol = (sym: string, enabled: boolean) => {
    const S = sym.toUpperCase();
    const all = readTriggers().map((t) => (t.symbol === S ? { ...t, enabled } : t));
    write(all);
    setList(all);
  };

  return { list: filtered, all: list, add, addPct, remove, toggle, setAllForSymbol };
}
