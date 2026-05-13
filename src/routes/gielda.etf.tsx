import { createFileRoute } from "@tanstack/react-router";
import { etfs } from "@/lib/gielda/mock-etfs";
import { seoHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/gielda/etf")({
  head: () => ({
    ...seoHead({
      title: "ETF i fundusze — przegląd",
      description: "Najważniejsze ETF-y akcyjne, sektorowe, obligacyjne, surowcowe i tematyczne — koszt, AUM, YTD.",
      path: "/gielda/etf",
    }),
  }),
  component: EtfPage,
});

function EtfPage() {
  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">ETF / Fundusze</div>
        <h1 className="mt-1 text-2xl font-bold">Przegląd ETF-ów</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Selekcja najpłynniejszych funduszy notowanych w USA i Europie.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-2">Symbol</th><th>Nazwa</th><th>Typ</th><th>Region</th>
                <th className="text-right">Koszt</th><th className="text-right">AUM</th>
                <th className="text-right">1D</th><th className="text-right">YTD</th>
                <th>Opis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {etfs.map((e) => (
                <tr key={e.symbol}>
                  <td className="py-2 font-bold">{e.symbol}</td>
                  <td>{e.name}</td>
                  <td className="text-muted-foreground">{e.type}</td>
                  <td className="text-muted-foreground">{e.region}</td>
                  <td className="num text-right">{e.expense.toFixed(2)}%</td>
                  <td className="num text-right">${e.aumBn}B</td>
                  <td className={cn("num text-right", e.change1d >= 0 ? "text-bull" : "text-bear")}>{e.change1d.toFixed(1)}%</td>
                  <td className={cn("num text-right", e.ytd >= 0 ? "text-bull" : "text-bear")}>{e.ytd.toFixed(1)}%</td>
                  <td className="max-w-xs text-xs text-muted-foreground">{e.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
