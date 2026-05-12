import { createFileRoute } from "@tanstack/react-router";
import { capitalFlow } from "@/lib/demo-data";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { DataBadge } from "@/components/DataBadge";

import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/przeplyw")({
  head: () => ({
    ...seoHead({
      title: "Przepływ kapitału BTC → ETH → SOL → alty",
      description: "Wizualizacja rotacji kapitału między Bitcoinem, Ethereum, Solaną i altcoinami w ostatnich 14 dniach.",
      path: "/przeplyw",
    }),
  }),
  component: PrzeplywPage,
});

function PrzeplywPage() {
  return (
    <div className="space-y-6">
      <header>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold">Przepływ kapitału</h1>
          <DataBadge kind="demo" />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Klasyczna rotacja w cyklu byczym: <strong>BTC → ETH → SOL → alty</strong>. Im wyżej krzywa, tym silniejszy napływ.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-card p-4 md:p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Indeks napływu (znormalizowany, 14D)</h2>
          <span className="text-xs text-muted-foreground">100 = baseline</span>
        </div>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={capitalFlow}>
              <defs>
                {(["BTC", "ETH", "SOL", "ALT"] as const).map((k, i) => (
                  <linearGradient key={k} id={`grad-${k}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={`var(--chart-${i + 1})`} stopOpacity={0.6} />
                    <stop offset="100%" stopColor={`var(--chart-${i + 1})`} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="BTC" stroke="var(--chart-1)" fill="url(#grad-BTC)" strokeWidth={2} />
              <Area type="monotone" dataKey="ETH" stroke="var(--chart-2)" fill="url(#grad-ETH)" strokeWidth={2} />
              <Area type="monotone" dataKey="SOL" stroke="var(--chart-3)" fill="url(#grad-SOL)" strokeWidth={2} />
              <Area type="monotone" dataKey="ALT" stroke="var(--chart-4)" fill="url(#grad-ALT)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "BTC", desc: "Stabilizacja po wzroście", change: "+12%", color: "chart-1" },
          { label: "ETH", desc: "Wyraźny napływ kapitału", change: "+21%", color: "chart-2" },
          { label: "SOL", desc: "Najsilniejsza rotacja", change: "+38%", color: "chart-3" },
          { label: "Alty", desc: "Powolny start sezonu", change: "+28%", color: "chart-4" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: `var(--${s.color})` }} />
              <span className="font-semibold">{s.label}</span>
            </div>
            <div className="num mt-1 text-2xl font-bold">{s.change}</div>
            <div className="mt-1 text-xs text-muted-foreground">{s.desc}</div>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-border bg-card/60 p-5 text-sm">
        <h3 className="font-semibold">Jak to czytać?</h3>
        <p className="mt-2 text-muted-foreground">
          Gdy linia <strong>SOL</strong> i <strong>ALT</strong> rosną szybciej niż BTC, oznacza to,
          że kapitał przesuwa się w bardziej ryzykowne aktywa — typowy znak fazy „altseason”.
          Gdy wszystkie linie spadają synchronicznie — kapitał ucieka z rynku.
        </p>
      </section>
    </div>
  );
}
