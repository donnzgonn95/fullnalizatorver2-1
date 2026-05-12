// Renders the user's watchlist as a compact card grid. Used on the home page.
import { Link } from "@tanstack/react-router";
import { Plus, Search, Star, X } from "lucide-react";
import { useWatchlist } from "@/lib/watchlist";
import { useTopCoins } from "@/lib/top-coins";
import { ChangePill, formatMoney } from "@/components/StatPill";
import { openCommandPalette as openPalette } from "@/lib/command-palette-bus";

export function WatchlistPanel() {
  const { list, remove } = useWatchlist();
  // Lazy: only fetch the heavy top-100 list when the user actually has favourites to enrich.
  const { data: coins } = useTopCoins(list.length > 0);

  if (!list.length) {
    return (
      <section
        data-testid="watchlist-empty-card"
        className="surface-glass rounded-xl border-dashed p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Star className="h-4 w-4 text-warning" />
            <span>
              Brak ulubionych. Dodaj coina, aby szybko śledzić cenę i alerty.
            </span>
          </div>
          <button
            type="button"
            onClick={openPalette}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" /> Dodaj coina
          </button>
        </div>
      </section>
    );
  }

  const items = list.map((sym) => {
    const c = coins?.find((x) => x.symbol === sym);
    return { sym, c };
  });

  return (
    <section className="surface-glass rounded-xl p-5" data-testid="watchlist-panel">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-warning" />
          <h2 className="text-lg font-bold">Ulubione</h2>
          <span className="num text-xs text-muted-foreground">({list.length})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={openPalette}
            data-testid="watchlist-add"
            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-semibold hover:bg-secondary"
          >
            <Plus className="h-3 w-3" /> Dodaj
          </button>
          <Link
            to="/ulubione"
            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <Search className="h-3 w-3" /> Wszystkie
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {items.map(({ sym, c }) => (
          <div key={sym} className="group relative rounded-lg border border-[var(--surface-glass-border)] bg-background/30 p-3 transition-all hover:border-[color-mix(in_oklab,var(--accent-mint)_35%,transparent)] hover:bg-background/50 hover:shadow-[var(--shadow-glow)]">
            <button
              type="button"
              onClick={() => remove(sym)}
              aria-label="Usuń"
              className="absolute right-1 top-1 hidden rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground group-hover:block"
            >
              <X className="h-3 w-3" />
            </button>
            <Link to="/coin/$symbol" params={{ symbol: sym }} className="block">
              <div className="flex items-center gap-2">
                {c?.image && <img src={c.image} alt="" width={20} height={20} className="h-5 w-5 rounded-full" />}
                <span className="text-sm font-bold">{sym}</span>
                {c && <ChangePill value={c.change24h} />}
              </div>
              <div className="num mt-1 text-base font-semibold">{c ? formatMoney(c.price) : "—"}</div>
              {c?.name && <div className="text-[11px] text-muted-foreground">{c.name}</div>}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
