import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { gieldaStorage } from "@/lib/gielda/storage";
import { usStocks, euStocks } from "@/lib/gielda/mock-indices";
import { etfs } from "@/lib/gielda/mock-etfs";
import { Star, X } from "lucide-react";
import { seoHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/gielda/watchlista")({
  head: () => ({
    ...seoHead({
      title: "Watchlista giełdowa",
      description: "Twoja lista obserwowanych akcji i ETF-ów. Dodaj symbol i obserwuj zmiany.",
      path: "/gielda/watchlista",
    }),
  }),
  component: WatchlistPage,
});

const universe = [
  ...usStocks.map((s) => ({ symbol: s.symbol, name: s.name, change1d: s.change1d, ytd: s.changeYtd, kind: "Akcja USA" })),
  ...euStocks.map((s) => ({ symbol: s.symbol, name: s.name, change1d: s.change1d, ytd: s.changeYtd, kind: "Akcja EU" })),
  ...etfs.map((e) => ({ symbol: e.symbol, name: e.name, change1d: e.change1d, ytd: e.ytd, kind: "ETF" })),
];

function WatchlistPage() {
  const [list, setList] = useState<string[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => { setList(gieldaStorage.getWatchlist()); }, []);

  const persist = (next: string[]) => { setList(next); gieldaStorage.setWatchlist(next); };
  const add = (sym: string) => { if (list.includes(sym)) return; persist([sym, ...list]); };
  const remove = (sym: string) => persist(list.filter((s) => s !== sym));

  const filtered = q
    ? universe.filter((u) => u.symbol.toLowerCase().includes(q.toLowerCase()) || u.name.toLowerCase().includes(q.toLowerCase()))
    : universe.slice(0, 10);

  const items = list.map((s) => universe.find((u) => u.symbol === s)).filter(Boolean) as typeof universe;

  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Watchlista</div>
        <h1 className="mt-1 text-2xl font-bold">Obserwowane symbole</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Trzymane lokalnie. Po podłączeniu konta — zostaną zsynchronizowane do tabeli <code>stock_watchlist</code>.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">Twoja lista ({items.length})</h2>
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground">Brak symboli. Dodaj coś z listy poniżej.</div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((u) => (
              <li key={u.symbol} className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-bold">{u.symbol} <span className="ml-1 text-[10px] uppercase text-muted-foreground">{u.kind}</span></div>
                  <div className="text-[11px] text-muted-foreground">{u.name}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn("num text-sm font-bold", u.change1d >= 0 ? "text-bull" : "text-bear")}>{u.change1d.toFixed(1)}%</span>
                  <button onClick={() => remove(u.symbol)} className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">Dodaj z bazy</h2>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Szukaj po symbolu lub nazwie…"
          className="mb-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <ul className="divide-y divide-border">
          {filtered.map((u) => (
            <li key={u.symbol} className="flex items-center justify-between py-2">
              <div>
                <div className="text-sm font-bold">{u.symbol} <span className="ml-1 text-[10px] uppercase text-muted-foreground">{u.kind}</span></div>
                <div className="text-[11px] text-muted-foreground">{u.name}</div>
              </div>
              <button
                onClick={() => add(u.symbol)}
                disabled={list.includes(u.symbol)}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-secondary disabled:opacity-40"
              >
                <Star className="h-3 w-3" /> Dodaj
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
