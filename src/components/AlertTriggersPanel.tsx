// Per-coin alert trigger editor: price thresholds + percent change + bulk on/off.
import { useState } from "react";
import { Bell, BellOff, Plus, Power, Trash2 } from "lucide-react";
import { useTriggers } from "@/lib/alert-triggers";
import { cn } from "@/lib/utils";

type Mode = "price" | "pct";

export function AlertTriggersPanel({ symbol, currentPrice }: { symbol: string; currentPrice?: number }) {
  const { list, add, addPct, remove, toggle, setAllForSymbol } = useTriggers(symbol);
  const [mode, setMode] = useState<Mode>("price");
  const [side, setSide] = useState<"above" | "below">("above");
  const [price, setPrice] = useState<string>("");
  const [pctUp, setPctUp] = useState<string>("5");
  const [pctDown, setPctDown] = useState<string>("3");

  const submit = () => {
    if (mode === "price") {
      const p = parseFloat(price.replace(",", "."));
      if (!isFinite(p) || p <= 0) return;
      add({ symbol, side, price: p });
      setPrice("");
    } else {
      const up = pctUp ? parseFloat(pctUp.replace(",", ".")) : undefined;
      const dn = pctDown ? parseFloat(pctDown.replace(",", ".")) : undefined;
      const upOk = up != null && isFinite(up) && up > 0;
      const dnOk = dn != null && isFinite(dn) && dn > 0;
      if (!upOk && !dnOk) return;
      if (!currentPrice || currentPrice <= 0) return;
      addPct({
        symbol,
        refPrice: currentPrice,
        pctUp: upOk ? up : undefined,
        pctDown: dnOk ? dn : undefined,
      });
    }
  };

  const anyEnabled = list.some((t) => t.enabled);
  const allEnabled = list.length > 0 && list.every((t) => t.enabled);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 text-sm font-bold">
          <Bell className="h-4 w-4 text-warning" />
          Wyzwalacze alertów dla {symbol}
        </div>
        {list.length > 0 && (
          <div className="ml-auto flex gap-1">
            <button
              type="button"
              onClick={() => setAllForSymbol(symbol, true)}
              disabled={allEnabled}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              <Power className="h-3 w-3 text-bull" /> Włącz wszystkie
            </button>
            <button
              type="button"
              onClick={() => setAllForSymbol(symbol, false)}
              disabled={!anyEnabled}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              <BellOff className="h-3 w-3 text-bear" /> Wyłącz wszystkie
            </button>
          </div>
        )}
      </div>

      <div className="mb-2 flex overflow-hidden rounded-md border border-border w-fit">
        <button
          type="button"
          onClick={() => setMode("price")}
          className={cn("px-3 py-1 text-xs", mode === "price" ? "bg-secondary text-foreground" : "text-muted-foreground")}
        >
          Cena
        </button>
        <button
          type="button"
          onClick={() => setMode("pct")}
          className={cn("px-3 py-1 text-xs", mode === "pct" ? "bg-secondary text-foreground" : "text-muted-foreground")}
        >
          Zmiana %
        </button>
      </div>

      {mode === "price" ? (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-md border border-border">
            <button
              type="button"
              onClick={() => setSide("above")}
              className={cn("px-3 py-1.5 text-xs", side === "above" ? "bg-bull/20 text-bull" : "text-muted-foreground")}
            >
              Powyżej
            </button>
            <button
              type="button"
              onClick={() => setSide("below")}
              className={cn("px-3 py-1.5 text-xs", side === "below" ? "bg-bear/20 text-bear" : "text-muted-foreground")}
            >
              Poniżej
            </button>
          </div>
          <input
            type="text"
            inputMode="decimal"
            placeholder={currentPrice ? currentPrice.toString() : "cena USD"}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="num h-8 w-32 rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={submit}
            className="inline-flex h-8 items-center gap-1 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-3 w-3" /> Dodaj
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col text-[10px] uppercase tracking-wider text-muted-foreground">
            +% (góra)
            <input
              type="text"
              inputMode="decimal"
              value={pctUp}
              onChange={(e) => setPctUp(e.target.value)}
              placeholder="np. 5"
              className="num mt-0.5 h-8 w-20 rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <label className="flex flex-col text-[10px] uppercase tracking-wider text-muted-foreground">
            -% (dół)
            <input
              type="text"
              inputMode="decimal"
              value={pctDown}
              onChange={(e) => setPctDown(e.target.value)}
              placeholder="np. 3"
              className="num mt-0.5 h-8 w-20 rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <button
            type="button"
            onClick={submit}
            disabled={!currentPrice}
            className="inline-flex h-8 items-center gap-1 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            title={!currentPrice ? "Brak ceny odniesienia" : ""}
          >
            <Plus className="h-3 w-3" /> Dodaj (ref ${currentPrice?.toFixed(2) ?? "—"})
          </button>
        </div>
      )}

      {list.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Brak wyzwalaczy. Powiadomię Cię, gdy cena przekroczy ustawiony poziom lub procentową zmianę od ceny odniesienia.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {list.map((t) => (
            <li key={t.id} className="flex items-center gap-2 py-2 text-sm">
              {t.kind === "price" ? (
                <>
                  <span
                    className={cn(
                      "rounded px-2 py-0.5 text-[10px] font-bold uppercase",
                      t.side === "above" ? "bg-bull/20 text-bull" : "bg-bear/20 text-bear",
                    )}
                  >
                    {t.side === "above" ? "Powyżej" : "Poniżej"}
                  </span>
                  <span className="num font-semibold">${t.price.toLocaleString("en-US")}</span>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[9px] uppercase",
                      t.armed === false ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary",
                    )}
                    title="Stan re-arm. Trigger uzbroi się ponownie, gdy cena wróci na drugą stronę progu."
                  >
                    {t.armed === false ? "wystrzelony" : "uzbrojony"}
                  </span>
                </>
              ) : (
                <>
                  <span className="rounded bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase">% zmiana</span>
                  <span className="num text-xs">
                    ref ${t.refPrice.toLocaleString("en-US")}
                  </span>
                  {t.pctUp != null && (
                    <span className="rounded bg-bull/15 px-1.5 py-0.5 text-[10px] font-semibold text-bull">
                      +{t.pctUp}% {t.armedUp === false ? "✓" : ""}
                    </span>
                  )}
                  {t.pctDown != null && (
                    <span className="rounded bg-bear/15 px-1.5 py-0.5 text-[10px] font-semibold text-bear">
                      -{t.pctDown}% {t.armedDown === false ? "✓" : ""}
                    </span>
                  )}
                </>
              )}
              <button
                type="button"
                onClick={() => toggle(t.id)}
                className={cn(
                  "ml-auto rounded-md border px-2 py-0.5 text-[10px]",
                  t.enabled
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground",
                )}
              >
                {t.enabled ? "Aktywny" : "Wyłączony"}
              </button>
              <button
                type="button"
                onClick={() => remove(t.id)}
                aria-label="Usuń"
                className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
