import { createFileRoute, Link } from "@tanstack/react-router";
import { coins as demoCoins } from "@/lib/demo-data";
import { useLiveCoins } from "@/lib/binance";
import { useDataSource, DATA_SOURCE_LABELS } from "@/lib/data-source";
import { ChangePill, formatMoney } from "@/components/StatPill";
import { cn } from "@/lib/utils";
import { Radio, Settings } from "lucide-react";
import { DataBadge } from "@/components/DataBadge";

import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/sila")({
  head: () => ({
    ...seoHead({
      title: "Ranking siły top 100 krypto",
      description: "Siła relatywna top 100 kryptowalut — które monety przewodzą rynkowi, a które tracą momentum w 24h i 7 dniach.",
      path: "/sila",
    }),
  }),
  component: SilaPage,
});

function SilaPage() {
  const source = useDataSource();
  const { data: liveCoins, isLoading, isError, dataUpdatedAt } = useLiveCoins();
  const coins = liveCoins ?? demoCoins;
  const ranked = [...coins].sort((a, b) => b.strength - a.strength);
  const updated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString("pl-PL") : "—";

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold">Ranking siły</h1>
            <DataBadge kind={liveCoins && !isError ? "real" : "demo"} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Wynik 0–100: 50% trend 7D + 25% momentum 24h + 25% wolumen względny.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div className={cn(
            "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
            isError ? "border-bear/40 bg-bear/10 text-bear" : liveCoins ? "border-bull/40 bg-bull/10 text-bull" : "border-border bg-muted text-muted-foreground",
          )}>
            <Radio className={cn("h-3 w-3", liveCoins && !isError && "animate-pulse")} />
            {isError ? "Demo (błąd)" : isLoading ? "Łączę…" : `${DATA_SOURCE_LABELS[source]} LIVE`}
            {liveCoins && !isError && <span className="num font-normal opacity-70">· {updated}</span>}
          </div>
          <Link to="/ustawienia" className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary">
            <Settings className="h-3 w-3" /> Zmień źródło
          </Link>
        </div>
      </header>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="grid grid-cols-12 gap-2 border-b border-border bg-muted/40 px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground">
          <div className="col-span-1">#</div>
          <div className="col-span-3">Coin</div>
          <div className="col-span-2 text-right">Cena</div>
          <div className="col-span-1 text-right">24H</div>
          <div className="col-span-2 text-right">7D</div>
          <div className="col-span-3">Siła</div>
        </div>
        <ul>
          {ranked.map((c, i) => (
            <li key={c.symbol} className="grid grid-cols-12 items-center gap-2 border-b border-border px-4 py-3 text-sm last:border-b-0 hover:bg-secondary/40">
              <div className="num col-span-1 text-muted-foreground">{i + 1}</div>
              <div className="col-span-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold">{c.symbol}</span>
                  <span className={cn(
                    "num rounded px-1 py-0.5 text-[10px]",
                    c.rsi >= 70 && "bg-warning/15 text-warning",
                    c.rsi <= 30 && "bg-bear/15 text-bear",
                    c.rsi > 30 && c.rsi < 70 && "bg-muted text-muted-foreground",
                  )}>RSI {c.rsi}</span>
                </div>
                <div className="text-[11px] text-muted-foreground">{c.name}</div>
              </div>
              <div className="num col-span-2 text-right font-semibold">{formatMoney(c.price)}</div>
              <div className={cn(
                "num col-span-1 text-right text-xs font-semibold",
                c.change24h >= 0 ? "text-bull" : "text-bear",
              )}>
                {c.change24h >= 0 ? "+" : ""}{c.change24h.toFixed(1)}%
              </div>
              <div className="col-span-2 flex justify-end"><ChangePill value={c.change7d} /></div>
              <div className="col-span-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        c.strength >= 70 && "bg-bull",
                        c.strength >= 40 && c.strength < 70 && "bg-warning",
                        c.strength < 40 && "bg-bear",
                      )}
                      style={{ width: `${c.strength}%` }}
                    />
                  </div>
                  <span className="num w-8 text-right text-xs font-semibold">{c.strength}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-bull/40 bg-bull/5 p-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-bull">Liderzy</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {ranked.slice(0, 3).map((c) => (
              <li key={c.symbol} className="flex justify-between">
                <span className="font-semibold">{c.symbol}</span>
                <span className="num text-bull">{c.change7d >= 0 ? "+" : ""}{c.change7d.toFixed(2)}% (7D)</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-bear/40 bg-bear/5 p-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-bear">Najsłabsi</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {ranked.slice(-3).reverse().map((c) => (
              <li key={c.symbol} className="flex justify-between">
                <span className="font-semibold">{c.symbol}</span>
                <span className="num text-bear">{c.change7d >= 0 ? "+" : ""}{c.change7d.toFixed(2)}% (7D)</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
