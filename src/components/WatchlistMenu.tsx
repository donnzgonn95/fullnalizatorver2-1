// Compact dropdown listing watchlist symbols, with search + quick navigation
// + a switch to receive alerts only for favorites.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, BellOff, Search, Star, X } from "lucide-react";
import { useWatchlist } from "@/lib/watchlist";
import { useTopCoins } from "@/lib/top-coins";
import { useNotifSettings, setNotifSettings } from "@/lib/notifications";
import { cn } from "@/lib/utils";

export function WatchlistMenu({ className }: { className?: string }) {
  const { list, remove } = useWatchlist();
  const { data: coins } = useTopCoins();
  const settings = useNotifSettings();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return list;
    return list.filter((sym) => {
      if (sym.toLowerCase().includes(term)) return true;
      const c = coins?.find((x) => x.symbol === sym);
      return c?.name?.toLowerCase().includes(term) ?? false;
    });
  }, [list, q, coins]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Ulubione"
        className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-card px-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <Star className={cn("h-3.5 w-3.5", list.length > 0 && "fill-warning text-warning")} />
        <span className="num">{list.length}</span>
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 w-80 overflow-hidden rounded-lg border border-border bg-popover shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground">
            <span>Ulubione ({list.length})</span>
            <button
              type="button"
              onClick={() => setNotifSettings({ watchlistOnly: !settings.watchlistOnly })}
              title={settings.watchlistOnly ? "Alerty: tylko ulubione" : "Alerty: wszystkie symbole"}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-bold normal-case tracking-normal",
                settings.watchlistOnly
                  ? "border-warning/40 bg-warning/10 text-warning"
                  : "border-border bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              {settings.watchlistOnly ? <Bell className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
              {settings.watchlistOnly ? "Alerty: tylko ulubione" : "Alerty: wszystkie"}
            </button>
          </div>
          <div className="border-b border-border p-2">
            <div className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2">
              <Search className="h-3 w-3 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Szukaj w ulubionych…"
                className="h-7 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
              />
              {q && (
                <button onClick={() => setQ("")} className="text-muted-foreground hover:text-foreground" aria-label="Wyczyść">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
          {list.length === 0 ? (
            <div className="px-3 py-4 text-xs text-muted-foreground">
              Pusto. Otwórz coina i kliknij <span className="font-semibold text-foreground">„Dodaj do ulubionych”</span>.
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-4 text-xs text-muted-foreground">Brak wyników dla „{q}”.</div>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {filtered.map((sym) => {
                const c = coins?.find((x) => x.symbol === sym);
                return (
                  <li key={sym} className="group flex items-center gap-2 px-2 py-1 hover:bg-secondary/60">
                    <Link
                      to="/coin/$symbol"
                      params={{ symbol: sym }}
                      onClick={() => setOpen(false)}
                      className="flex flex-1 items-center gap-2 rounded px-1 py-1 text-sm"
                    >
                      {c?.image && <img src={c.image} alt="" width={18} height={18} className="h-4 w-4 rounded-full" />}
                      <span className="font-semibold">{sym}</span>
                      {c?.name && <span className="truncate text-[11px] text-muted-foreground">{c.name}</span>}
                      {c && (
                        <span className={cn("num ml-auto text-xs", c.change24h >= 0 ? "text-bull" : "text-bear")}>
                          {c.change24h >= 0 ? "+" : ""}
                          {c.change24h.toFixed(2)}%
                        </span>
                      )}
                    </Link>
                    <button
                      type="button"
                      onClick={() => remove(sym)}
                      aria-label="Usuń"
                      className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-secondary hover:text-foreground group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
