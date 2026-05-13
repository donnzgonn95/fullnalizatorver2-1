import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/gielda/RequireAuth";
import { bajtlikInitial } from "@/lib/gielda/mock-bajtlik";
import { gieldaStorage } from "@/lib/gielda/storage";
import type { BajtlikState } from "@/lib/gielda/types";
import { seoHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/gielda/bajtlik")({
  head: () => ({
    ...seoHead({
      title: "Bajtlik — portfel inwestycyjny",
      description: "Stan kapitału, zrealizowane zyski i straty, cele finansowe oraz progres do nich.",
      path: "/gielda/bajtlik",
    }),
  }),
  component: BajtlikPage,
});

function BajtlikPage() {
  return (
    <RequireAuth>
      <BajtlikInner />
    </RequireAuth>
  );
}

function BajtlikInner() {
  const [state, setState] = useState<BajtlikState>(bajtlikInitial);

  useEffect(() => {
    setState(gieldaStorage.getBajtlik(bajtlikInitial));
  }, []);

  const totalPositions = state.positions.reduce((acc, p) => acc + p.qty * p.currentPrice, 0);
  const totalCost = state.positions.reduce((acc, p) => acc + p.qty * p.avgPrice, 0);
  const unrealized = totalPositions - totalCost;
  const totalReturn = ((state.currentCapital - state.startingCapital) / state.startingCapital) * 100;
  const goal = state.goals[0];
  const progress = goal ? Math.min(100, (state.currentCapital / goal.targetAmount) * 100) : 0;

  const reset = () => { gieldaStorage.setBajtlik(bajtlikInitial); setState(bajtlikInitial); };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Bajtlik · Portfel</div>
          <h1 className="mt-1 text-2xl font-bold">Twój kapitał</h1>
        </div>
        <button onClick={reset} className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-secondary">
          Przywróć dane demo
        </button>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Kapitał startowy" value={`${state.startingCapital.toLocaleString("pl-PL")} ${state.currency}`} />
        <Stat label="Obecny kapitał" value={`${state.currentCapital.toLocaleString("pl-PL")} ${state.currency}`} sub={
          <span className={cn("num", totalReturn >= 0 ? "text-bull" : "text-bear")}>{totalReturn.toFixed(1)}%</span>
        } />
        <Stat label="Zrealizowane zyski" value={`${state.realizedPnl.toLocaleString("pl-PL")} ${state.currency}`} tone="bull" />
        <Stat label="Zrealizowane straty" value={`${state.realizedLosses.toLocaleString("pl-PL")} ${state.currency}`} tone="bear" />
      </section>

      {goal && (
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Cel finansowy</div>
              <div className="mt-1 text-base font-bold">{goal.title}</div>
              <div className="text-xs text-muted-foreground">
                {state.currentCapital.toLocaleString("pl-PL")} / {goal.targetAmount.toLocaleString("pl-PL")} {goal.currency}
                {goal.deadline && <> · do {goal.deadline}</>}
              </div>
            </div>
            <div className="num text-2xl font-bold text-bull">{progress.toFixed(0)}%</div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-bull" style={{ width: `${progress}%` }} />
          </div>
        </section>
      )}

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">Pozycje</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-2">Symbol</th><th className="text-right">Ilość</th>
                <th className="text-right">Avg cena</th><th className="text-right">Aktualna</th>
                <th className="text-right">Wartość</th><th className="text-right">P&amp;L</th>
                <th>Teza</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {state.positions.map((p) => {
                const value = p.qty * p.currentPrice;
                const pnl = value - p.qty * p.avgPrice;
                const pnlPct = (pnl / (p.qty * p.avgPrice)) * 100;
                return (
                  <tr key={p.id}>
                    <td className="py-2 font-bold">{p.symbol}</td>
                    <td className="num text-right">{p.qty}</td>
                    <td className="num text-right">{p.avgPrice}</td>
                    <td className="num text-right">{p.currentPrice}</td>
                    <td className="num text-right">{value.toFixed(0)} {p.currency}</td>
                    <td className={cn("num text-right", pnl >= 0 ? "text-bull" : "text-bear")}>
                      {pnl >= 0 ? "+" : ""}{pnl.toFixed(0)} ({pnlPct.toFixed(1)}%)
                    </td>
                    <td className="max-w-xs text-xs text-muted-foreground">{p.thesis}</td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-border font-bold">
                <td className="py-2" colSpan={4}>Suma niezrealizowane</td>
                <td className="num text-right">{totalPositions.toFixed(0)}</td>
                <td className={cn("num text-right", unrealized >= 0 ? "text-bull" : "text-bear")}>
                  {unrealized >= 0 ? "+" : ""}{unrealized.toFixed(0)}
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
        Historia decyzji oraz notatki agenta i użytkownika znajdziesz w sekcji
        {" "}<Link to="/gielda/dziennik" className="text-primary hover:underline">Dziennik decyzji</Link>.
      </section>
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: React.ReactNode; tone?: "bull" | "bear" }) {
  return (
    <div className="surface-glass rounded-xl p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={cn("num mt-1 text-xl font-bold", tone === "bull" && "text-bull", tone === "bear" && "text-bear")}>
        {value}
      </div>
      {sub && <div className="mt-1 text-[11px]">{sub}</div>}
    </div>
  );
}
