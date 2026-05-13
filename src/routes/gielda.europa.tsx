import { createFileRoute } from "@tanstack/react-router";
import { indices, euStocks } from "@/lib/gielda/mock-indices";
import { ChangePill } from "@/components/StatPill";
import { seoHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/gielda/europa")({
  head: () => ({
    ...seoHead({
      title: "Giełdy Europy — indeksy i top spółki",
      description: "DAX, CAC, FTSE, WIG20 i największe spółki europejskie z krótkim podsumowaniem.",
      path: "/gielda/europa",
    }),
  }),
  component: EuPage,
});

function EuPage() {
  const eu = indices.filter((i) => i.region === "Europa" || i.region === "Polska");
  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Europa</div>
        <h1 className="mt-1 text-2xl font-bold">Giełdy europejskie</h1>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {eu.map((i) => (
          <div key={i.symbol} className="surface-glass rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{i.region}</div>
                <div className="text-sm font-bold">{i.name}</div>
              </div>
              <ChangePill value={i.change1d} />
            </div>
            <div className="num mt-2 text-xl font-semibold">{i.value.toLocaleString("pl-PL")}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              YTD <span className={cn("num", i.changeYtd >= 0 ? "text-bull" : "text-bear")}>{i.changeYtd.toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">Top spółki Europa</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr><th className="py-2">Symbol</th><th>Spółka</th><th>Sektor</th><th className="text-right">Cena</th><th className="text-right">1D</th><th className="text-right">1M</th><th className="text-right">YTD</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {euStocks.map((s) => (
                <tr key={s.symbol}>
                  <td className="py-2 font-bold">{s.symbol}</td>
                  <td>{s.name}</td>
                  <td className="text-muted-foreground">{s.sector}</td>
                  <td className="num text-right">{s.price}</td>
                  <td className={cn("num text-right", s.change1d >= 0 ? "text-bull" : "text-bear")}>{s.change1d.toFixed(1)}%</td>
                  <td className={cn("num text-right", s.change1m >= 0 ? "text-bull" : "text-bear")}>{s.change1m.toFixed(1)}%</td>
                  <td className={cn("num text-right", s.changeYtd >= 0 ? "text-bull" : "text-bear")}>{s.changeYtd.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
