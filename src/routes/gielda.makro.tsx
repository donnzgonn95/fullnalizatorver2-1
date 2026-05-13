import { createFileRoute } from "@tanstack/react-router";
import { macroIndicators } from "@/lib/gielda/mock-macro";
import { seoHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/gielda/makro")({
  head: () => ({
    ...seoHead({
      title: "Makroekonomia — wskaźniki USA i Europa",
      description: "CPI, stopy procentowe, rentowności, VIX, EUR/USD i inne wskaźniki kluczowe dla rynków akcji.",
      path: "/gielda/makro",
    }),
  }),
  component: MakroPage,
});

function MakroPage() {
  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Makro</div>
        <h1 className="mt-1 text-2xl font-bold">Otoczenie makroekonomiczne</h1>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {macroIndicators.map((m) => (
          <div key={m.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{m.region}</div>
                <div className="text-sm font-bold">{m.name}</div>
              </div>
              <span className={cn(
                "rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                m.interpretation === "positive" && "bg-bull/20 text-bull",
                m.interpretation === "negative" && "bg-bear/20 text-bear",
                m.interpretation === "neutral" && "bg-muted text-muted-foreground",
              )}>{m.interpretation}</span>
            </div>
            <div className="num mt-2 text-2xl font-semibold">{m.value}{m.unit}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              Δ {m.change > 0 ? "+" : ""}{m.change}{m.unit} · {m.asOf}
            </div>
            {m.note && <p className="mt-2 text-xs text-muted-foreground">{m.note}</p>}
          </div>
        ))}
      </section>
    </div>
  );
}
