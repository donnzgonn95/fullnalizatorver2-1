import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertCircle, AlertTriangle, CheckCheck, Eye, Info, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  clearNotifHistory,
  markAllHistoryRead,
  markHistoryRead,
  useNotifHistory,
} from "@/lib/notifications";
import { useWatchlist } from "@/lib/watchlist";

import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/historia-alertow")({
  head: () => ({
    ...seoHead({
      title: "Historia wystrzelonych alertów",
      description: "Audyt wszystkich wystrzelonych alertów dla ulubionych krypto z filtrami po symbolu i statusie (przeczytane/nieprzeczytane).",
      path: "/historia-alertow",
    }),
  }),
  component: HistoryPage,
});

type StatusFilter = "all" | "unread" | "read";
type ScopeFilter = "favorites" | "all";

function HistoryPage() {
  const history = useNotifHistory();
  const { list: favorites } = useWatchlist();
  const favSet = useMemo(() => new Set(favorites.map((s) => s.toUpperCase())), [favorites]);
  const [scope, setScope] = useState<ScopeFilter>("favorites");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [symbol, setSymbol] = useState<string>("ALL");

  const scoped = useMemo(
    () => (scope === "favorites" ? history.filter((h) => favSet.has(h.symbol.toUpperCase())) : history),
    [history, scope, favSet],
  );

  const symbols = useMemo(() => {
    const s = new Set(scoped.map((h) => h.symbol.toUpperCase()));
    return Array.from(s).sort();
  }, [scoped]);

  const filtered = scoped.filter((h) => {
    if (symbol !== "ALL" && h.symbol.toUpperCase() !== symbol) return false;
    if (status === "unread" && h.readAt) return false;
    if (status === "read" && !h.readAt) return false;
    return true;
  });

  const unreadCount = scoped.filter((h) => !h.readAt).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Historia alertów</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Wystrzelone powiadomienia (cena/% zmiany/sygnały). Domyślnie tylko ulubione.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {scoped.length} wpisów · <span className="text-warning">{unreadCount} nieprzeczytanych</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={markAllHistoryRead}
            disabled={unreadCount === 0}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            <CheckCheck className="h-3 w-3" /> Oznacz wszystkie jako przeczytane
          </button>
          <button
            onClick={clearNotifHistory}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:text-bear"
          >
            <Trash2 className="h-3 w-3" /> Wyczyść
          </button>
        </div>
      </header>

      <section className="flex flex-wrap gap-2 rounded-xl border border-border bg-card p-3">
        <Group label="Zakres">
          <Tab active={scope === "favorites"} onClick={() => setScope("favorites")}>Ulubione</Tab>
          <Tab active={scope === "all"} onClick={() => setScope("all")}>Wszystkie</Tab>
        </Group>
        <Group label="Status">
          <Tab active={status === "all"} onClick={() => setStatus("all")}>Wszystkie</Tab>
          <Tab active={status === "unread"} onClick={() => setStatus("unread")}>Nieprzeczytane</Tab>
          <Tab active={status === "read"} onClick={() => setStatus("read")}>Przeczytane</Tab>
        </Group>
        <Group label="Symbol">
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="h-7 rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-primary"
          >
            <option value="ALL">Wszystkie</option>
            {symbols.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Group>
      </section>

      <section className="rounded-xl border border-border bg-card">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Brak alertów spełniających filtry.
            {scope === "favorites" && favSet.size === 0 && (
              <div className="mt-2 text-xs">
                Twoja watchlista jest pusta — dodaj coiny gwiazdką na <Link to="/" className="text-primary hover:underline">stronie głównej</Link>.
              </div>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((h) => {
              const Icon = h.level === "critical" ? AlertCircle : h.level === "warning" ? AlertTriangle : Info;
              const time = new Date(h.ts).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" });
              return (
                <li
                  key={h.id}
                  className={cn(
                    "flex items-start gap-3 p-3",
                    !h.readAt && "bg-primary/5",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      h.level === "critical" && "bg-bear/15 text-bear",
                      h.level === "warning" && "bg-warning/15 text-warning",
                      h.level === "info" && "bg-secondary text-muted-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="num">{time}</span>
                      <Link
                        to="/coin/$symbol"
                        params={{ symbol: h.symbol }}
                        className="rounded bg-secondary px-1.5 py-0.5 font-bold text-foreground hover:bg-primary/20"
                      >
                        {h.symbol}
                      </Link>
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                          h.level === "critical" && "bg-bear/20 text-bear",
                          h.level === "warning" && "bg-warning/20 text-warning",
                          h.level === "info" && "bg-muted",
                        )}
                      >
                        {h.level}
                      </span>
                      {h.muted && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">tryb cichy</span>
                      )}
                      {!h.readAt ? (
                        <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                          NOWY
                        </span>
                      ) : (
                        <span className="text-[10px] opacity-70">przeczytano</span>
                      )}
                    </div>
                    <p className="mt-1 text-sm">{h.body}</p>
                  </div>
                  {!h.readAt && (
                    <button
                      type="button"
                      onClick={() => markHistoryRead(h.id)}
                      className="inline-flex items-center gap-1 self-start rounded-md border border-border bg-background px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground"
                      aria-label="Oznacz jako przeczytane"
                    >
                      <Eye className="h-3 w-3" /> Przeczytaj
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}:</span>
      <div className="flex gap-1">{children}</div>
    </div>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-2.5 py-1 text-xs transition-colors",
        active ? "bg-primary text-primary-foreground" : "border border-border bg-background text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
