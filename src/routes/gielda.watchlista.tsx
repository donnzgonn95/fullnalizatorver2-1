import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/gielda/RequireAuth";
import { useAuth } from "@/components/auth/AuthProvider";
import { addWatchlistSymbol, listWatchlist, removeWatchlistSymbol } from "@/lib/gielda/repo";
import { usStocks, euStocks } from "@/lib/gielda/mock-indices";
import { etfs } from "@/lib/gielda/mock-etfs";
import { Star, X, Loader2 } from "lucide-react";
import { seoHead } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/gielda/watchlista")({
  head: () => ({
    ...seoHead({
      title: "Watchlista giełdowa",
      description: "Twoja lista obserwowanych akcji i ETF-ów (zapis w bazie z RLS).",
      path: "/gielda/watchlista",
    }),
  }),
  component: () => <RequireAuth><WatchlistPage /></RequireAuth>,
});

const universe = [
  ...usStocks.map((s) => ({ symbol: s.symbol, name: s.name, change1d: s.change1d, kind: "Akcja USA", market: "USA" })),
  ...euStocks.map((s) => ({ symbol: s.symbol, name: s.name, change1d: s.change1d, kind: "Akcja EU", market: "EU" })),
  ...etfs.map((e) => ({ symbol: e.symbol, name: e.name, change1d: e.change1d, kind: "ETF", market: "ETF" })),
];

function WatchlistPage() {
  const { user } = useAuth();
  const [list, setList] = useState<{ symbol: string; market: string | null }[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const rows = await listWatchlist();
      setList(rows.map((r: any) => ({ symbol: r.symbol, market: r.market })));
    } catch (e: any) {
      toast.error(e.message ?? "Błąd ładowania");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, []);

  const add = async (sym: string, market: string) => {
    if (!user) return;
    if (list.find((x) => x.symbol === sym)) return;
    try {
      await addWatchlistSymbol(user.id, sym, market);
      await refresh();
    } catch (e: any) { toast.error(e.message); }
  };
  const remove = async (sym: string) => {
    try { await removeWatchlistSymbol(sym); await refresh(); }
    catch (e: any) { toast.error(e.message); }
  };

  const filtered = q
    ? universe.filter((u) => u.symbol.toLowerCase().includes(q.toLowerCase()) || u.name.toLowerCase().includes(q.toLowerCase()))
    : universe.slice(0, 10);

  const items = list.map((s) => ({ ...universe.find((u) => u.symbol === s.symbol), symbol: s.symbol })).filter((u) => u.name);

  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Watchlista</div>
        <h1 className="mt-1 text-2xl font-bold">Obserwowane symbole</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Zapis w bazie (tabela <code>stock_watchlist</code>) z RLS per-user.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Twoja lista ({items.length})
        </h2>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Ładuję…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground">Brak symboli. Dodaj coś z listy poniżej.</div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((u: any) => (
              <li key={u.symbol} className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-bold">{u.symbol} <span className="ml-1 text-[10px] uppercase text-muted-foreground">{u.kind}</span></div>
                  <div className="text-[11px] text-muted-foreground">{u.name}</div>
                </div>
                <div className="flex items-center gap-3">
                  {typeof u.change1d === "number" && (
                    <span className={cn("num text-sm font-bold", u.change1d >= 0 ? "text-bull" : "text-bear")}>{u.change1d.toFixed(1)}%</span>
                  )}
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
          {filtered.map((u) => {
            const exists = !!list.find((x) => x.symbol === u.symbol);
            return (
              <li key={u.symbol} className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-bold">{u.symbol} <span className="ml-1 text-[10px] uppercase text-muted-foreground">{u.kind}</span></div>
                  <div className="text-[11px] text-muted-foreground">{u.name}</div>
                </div>
                <button
                  onClick={() => add(u.symbol, u.market)}
                  disabled={exists}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-secondary disabled:opacity-40"
                >
                  <Star className="h-3 w-3" /> Dodaj
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
