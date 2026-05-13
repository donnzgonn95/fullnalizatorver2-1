import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { CoRobicCard } from "@/components/gielda/CoRobicCard";
import { computeVerdict, defaultContext } from "@/lib/gielda/decision-engine";
import { indices } from "@/lib/gielda/mock-indices";
import { sectors } from "@/lib/gielda/mock-sectors";
import { macroIndicators } from "@/lib/gielda/mock-macro";
import { ChangePill } from "@/components/StatPill";
import { seoHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/gielda/")({
  head: () => ({
    ...seoHead({
      title: "Overview rynku — Globalny Portal Giełdowy",
      description: "Stan rynków akcji USA i Europy, kluczowe indeksy, sektory, makro i decyzja: czekać, akumulować czy zabezpieczać.",
      path: "/gielda",
    }),
  }),
  component: GieldaOverview,
});

function GieldaOverview() {
  const verdict = useMemo(() => computeVerdict(defaultContext()), []);
  const topSectors = [...sectors].sort((a, b) => b.changeYtd - a.changeYtd).slice(0, 4);

  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Overview</div>
        <h1 className="mt-1 text-2xl font-bold md:text-3xl">Co dziś dzieje się na giełdach?</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Skondensowany przegląd indeksów, sektorów i makro. Dane prezentacyjne (mock) — przygotowane pod podłączenie realnych źródeł.
        </p>
      </header>

      <CoRobicCard result={verdict} />

      <Section title="Kluczowe indeksy">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {indices.map((i) => (
            <div key={i.symbol} className="surface-glass rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{i.region}</div>
                  <div className="text-sm font-bold">{i.name}</div>
                </div>
                <ChangePill value={i.change1d} />
              </div>
              <div className="num mt-2 text-xl font-semibold">{i.value.toLocaleString("pl-PL")}</div>
              <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                <span>1M <span className={cn("num", i.change1m >= 0 ? "text-bull" : "text-bear")}>{i.change1m.toFixed(1)}%</span></span>
                <span>YTD <span className={cn("num", i.changeYtd >= 0 ? "text-bull" : "text-bear")}>{i.changeYtd.toFixed(1)}%</span></span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Najsilniejsze sektory (YTD)">
          <ul className="divide-y divide-border">
            {topSectors.map((s) => (
              <li key={s.symbol} className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-semibold">{s.name}</div>
                  <div className="text-[11px] text-muted-foreground">{s.symbol} · waga {s.weight}%</div>
                </div>
                <div className={cn("num text-sm font-bold", s.changeYtd >= 0 ? "text-bull" : "text-bear")}>
                  {s.changeYtd.toFixed(1)}%
                </div>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Makro w pigułce">
          <ul className="divide-y divide-border">
            {macroIndicators.slice(0, 5).map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-semibold">{m.name}</div>
                  <div className="text-[11px] text-muted-foreground">{m.region} · {m.asOf}</div>
                </div>
                <div className="text-right">
                  <div className="num text-sm font-bold">{m.value}{m.unit}</div>
                  <div className={cn(
                    "text-[11px]",
                    m.interpretation === "positive" && "text-bull",
                    m.interpretation === "negative" && "text-bear",
                    m.interpretation === "neutral" && "text-muted-foreground",
                  )}>
                    Δ {m.change > 0 ? "+" : ""}{m.change}{m.unit}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}
