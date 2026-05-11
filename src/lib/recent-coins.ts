// Lekkie śledzenie ostatnio oglądanych coinów (LRU, max 8) — w localStorage.
const KEY = "eljot-recent-coins-v1";
const MAX = 8;

export function getRecentCoins(): string[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function pushRecentCoin(symbol: string) {
  if (typeof localStorage === "undefined") return;
  const sym = symbol.toUpperCase();
  const prev = getRecentCoins().filter((s) => s !== sym);
  const next = [sym, ...prev].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* noop */
  }
}
