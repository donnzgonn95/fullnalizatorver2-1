import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { smaCrossoverBacktest } from "@/lib/lab/strategies";
import { seoHead } from "@/lib/seo";
import { Loader2, Play, Save } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/lab/backtest")({
  head: () => ({ ...seoHead({ title: "Backtest 3M — Lab", description: "Symulacja strategii na 3 miesiącach mock OHLC.", path: "/lab/backtest" }) }),
  component: BacktestPage,
});

function BacktestPage() {
  const { user } = useAuth();
  const [symbol, setSymbol] = useState("SPY");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof smaCrossoverBacktest> | null>(null);

  const run = () => {
    setRunning(true);
    setTimeout(() => {
      setResult(smaCrossoverBacktest(symbol.toUpperCase()));
      setRunning(false);
    }, 300);
  };

  const save = async () => {
    if (!result || !user) return;
    try {
      const { data: run, error } = await supabase.from("lab_backtest_runs").insert({
        user_id: user.id,
        strategy_name: "SMA(5/20) Crossover",
        params: { symbol: symbol.toUpperCase(), days: 90 } as never,
        finished_at: new Date().toISOString(),
        summary: result.summary as never,
      }).select().single();
      if (error) throw error;
      const rows = result.trades.map((t) => ({ ...t, user_id: user.id, run_id: run.id }));
      const { error: e2 } = await supabase.from("lab_backtest_trades").insert(rows as never);
      if (e2) throw e2;
      toast.success("Wynik backtestu zapisany.");
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Lab · Backtest 3M</div>
        <h1 className="mt-1 text-2xl font-bold">SMA(5/20) Crossover — 90 dni mock OHLC</h1>
      </header>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">Symbol</div>
            <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="w-32 rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <button onClick={run} disabled={running}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Uruchom
          </button>
          {result && (
            <button onClick={save} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary">
              <Save className="h-4 w-4" /> Zapisz wynik
            </button>
          )}
        </div>
      </section>

      {result && (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Stat label="Trades" value={result.summary.trades} />
            <Stat label="Winrate" value={`${(result.summary.winrate * 100).toFixed(1)}%`} tone={result.summary.winrate >= 0.5 ? "bull" : "bear"} />
            <Stat label="Total PnL" value={result.summary.total_pnl.toFixed(2)} tone={result.summary.total_pnl >= 0 ? "bull" : "bear"} />
            <Stat label="Expectancy" value={result.summary.expectancy.toFixed(2)} />
            <Stat label="Max DD" value={result.summary.max_drawdown.toFixed(2)} tone="bear" />
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">Transakcje ({result.trades.length})</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th>Data</th><th>Side</th><th className="text-right">Entry</th>
                    <th className="text-right">SL</th><th className="text-right">TP</th>
                    <th className="text-right">Exit</th><th className="text-right">R:R</th>
                    <th className="text-right">PnL</th><th>Conv</th><th>Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {result.trades.map((t, i) => (
                    <tr key={i}>
                      <td className="py-2">{t.trade_date}</td>
                      <td className={cn("text-xs", t.side === "long" ? "text-bull" : "text-bear")}>{t.side}</td>
                      <td className="num text-right">{t.entry_price}</td>
                      <td className="num text-right">{t.stop_loss}</td>
                      <td className="num text-right">{t.take_profit}</td>
                      <td className="num text-right">{t.exit_price}</td>
                      <td className="num text-right">{t.risk_reward}</td>
                      <td className={cn("num text-right", t.result_pnl >= 0 ? "text-bull" : "text-bear")}>
                        {t.result_pnl >= 0 ? "+" : ""}{t.result_pnl}
                      </td>
                      <td className="num text-center">{t.conviction_score}</td>
                      <td className="num text-center">{t.risk_score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: any; tone?: "bull" | "bear" }) {
  return (
    <div className="surface-glass rounded-xl p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={cn("num mt-1 text-xl font-bold", tone === "bull" && "text-bull", tone === "bear" && "text-bear")}>{value}</div>
    </div>
  );
}
