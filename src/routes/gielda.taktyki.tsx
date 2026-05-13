import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
  const [riskFilter, setRiskFilter] = useState<"all" | "niskie" | "średnie" | "wysokie">("all");
  const filtered = useMemo(
    () => (riskFilter === "all" ? tactics : tactics.filter((t) => t.risk === riskFilter)),
    [riskFilter],
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Taktyki</div>
          <h1 className="mt-1 text-2xl font-bold">Strategie inwestycyjne</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Materiał edukacyjny — nie stanowi rekomendacji inwestycyjnej.
          </p>
        </div>
        <div className="flex gap-1 rounded-md border border-border bg-card p-1 text-xs">
          {(["all", "niskie", "średnie", "wysokie"] as const).map((r) => (
            <button key={r} onClick={() => setRiskFilter(r)}
              className={`rounded px-2 py-1 ${riskFilter === r ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              {r === "all" ? "Wszystkie" : `Ryzyko ${r}`}
            </button>
          ))}
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        {filtered.map((t) => (
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

            {t.longDescription && (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground/90">{t.longDescription}</p>
            )}

            {t.instruments && t.instruments.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {t.instruments.map((i) => (
                  <span key={i} className="rounded bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary">{i}</span>
                ))}
              </div>
            )}

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

            {(t.pros || t.cons) && (
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {t.pros && (
                  <div className="rounded-md border border-bull/20 bg-bull/5 p-2">
                    <div className="text-[10px] font-semibold uppercase text-bull">Plusy</div>
                    <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs">{t.pros.map((p, i) => <li key={i}>{p}</li>)}</ul>
                  </div>
                )}
                {t.cons && (
                  <div className="rounded-md border border-bear/20 bg-bear/5 p-2">
                    <div className="text-[10px] font-semibold uppercase text-bear">Minusy</div>
                    <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs">{t.cons.map((p, i) => <li key={i}>{p}</li>)}</ul>
                  </div>
                )}
              </div>
            )}

            {t.parameters && t.parameters.length > 0 && (
              <details className="mt-3 rounded border border-border bg-background/40 p-2">
                <summary className="cursor-pointer text-xs uppercase tracking-wider text-muted-foreground">Parametry strategii</summary>
                <div className="mt-2 grid gap-1.5 text-xs">
                  {t.parameters.map((p, i) => (
                    <div key={i} className="flex items-baseline justify-between gap-2 border-b border-border/50 pb-1 last:border-0">
                      <span className="font-semibold">{p.name}</span>
                      <span className="num text-muted-foreground">{p.value}</span>
                      {p.description && <span className="basis-full text-[10px] text-muted-foreground/80">{p.description}</span>}
                    </div>
                  ))}
                </div>
              </details>
            )}

            {t.dependencies && t.dependencies.length > 0 && (
              <details className="mt-2 rounded border border-border bg-background/40 p-2">
                <summary className="cursor-pointer text-xs uppercase tracking-wider text-muted-foreground">Zależności</summary>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                  {t.dependencies.map((d, i) => <li key={i}>{d}</li>)}
                </ul>
              </details>
            )}

            {t.examples && t.examples.length > 0 && (
              <details className="mt-2 rounded border border-border bg-background/40 p-2">
                <summary className="cursor-pointer text-xs uppercase tracking-wider text-muted-foreground">Przykłady historyczne</summary>
                <ul className="mt-2 space-y-1.5 text-xs">
                  {t.examples.map((e, i) => (
                    <li key={i} className="rounded bg-background/60 p-2">
                      <div className="font-mono text-[10px] text-muted-foreground">{e.date}</div>
                      <div className="text-foreground">{e.setup}</div>
                      <div className="text-muted-foreground">→ {e.outcome}</div>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {(t.capitalRequirement || t.timeCommitment || t.marketRegime) && (
              <details className="mt-2 rounded border border-border bg-background/40 p-2">
                <summary className="cursor-pointer text-xs uppercase tracking-wider text-muted-foreground">Wymagania i kontekst</summary>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {t.capitalRequirement && <div><b className="text-foreground">Kapitał:</b> {t.capitalRequirement}</div>}
                  {t.timeCommitment && <div><b className="text-foreground">Czas:</b> {t.timeCommitment}</div>}
                  {t.marketRegime && (
                    <div className="flex flex-wrap items-center gap-1">
                      <b className="text-foreground">Reżim rynku:</b>
                      {t.marketRegime.map((m) => (
                        <span key={m} className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">{m}</span>
                      ))}
                    </div>
                  )}
                  {t.source && <div><b className="text-foreground">Źródło:</b> {t.source}</div>}
                </div>
              </details>
            )}

            {t.observations.length > 0 && (
              <details className="mt-2 rounded border border-border bg-background/40 p-2">
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
