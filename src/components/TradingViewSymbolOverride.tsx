// Ręczne nadpisanie symbolu TradingView dla danej monety (np. gdy auto-mapping jest błędne).
// Przykładowe wartości: KRAKEN:XRPUSD, COINBASE:HBARUSD, BYBIT:SOLUSDT.
import { useEffect, useState } from "react";
import { Pencil, Check, X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

const SYMBOL_RE = /^[A-Z0-9]{2,12}:[A-Z0-9.]{2,16}$/;

export function TradingViewSymbolOverride({
  resolved,
  override,
  onChange,
  onClear,
}: {
  resolved: string;
  override?: string;
  onChange: (next: string) => void;
  onClear: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(override ?? resolved);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(override ?? resolved);
  }, [override, resolved]);

  const submit = () => {
    const value = draft.trim().toUpperCase();
    if (!SYMBOL_RE.test(value)) {
      setError("Format: GIEŁDA:PARA, np. KRAKEN:XRPUSD");
      return;
    }
    setError(null);
    onChange(value);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
        <span>Symbol:</span>
        <code
          data-testid="tv-resolved-symbol"
          className={cn(
            "rounded bg-muted px-1.5 py-0.5 font-mono text-foreground",
            override && "bg-primary/15 text-foreground",
          )}
        >
          {override ?? resolved}
        </code>
        {override && (
          <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
            override
          </span>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          data-testid="tv-symbol-edit"
          aria-label="Edytuj symbol TradingView"
          className="inline-flex items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 text-[11px] hover:bg-secondary"
        >
          <Pencil className="h-3 w-3" /> Edytuj
        </button>
        {override && (
          <button
            type="button"
            onClick={onClear}
            data-testid="tv-symbol-reset"
            aria-label="Przywróć automatyczny symbol"
            className="inline-flex items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 text-[11px] hover:bg-secondary"
          >
            <RotateCcw className="h-3 w-3" /> Auto
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <label htmlFor="tv-symbol-input" className="sr-only">
        Symbol TradingView
      </label>
      <input
        id="tv-symbol-input"
        data-testid="tv-symbol-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") {
            setEditing(false);
            setError(null);
            setDraft(override ?? resolved);
          }
        }}
        placeholder="np. KRAKEN:XRPUSD"
        className="h-7 w-56 rounded border border-border bg-background px-2 font-mono text-xs uppercase outline-none focus:ring-2 focus:ring-ring"
        autoFocus
        aria-invalid={!!error}
        aria-describedby={error ? "tv-symbol-error" : undefined}
      />
      <button
        type="button"
        onClick={submit}
        data-testid="tv-symbol-save"
        aria-label="Zapisz symbol"
        className="inline-flex items-center gap-1 rounded border border-border bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90"
      >
        <Check className="h-3 w-3" /> Zapisz
      </button>
      <button
        type="button"
        onClick={() => {
          setEditing(false);
          setError(null);
          setDraft(override ?? resolved);
        }}
        aria-label="Anuluj"
        className="inline-flex items-center gap-1 rounded border border-border bg-card px-2 py-1 text-[11px] hover:bg-secondary"
      >
        <X className="h-3 w-3" />
      </button>
      {error && (
        <span id="tv-symbol-error" role="alert" className="text-[11px] text-bear">
          {error}
        </span>
      )}
    </div>
  );
}
