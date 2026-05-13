import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { etfs } from "@/lib/gielda/mock-etfs";
import type { Etf } from "@/lib/gielda/types";
import { seoHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/gielda/etf")({
  head: () => ({
    ...seoHead({
      title: "ETF i fundusze — grupy i scoring",
      description: "Najważniejsze ETF-y akcyjne, sektorowe, regionowe, surowcowe i obligacyjne — pogrupowane wg kategorii z zaawansowanym scoringiem.",
      path: "/gielda/etf",
    }),
  }),
  component: EtfPage,
});

const CATEGORY_ORDER = [
  "Szeroki rynek USA",
  "Sektor: Technology",
  "Sektor: Financials",
  "Sektor: Healthcare",
  "Sektor: Consumer Discretionary",
  "Sektor: Energy",
  "Region: Europa",
  "Surowce",
  "Obligacje",
  "Tematyczne",
];

function EtfPage() {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"score" | "ytd" | "aum">("score");

  const grouped = useMemo(() => {
    const q = query.toLowerCase();
    const filtered = etfs.filter((e) =>
      !q ||
      e.symbol.toLowerCase().includes(q) ||
      e.name.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      (e.category ?? "").toLowerCase().includes(q),
    );
    const groups = new Map<string, Etf[]>();
    for (const e of filtered) {
      const k = e.category ?? "Inne";
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(e);
    }
    for (const [, list] of groups) {
      list.sort((a, b) => {
        if (sortBy === "score") return (b.score?.total ?? 0) - (a.score?.total ?? 0);
        if (sortBy === "ytd") return b.ytd - a.ytd;
        return b.aumBn - a.aumBn;
      });
    }
    const ordered = [
      ...CATEGORY_ORDER.filter((c) => groups.has(c)).map((c) => [c, groups.get(c)!] as const),
      ...[...groups.entries()].filter(([k]) => !CATEGORY_ORDER.includes(k)),
    ];
    return ordered;
  }, [query, sortBy]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">ETF / Fundusze</div>
          <h1 className="mt-1 text-2xl font-bold">Przegląd ETF-ów</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Grupowanie według kategorii. Scoring 0–100: momentum (30%), trend (20%), liquidity (20%), cost (15%), risk (15%).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj ETF, sektor, opis…"
            className="rounded-md border border-border bg-card px-3 py-1.5 text-xs"
          />
          <div className="flex gap-1 rounded-md border border-border bg-card p-1 text-xs">
            {(["score", "ytd", "aum"] as const).map((k) => (
              <button key={k} onClick={() => setSortBy(k)}
                className={`rounded px-2 py-1 ${sortBy === k ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                {k === "score" ? "Score" : k === "ytd" ? "YTD" : "AUM"}
              </button>
            ))}
          </div>
        </div>
      </header>

      {grouped.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Brak ETF-ów dla zapytania.</div>
      )}

      {grouped.map(([category, list]) => (
        <section key={category} className="space-y-3">
          <div className="flex items-baseline justify-between border-b border-border pb-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">{category}</h2>
            <span className="text-[11px] text-muted-foreground">{list.length} pozycji</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {list.map((e) => <EtfCard key={e.symbol} e={e} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

function EtfCard({ e }: { e: Etf }) {
  const total = e.score?.total ?? 0;
  const tone = total >= 70 ? "border-bull/30" : total <= 40 ? "border-bear/30" : "border-border";
  return (
    <article className={cn("rounded-xl border bg-card p-4", tone)}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-bold">{e.symbol}</div>
          <div className="text-[11px] text-muted-foreground">{e.name}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={cn(
            "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase",
            e.rating === "Buy" && "bg-bull/20 text-bull",
            e.rating === "Reduce" && "bg-warning/20 text-warning",
            e.rating === "Avoid" && "bg-bear/20 text-bear",
            (!e.rating || e.rating === "Hold") && "bg-muted text-muted-foreground",
          )}>{e.rating ?? "—"}</span>
          <div className={cn(
            "rounded border border-border bg-background/60 px-2 py-0.5 text-center",
            total >= 70 ? "text-bull" : total <= 40 ? "text-bear" : "text-warning",
          )}>
            <div className="text-[8px] uppercase text-muted-foreground">Score</div>
            <div className="num text-sm font-bold leading-none">{total}</div>
          </div>
        </div>
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">{e.description}</p>

      <div className="mt-2 grid grid-cols-4 gap-1.5 text-center text-[10px]">
        <div><div className="text-muted-foreground">Koszt</div><div className="num font-bold">{e.expense.toFixed(2)}%</div></div>
        <div><div className="text-muted-foreground">AUM</div><div className="num font-bold">${e.aumBn}B</div></div>
        <div><div className="text-muted-foreground">YTD</div><div className={cn("num font-bold", e.ytd >= 0 ? "text-bull" : "text-bear")}>{e.ytd.toFixed(1)}%</div></div>
        <div><div className="text-muted-foreground">Div</div><div className="num font-bold">{(e.dividend ?? 0).toFixed(1)}%</div></div>
      </div>

      {e.score && (
        <div className="mt-2 space-y-1">
          <Bar label="Momentum" v={e.score.momentum} />
          <Bar label="Trend" v={e.score.trend} />
          <Bar label="Liquidity" v={e.score.liquidity} />
          <Bar label="Cost" v={e.score.cost} />
          <Bar label="Risk-adj" v={e.score.risk} />
        </div>
      )}

      {e.topHoldings && e.topHoldings.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {e.topHoldings.slice(0, 5).map((h) => (
            <span key={h} className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] text-primary">{h}</span>
          ))}
        </div>
      )}
    </article>
  );
}

function Bar({ label, v }: { label: string; v: number }) {
  const tone = v >= 70 ? "bg-bull" : v <= 40 ? "bg-bear" : "bg-warning";
  return (
    <div>
      <div className="flex items-center justify-between text-[9px] text-muted-foreground">
        <span>{label}</span><span className="num">{v}</span>
      </div>
      <div className="mt-0.5 h-1 w-full overflow-hidden rounded bg-background/60">
        <div className={cn("h-full", tone)} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}
