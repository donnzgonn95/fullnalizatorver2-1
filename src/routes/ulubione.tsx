import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Star, X, Plus, Search, LayoutGrid, List as ListIcon, ArrowUpDown } from "lucide-react";
import { useWatchlist } from "@/lib/watchlist";
import { useTopCoins } from "@/lib/top-coins";
import { ChangePill, formatMoney } from "@/components/StatPill";
import { seoHead } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { openCommandPalette } from "@/lib/command-palette-bus";

export const Route = createFileRoute("/ulubione")({
  head: () => ({
    ...seoHead({
      title: "Ulubione krypto — Twoja watchlista",
      description: "Twoja lista obserwowanych kryptowalut: ceny na żywo, zmiana 24h, sortowanie i wyszukiwanie.",
      path: "/ulubione",
    }),
  }),
  component: UlubionePage,
});

const VIEW_KEY = "eljot-watchlist-view-v1";
const SORT_KEY = "eljot-watchlist-sort-v1";
type ViewMode = "grid" | "list";
type SortMode = "added" | "alpha" | "change-desc" | "change-asc" | "price-desc";

const SORT_LABEL: Record<SortMode, string> = {
  added: "Kolejność dodania",
  alpha: "Alfabetycznie A→Z",
  "change-desc": "Zmiana 24h ↓",
  "change-asc": "Zmiana 24h ↑",
  "price-desc": "Cena ↓",
};

