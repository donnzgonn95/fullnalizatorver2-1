// Dostępny przełącznik zakresu TradingView z pełną nawigacją klawiaturową
// (roving tabindex, ←/→/Home/End, fokus przenoszony na wybraną zakładkę).
import { useRef } from "react";
import { cn } from "@/lib/utils";
import type { TradingViewRange } from "@/components/TradingViewChart";
import { TV_RANGE_OPTIONS } from "@/components/TradingViewChart";

export function TradingViewRangeSwitcher({
  value,
  onChange,
}: {
  value: TradingViewRange;
  onChange: (next: TradingViewRange) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const focusAt = (idx: number) => {
    const total = TV_RANGE_OPTIONS.length;
    const i = ((idx % total) + total) % total;
    const next = TV_RANGE_OPTIONS[i];
    onChange(next);
    requestAnimationFrame(() => refs.current[i]?.focus());
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const idx = TV_RANGE_OPTIONS.indexOf(value);
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        focusAt(idx + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        focusAt(idx - 1);
        break;
      case "Home":
        e.preventDefault();
        focusAt(0);
        break;
      case "End":
        e.preventDefault();
        focusAt(TV_RANGE_OPTIONS.length - 1);
        break;
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Zakres TradingView"
      data-testid="tv-range-switcher"
      onKeyDown={onKeyDown}
      className="inline-flex flex-wrap overflow-hidden rounded-md border border-border focus-within:ring-2 focus-within:ring-ring"
    >
      {TV_RANGE_OPTIONS.map((r, i) => {
        const selected = value === r;
        return (
          <button
            key={r}
            ref={(el) => { refs.current[i] = el; }}
            role="tab"
            type="button"
            id={`tv-range-tab-${r}`}
            aria-selected={selected}
            aria-controls="tradingview-chart-panel"
            tabIndex={selected ? 0 : -1}
            data-testid={`tv-range-${r}`}
            onClick={() => onChange(r)}
            className={cn(
              "px-2.5 py-1 text-xs outline-none transition-colors focus-visible:bg-secondary",
              selected
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            {r}
          </button>
        );
      })}
    </div>
  );
}
