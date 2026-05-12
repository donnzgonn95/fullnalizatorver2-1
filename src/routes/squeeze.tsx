import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Loader2, Radio, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLiveCoins } from "@/lib/binance";
import { coins as demoCoins } from "@/lib/demo-data";
import { buildSqueezeRows, type SqueezeMode, type SqueezeRow } from "@/lib/squeeze";
import { SqueezeScale } from "@/components/SqueezeScale";
import { ChangePill } from "@/components/StatPill";
import { seoHead } from "@/lib/seo";
import { DataBadge } from "@/components/DataBadge";

export const Route = createFileRoute("/squeeze")({
  head: () => ({
    ...seoHead({
      title: "Squeeze Radar — long & short",
      description: "Skanuje rynek pod kątem ryzyka long squeeze i szansy short squeeze. Scoring 0–100 z wizualną skalą i progami kolorystycznymi.",
      path: "/squeeze",
    }),
  }),
  component: SqueezePage,
});

function SqueezePage() {
  const [mode, setMode] = useState<SqueezeMode>("short");
  const { data: coins, isLoading, isError, dataUpdatedAt } = useLiveCoins();
  const source = coins && coins.length ? coins : demoCoins;

  const rows = useMemo(() => buildSqueezeRows(source, mode), [source, mode]);
  const top = rows.slice(0, 6);
  const updated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString("pl-PL") : "";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold">Squeeze Radar</h1>
            <DataBadge kind="proxy" />
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Heurystyczny scoring 0–100 dla setupów squeezowych. 6 składowych: funding, OI, L/S, klastry likwidacji, struktura,
            reżim rynku. Tryby działają lustrzanie — short szuka uwięzionych shortów, long ostrzega przed kaskadą longów.
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs">
            {isLoading ? (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Ładowanie...
              </span>
            ) : isError ? (
              <span className="text-bear">Błąd API — pokazuję dane DEMO</span>
            ) : (
              <span className="inline-flex items-center gap-1 text-bull">
                <Radio className="h-3 w-3 animate-pulse" /> LIVE · aktualizacja {updated}
              </span>
            )}
          </div>
        </div>

        <div role="tablist" aria-label="Tryb squeeze" className="flex gap-1 rounded-lg border border-border bg-card p-1">
          {(["short", "long"] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                mode === m
                  ? m === "short" ? "bg-bull/20 text-bull" : "bg-bear/20 text-bear"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m === "short" ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {m === "short" ? "Short squeeze" : "Long squeeze"}
            </button>
          ))}
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        {top.map((r) => (
          <SqueezeCard key={r.symbol} row={r} mode={mode} />
        ))}
      </section>
    </div>
  );
}

function SqueezeCard({ row, mode }: { row: SqueezeRow; mode: SqueezeMode }) {
  return (
    <article className="rounded-xl border border-border bg-card p-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{row.name}</div>
          <div className="mt-0.5 text-xl font-bold">{row.symbol}</div>
        </div>
        <div className="flex items-center gap-2">
          <ChangePill value={row.change24h} />
          <span
            className={cn(
              "rounded px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
              row.verdict.tone === "bull" && "bg-bull/20 text-bull",
              row.verdict.tone === "bear" && "bg-bear/20 text-bear",
              row.verdict.tone === "warning" && "bg-warning/20 text-warning",
              row.verdict.tone === "neutral" && "bg-muted text-muted-foreground",
            )}
          >
            {row.verdict.label}
          </span>
        </div>
      </header>

      <div className="mt-5">
        <SqueezeScale value={row.total} label={`Squeeze ${mode} score for ${row.symbol}`} />
      </div>

      <div className="mt-5 space-y-2">
        {row.components.map((c) => {
          const pct = Math.round((c.score / c.weight) * 100);
          return (
            <div key={c.key} className="grid grid-cols-[1fr_auto] items-center gap-2">
              <div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="font-medium text-foreground">{c.label}</span>
                  <span className="num text-muted-foreground">
                    {c.score}/{c.weight}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full transition-[width]",
                      pct >= 70 ? "bg-bear" : pct >= 50 ? "bg-warning" : pct >= 30 ? "bg-primary/80" : "bg-muted-foreground/40",
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">{c.detail}</div>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
