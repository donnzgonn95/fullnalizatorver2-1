import { SCALE_BANDS } from "@/lib/squeeze";
import { cn } from "@/lib/utils";

type Props = {
  value: number;       // 0–100
  label?: string;
  size?: "sm" | "md";
  className?: string;
};

/**
 * Visual 0–100 scale with colored thresholds (neutral / weak / building / high)
 * and a downward arrow pointing at the current score.
 */
export function SqueezeScale({ value, label, size = "md", className }: Props) {
  const pct = Math.max(0, Math.min(100, value));
  const isSm = size === "sm";

  return (
    <div className={cn("w-full select-none", className)} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={label ?? "Squeeze score"}>
      {/* Arrow + numeric readout */}
      <div className="relative h-7">
        <div
          className="absolute -translate-x-1/2 transition-[left] duration-500"
          style={{ left: `${pct}%` }}
        >
          <div className={cn("num text-center font-bold leading-none", isSm ? "text-xs" : "text-sm")}>
            {Math.round(pct)}
          </div>
          <div className="mx-auto mt-0.5 h-0 w-0 border-x-[6px] border-t-[8px] border-x-transparent border-t-foreground" aria-hidden />
        </div>
      </div>

      {/* Banded track */}
      <div className={cn("relative w-full overflow-hidden rounded-full", isSm ? "h-2" : "h-3")}>
        <div className="absolute inset-0 flex">
          {SCALE_BANDS.map((b) => (
            <div
              key={b.from}
              className="h-full"
              style={{
                width: `${b.to - b.from}%`,
                background: b.color,
                opacity: pct >= b.from && pct <= b.to ? 1 : 0.35,
              }}
              title={`${b.from}–${b.to}: ${b.label}`}
            />
          ))}
        </div>
      </div>

      {/* Tick labels */}
      <div className={cn("mt-1 flex justify-between text-muted-foreground", isSm ? "text-[10px]" : "text-[11px]")}>
        {SCALE_BANDS.map((b) => (
          <span key={b.from} className="num">
            {b.from}
          </span>
        ))}
        <span className="num">100</span>
      </div>
    </div>
  );
}
