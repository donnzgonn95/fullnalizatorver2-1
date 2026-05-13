import { createFileRoute } from "@tanstack/react-router";
import { sectors } from "@/lib/gielda/mock-sectors";
import { seoHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/gielda/sektory")({
  head: () => ({
    ...seoHead({
      title: "Sektory S&P 500 — heatmap",
      description: "11 sektorów S&P 500 z ich wagą, zmianą dzienną, miesięczną i YTD.",
      path: "/gielda/sektory",
    }),
  }),
  component: SectorsPage,
});

function SectorsPage() {
  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Sektory</div>
        <h1 className="mt-1 text-2xl font-bold">Mapa sektorów S&P 500</h1>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sectors.map((s) => {
          const tone = s.changeYtd >= 15 ? "bull" : s.changeYtd <= 0 ? "bear" : "neutral";
          return (
            <div
              key={s.symbol}
              className={cn(
                "rounded-xl border p-4",
                tone === "bull" && "border-bull/30 bg-bull/5",
                tone === "bear" && "border-bear/30 bg-bear/5",
                tone === "neutral" && "border-border bg-card",
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold">{s.name}</div>
                  <div className="text-[11px] text-muted-foreground">{s.symbol} · waga {s.weight}%</div>
                </div>
                <span className={cn(
                  "rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                  s.trend === "bull" && "bg-bull/20 text-bull",
                  s.trend === "bear" && "bg-bear/20 text-bear",
                  s.trend === "neutral" && "bg-muted text-muted-foreground",
                )}>{s.trend}</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
                <Cell label="1D" value={s.change1d} />
                <Cell label="1M" value={s.change1m} />
                <Cell label="YTD" value={s.changeYtd} />
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-background/40 p-1.5">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("num font-bold", value >= 0 ? "text-bull" : "text-bear")}>{value.toFixed(1)}%</div>
    </div>
  );
}