function UlubionePage() {
  const { list, remove } = useWatchlist();
  const { data: coins } = useTopCoins();

  const [view, setView] = useState<ViewMode>("grid");
  const [sort, setSort] = useState<SortMode>("added");
  const [q, setQ] = useState("");

  // Hydratacja preferencji z localStorage.
  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    const v = localStorage.getItem(VIEW_KEY);
    if (v === "grid" || v === "list") setView(v);
    const s = localStorage.getItem(SORT_KEY) as SortMode | null;
    if (s && s in SORT_LABEL) setSort(s);
  }, []);

  useEffect(() => {
    if (typeof localStorage !== "undefined") localStorage.setItem(VIEW_KEY, view);
  }, [view]);
  useEffect(() => {
    if (typeof localStorage !== "undefined") localStorage.setItem(SORT_KEY, sort);
  }, [sort]);

  const items = useMemo(() => {
    const base = list.map((sym, idx) => ({ sym, idx, c: coins?.find((x) => x.symbol === sym) }));
    const term = q.trim().toLowerCase();
    const filtered = term
      ? base.filter(({ sym, c }) =>
          sym.toLowerCase().includes(term) || (c?.name?.toLowerCase().includes(term) ?? false),
        )
      : base;
    const sorted = [...filtered];
    switch (sort) {
      case "alpha":
        sorted.sort((a, b) => a.sym.localeCompare(b.sym));
        break;
      case "change-desc":
        sorted.sort((a, b) => (b.c?.change24h ?? -Infinity) - (a.c?.change24h ?? -Infinity));
        break;
      case "change-asc":
        sorted.sort((a, b) => (a.c?.change24h ?? Infinity) - (b.c?.change24h ?? Infinity));
        break;
      case "price-desc":
        sorted.sort((a, b) => (b.c?.price ?? -Infinity) - (a.c?.price ?? -Infinity));
        break;
      default:
        sorted.sort((a, b) => a.idx - b.idx);
    }
    return sorted;
  }, [list, coins, q, sort]);

  return (
    <div className="space-y-4" data-testid="watchlist-page">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-warning" />
          <h1 className="text-2xl font-bold">Ulubione</h1>
          <span className="num text-sm text-muted-foreground">({list.length})</span>
        </div>
        <button
          type="button"
          onClick={openCommandPalette}
          data-testid="watchlist-add-button"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-secondary"
        >
          <Plus className="h-3.5 w-3.5" /> Dodaj coina
        </button>
      </header>

      {list.length === 0 ? (
        <section
          data-testid="watchlist-empty"
          className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
            <Star className="h-6 w-6 text-warning" />
          </div>
          <h2 className="mt-3 text-lg font-bold">Brak ulubionych</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Dodaj coina, aby śledzić jego cenę i otrzymywać alerty tylko dla wybranych pozycji.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={openCommandPalette}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90"
            >
              <Search className="h-3.5 w-3.5" /> Znajdź coina (⌘K)
            </button>
            <Link
              to="/sila"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-secondary"
            >
              Przeglądaj ranking siły
            </Link>
          </div>
        </section>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/60 p-2">
            <div className="flex flex-1 items-center gap-1.5 rounded-md border border-border bg-background px-2 min-w-[180px]">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Filtruj ulubione…"
                data-testid="watchlist-filter"
                className="h-8 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              {q && (
                <button onClick={() => setQ("")} className="text-muted-foreground hover:text-foreground" aria-label="Wyczyść filtr">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <label className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs">
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortMode)}
                data-testid="watchlist-sort"
                className="h-6 cursor-pointer bg-transparent pr-1 text-xs outline-none"
                aria-label="Sortowanie"
              >
                {(Object.keys(SORT_LABEL) as SortMode[]).map((k) => (
                  <option key={k} value={k} className="bg-background">
                    {SORT_LABEL[k]}
                  </option>
                ))}
              </select>
            </label>

            <div role="tablist" aria-label="Widok" className="inline-flex rounded-md border border-border bg-background p-0.5">
              <button
                type="button"
                role="tab"
                aria-selected={view === "grid"}
                onClick={() => setView("grid")}
                data-testid="watchlist-view-grid"
                className={cn(
                  "inline-flex h-7 items-center gap-1 rounded px-2 text-xs",
                  view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Siatka
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === "list"}
                onClick={() => setView("list")}
                data-testid="watchlist-view-list"
                className={cn(
                  "inline-flex h-7 items-center gap-1 rounded px-2 text-xs",
                  view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <ListIcon className="h-3.5 w-3.5" /> Lista
              </button>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">
              Brak wyników dla „{q}”.
            </div>
          ) : view === "grid" ? (
            <ul data-testid="watchlist-grid" className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {items.map(({ sym, c }) => (
                <li key={sym} className="group relative rounded-xl border border-border bg-card p-3">
                  <button
                    type="button"
                    onClick={() => remove(sym)}
                    aria-label={`Usuń ${sym}`}
                    data-testid={`watchlist-remove-${sym}`}
                    className="absolute right-1.5 top-1.5 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-secondary hover:text-foreground group-hover:opacity-100 focus:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <Link to="/coin/$symbol" params={{ symbol: sym }} data-testid={`watchlist-link-${sym}`} className="block">
                    <div className="flex items-center gap-2">
                      {c?.image && <img src={c.image} alt="" width={20} height={20} className="h-5 w-5 rounded-full" />}
                      <span className="text-sm font-bold">{sym}</span>
                      {c && <ChangePill value={c.change24h} />}
                    </div>
                    <div className="num mt-1 text-base font-semibold">{c ? formatMoney(c.price) : "—"}</div>
                    {c?.name && <div className="truncate text-[11px] text-muted-foreground">{c.name}</div>}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <ul data-testid="watchlist-list" className="overflow-hidden rounded-xl border border-border bg-card">
              <li className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 border-b border-border bg-background/40 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <span>Symbol</span>
                <span className="text-right">Cena</span>
                <span className="text-right">24h</span>
                <span className="w-6" />
              </li>
              {items.map(({ sym, c }) => (
                <li
                  key={sym}
                  className="group grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 border-b border-border/60 px-3 py-2 last:border-b-0 hover:bg-secondary/30"
                >
                  <Link
                    to="/coin/$symbol"
                    params={{ symbol: sym }}
                    data-testid={`watchlist-link-${sym}`}
                    className="flex min-w-0 items-center gap-2"
                  >
                    {c?.image && <img src={c.image} alt="" width={18} height={18} className="h-4 w-4 rounded-full" />}
                    <span className="text-sm font-bold">{sym}</span>
                    {c?.name && <span className="truncate text-[11px] text-muted-foreground">{c.name}</span>}
                  </Link>
                  <span className="num text-sm font-semibold">{c ? formatMoney(c.price) : "—"}</span>
                  <span className="text-right">{c ? <ChangePill value={c.change24h} /> : "—"}</span>
                  <button
                    type="button"
                    onClick={() => remove(sym)}
                    aria-label={`Usuń ${sym}`}
                    data-testid={`watchlist-remove-${sym}`}
                    className="rounded p-1 text-muted-foreground opacity-0 hover:bg-secondary hover:text-foreground group-hover:opacity-100 focus:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
