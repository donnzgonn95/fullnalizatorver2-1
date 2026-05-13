import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { macroIndicators } from "@/lib/gielda/mock-macro";
import type { MacroIndicator } from "@/lib/gielda/types";
import { seoHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/gielda/makro")({
  head: () => ({
    ...seoHead({
      title: "Makroekonomia — wskaźniki USA i Europa",
      description: "CPI, stopy procentowe, rentowności, VIX, EUR/USD i inne wskaźniki — z opisem, znaczeniem i wpływem na rynek.",
      path: "/gielda/makro",
    }),
  }),
  component: MakroPage,
});

const CATEGORIES = [
  "Inflacja", "Stopy", "Obligacje", "Rynek pracy",
  "Aktywność", "Sentyment", "Waluty", "Surowce",
] as const;

function MakroPage() {
  const [cat, setCat] = useState<"all" | (typeof CATEGORIES)[number]>("all");

  const grouped = useMemo(() => {
    const filtered = cat === "all" ? macroIndicators : macroIndicators.filter((m) => m.category === cat);
    const map = new Map<string, MacroIndicator[]>();
    for (const m of filtered) {
      const k = m.category ?? "Inne";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(m);
    }
    return [...map.entries()];
  }, [cat]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Makro</div>
          <h1 className="mt-1 text-2xl font-bold">Otoczenie makroekonomiczne</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Każdy wskaźnik z polskim tłumaczeniem, opisem, znaczeniem dla rynku i interpretacją wpływu.
          </p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-md border border-border bg-card p-1 text-xs">
          <button onClick={() => setCat("all")}
            className={`rounded px-2 py-1 ${cat === "all" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            Wszystkie
          </button>
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCat(c)}
              className={`rounded px-2 py-1 ${cat === c ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              {c}
            </button>
          ))}
        </div>
      </header>

      {grouped.map(([category, list]) => (
        <section key={category} className="space-y-3">
          <div className="flex items-baseline justify-between border-b border-border pb-2">
            <h2 className="text-sm font-bold uppercase tracking-wider">{category}</h2>
            <span className="text-[11px] text-muted-foreground">{list.length} wskaźników</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((m) => <MacroCard key={m.id} m={m} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

function MacroCard({ m }: { m: MacroIndicator }) {
  const trendIcon = m.trend === "rising" ? "▲" : m.trend === "falling" ? "▼" : "▬";
  const trendCls = m.trend === "rising" ? "text-bull" : m.trend === "falling" ? "text-bear" : "text-muted-foreground";
  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{m.region}</div>
          <div className="text-sm font-bold">{m.name}</div>
          {m.nameEn && <div className="text-[10px] italic text-muted-foreground">{m.nameEn}</div>}
        </div>
        <span className={cn(
          "rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
          m.interpretation === "positive" && "bg-bull/20 text-bull",
          m.interpretation === "negative" && "bg-bear/20 text-bear",
          m.interpretation === "neutral" && "bg-muted text-muted-foreground",
        )}>{m.interpretation}</span>
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <div className="num text-2xl font-semibold">{m.value}{m.unit}</div>
        <div className={cn("num text-xs", m.change > 0 ? "text-bull" : m.change < 0 ? "text-bear" : "text-muted-foreground")}>
          Δ {m.change > 0 ? "+" : ""}{m.change}{m.unit}
        </div>
        {m.trend && <span className={cn("text-xs", trendCls)} title={`Trend: ${m.trend}`}>{trendIcon}</span>}
      </div>
      <div className="text-[10px] text-muted-foreground">{m.asOf}{m.target != null && ` · cel ${m.target}${m.unit}`}{m.source && ` · ${m.source}`}</div>

      {m.description && (
        <div className="mt-3 rounded-md border border-border bg-background/40 p-2 text-xs">
          <div className="text-[9px] font-semibold uppercase text-muted-foreground">Co to jest</div>
          <p className="mt-0.5 text-foreground/90">{m.description}</p>
        </div>
      )}
      {m.whyItMatters && (
        <div className="mt-2 rounded-md border border-border bg-background/40 p-2 text-xs">
          <div className="text-[9px] font-semibold uppercase text-muted-foreground">Dlaczego ważne</div>
          <p className="mt-0.5 text-foreground/90">{m.whyItMatters}</p>
        </div>
      )}
      {m.impact && (
        <div className="mt-2 rounded-md border border-primary/20 bg-primary/5 p-2 text-xs">
          <div className="text-[9px] font-semibold uppercase text-primary">Wpływ na rynek</div>
          <p className="mt-0.5 text-foreground/90">{m.impact}</p>
        </div>
      )}
      {m.note && <p className="mt-2 text-xs text-muted-foreground">{m.note}</p>}
    </article>
  );
}
