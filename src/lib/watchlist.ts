// Watchlist store — localStorage-backed, SSR-safe (empty on server, hydrate on mount).
import { useEffect, useState } from "react";

const KEY = "watchlist:v1";
const EVT = "watchlist:changed";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

function write(list: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function useWatchlist() {
  const [list, setList] = useState<string[]>([]);
  useEffect(() => {
    const reload = () => setList(read());
    reload();
    window.addEventListener(EVT, reload);
    window.addEventListener("storage", reload);
    return () => {
      window.removeEventListener(EVT, reload);
      window.removeEventListener("storage", reload);
    };
  }, []);

  const has = (sym: string) => list.includes(sym.toUpperCase());
  const toggle = (sym: string) => {
    const s = sym.toUpperCase();
    const cur = read();
    const next = cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s];
    write(next);
    setList(next);
  };
  const remove = (sym: string) => {
    const s = sym.toUpperCase();
    const next = read().filter((x) => x !== s);
    write(next);
    setList(next);
  };

  return { list, has, toggle, remove };
}
