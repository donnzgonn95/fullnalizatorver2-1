import { createFileRoute } from "@tanstack/react-router";
import { tactics } from "@/lib/gielda/mock-tactics";
import { seoHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/gielda/taktyki")({
  head: () => ({
    ...seoHead({
      title: "Taktyki inwestycyjne — strategie i warunki",
      description: "Zestaw strategii: trend following, mean reversion, rotacja sektorowa, dywidendy, DCA, hedge — kiedy działa, kiedy nie.",
      path: "/gielda/taktyki",
    }),
  }),
  component: TaktykiPage,
});

function TaktykiPage() {
  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Taktyki</div>
        <h1 className="mt-1 text-2xl font-bold">Strategie inwestycyjne</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Materiał edukacyjny — nie stanowi rekomendacji inwestycyjnej.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        {tactics.map((t) => (
          <article key={t.id} className="rounded-xl border border-border bg-card p-5">
            <header className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold">{t.name}</h2>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                  t.risk === "niskie" && "bg-bull/20 text-bull",
                  t.risk === "średnie" && "bg-warning/20 text-warning",
                  t.risk === "wysokie" && "bg-bear/20 text-bear",
                )}>ryzyko {t.risk}</span>
                <span className="rounded bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">{t.horizon}</span>
              </div>
            </header>
            <p className="mt-2 text-sm text-muted-foreground">{t.description}</p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Block title="Wejście" items={t.entryRules} tone="bull" />
              <Block title="Wyjście" items={t.exitRules} tone="bear" />
            </div>

            <div className="mt-4 grid gap-2 text-sm">
              <KV k="Działa, gdy" v={t.worksWhen} />
              <KV k="Nie działa, gdy" v={t.failsWhen} />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-border bg-background/40 p-3 text-center text-xs">
              <div><div className="text-muted-foreground">Win rate</div><div className="num font-bold text-bull">{t.backtest.winRate}%</div></div>
              <div><div className="text-muted-foreground">Avg RR</div><div className="num font-bold">{t.backtest.avgRR}</div></div>
              <div><div className="text-muted-foreground">Trades</div><div className="num font-bold">{t.backtest.trades}</div></div>
            </div>

            {t.observations.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs uppercase tracking-wider text-muted-foreground">Dziennik obserwacji</summary>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                  {t.observations.map((o, i) => <li key={i}>{o}</li>)}
                </ul>
              </details>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}

function Block({ title, items, tone }: { title: string; items: string[]; tone: "bull" | "bear" }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className={cn("text-xs font-semibold uppercase tracking-wider", tone === "bull" ? "text-bull" : "text-bear")}>{title}</div>
      <ul className="mt-2 space-y-1 text-sm">
        {items.map((s, i) => (
          <li key={i} className="flex gap-2">
            <span className={cn("mt-1.5 h-1 w-1 rounded-full", tone === "bull" ? "bg-bull" : "bg-bear")} />
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="text-sm">
      <span className="font-semibold">{k}: </span>
      <span className="text-muted-foreground">{v}</span>
    </div>
  );
}
