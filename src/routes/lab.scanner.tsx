import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { generateHistory } from "@/lib/lab/mock-historical";
import { seoHead } from "@/lib/seo";
import { ScanSearch } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/lab/scanner")({
  head: () => ({ ...seoHead({ title: "Setup Scanner — Lab", description: "Skaner setupów technicznych (mock).", path: "/lab/scanner" }) }),
  component: ScannerPage,
});

const UNIVERSE = ["SPY", "QQQ", "IWM", "DIA", "XLF", "XLE", "XLK", "XLV", "XLY", "XLP", "VOO", "AAPL", "MSFT", "NVDA", "AMZN", "META", "GOOGL", "TSLA"];

interface Setup { symbol: string; type: string; signal: "BUY" | "SELL" | "WATCH"; price: number; rsi: number; }

function compute(symbols: string[]): Setup[] {
  return symbols.map((s) => {
    const bars = generateHistory(s, 30);
    const closes = bars.map((b) => b.close);
    const last = closes[closes.length - 1];
    const sma20 = closes.slice(-20).reduce((a, c) => a + c, 0) / 20;
    const gains: number[] = []; const losses: number[] = [];
    for (let i = 1; i < closes.length; i++) {
      const d = closes[i] - closes[i - 1];
      if (d >= 0) gains.push(d); else losses.push(-d);
    }
    const avgG = gains.slice(-14).reduce((a, c) => a + c, 0) / 14;
    const avgL = losses.slice(-14).reduce((a, c) => a + c, 0) / 14 || 1e-6;
    const rsi = 100 - 100 / (1 + avgG / avgL);
    const aboveMa = last > sma20;
    let signal: Setup["signal"] = "WATCH";
    let type = "Konsolidacja";
    if (rsi < 30 && aboveMa) { signal = "BUY"; type = "Wyprzedanie + trend wzrostowy"; }
    else if (rsi > 70 && !aboveMa) { signal = "SELL"; type = "Wykupienie + trend spadkowy"; }
    else if (rsi > 50 && aboveMa) { signal = "BUY"; type = "Momentum bullish"; }
    else if (rsi < 50 && !aboveMa) { signal = "SELL"; type = "Momentum bearish"; }
    return { symbol: s, type, signal, price: last, rsi: +rsi.toFixed(1) };
  });
}

function ScannerPage() {
  const [setups] = useState<Setup[]>(compute(UNIVERSE));
  const [filter, setFilter] = useState<Setup["signal"] | "ALL">("ALL");
  const list = filter === "ALL" ? setups : setups.filter((s) => s.signal === filter);

  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Lab · Setup Scanner</div>
        <h1 className="mt-1 text-2xl font-bold flex items-center gap-2"><ScanSearch className="h-5 w-5" /> Skaner setupów (mock)</h1>
      </header>

      <div className="flex gap-2">
        {(["ALL", "BUY", "SELL", "WATCH"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn(
            "rounded-md border px-3 py-1 text-xs",
            filter === f ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-secondary",
          )}>{f}</button>
        ))}
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <table className="w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr><th>Symbol</th><th>Setup</th><th className="text-right">Cena</th><th className="text-right">RSI</th><th>Sygnał</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map((s) => (
              <tr key={s.symbol}>
                <td className="py-2 font-bold">{s.symbol}</td>
                <td className="text-xs text-muted-foreground">{s.type}</td>
                <td className="num text-right">{s.price.toFixed(2)}</td>
                <td className="num text-right">{s.rsi}</td>
                <td>
                  <span className={cn(
                    "rounded px-2 py-0.5 text-[10px] font-bold uppercase",
                    s.signal === "BUY" && "bg-bull/15 text-bull",
                    s.signal === "SELL" && "bg-bear/15 text-bear",
                    s.signal === "WATCH" && "bg-warning/15 text-warning",
                  )}>{s.signal}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
