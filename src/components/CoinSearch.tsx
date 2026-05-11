import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useTopCoins } from "@/lib/top-coins";
import { cn } from "@/lib/utils";

export function CoinSearch({ className }: { className?: string }) {
  const { data: coins } = useTopCoins();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const results = useMemo(() => {
    if (!coins) return [];
    const term = q.trim().toLowerCase();
    if (!term) return coins.slice(0, 8);
    return coins
      .filter(
        (c) =>
          c.symbol.toLowerCase().includes(term) ||
          c.name.toLowerCase().includes(term),
      )
      .slice(0, 10);
  }, [coins, q]);

  function go(symbol: string) {
    setOpen(false);
    setQ("");
    navigate({ to: "/coin/$symbol", params: { symbol: symbol.toUpperCase() } });
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!open) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((h) => Math.min(h + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter" && results[highlight]) {
              e.preventDefault();
              go(results[highlight].symbol);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder="Szukaj kryptowaluty…"
          className="w-44 bg-transparent text-sm outline-none placeholder:text-muted-foreground sm:w-56"
        />
        {q && (
          <button onClick={() => setQ("")} aria-label="Wyczyść" className="text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute right-0 z-50 mt-1 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-border bg-popover shadow-xl">
          <ul className="max-h-80 overflow-y-auto py-1">
            {results.map((c, i) => (
              <li key={c.symbol}>
                <button
                  type="button"
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => go(c.symbol)}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2 text-left text-sm",
                    i === highlight ? "bg-secondary" : "hover:bg-secondary/60",
                  )}
                >
                  {c.image && (
                    <img src={c.image} alt="" width={20} height={20} className="h-5 w-5 rounded-full" />
                  )}
                  <span className="font-semibold">{c.symbol}</span>
                  <span className="text-muted-foreground">{c.name}</span>
                  <span className="num ml-auto text-xs text-muted-foreground">#{c.rank ?? "—"}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
