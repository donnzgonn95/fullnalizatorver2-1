import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp } from "lucide-react";

export function ChangePill({ value, suffix = "%" }: { value: number; suffix?: string }) {
  const positive = value >= 0;
  return (
    <span
      className={cn(
        "num inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold",
        positive ? "bg-bull/15 text-bull" : "bg-bear/15 text-bear",
      )}
    >
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {positive ? "+" : ""}
      {value.toFixed(2)}
      {suffix}
    </span>
  );
}

export function formatMoney(n: number) {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  if (n >= 1) return `$${n.toLocaleString("pl-PL", { maximumFractionDigits: 2 })}`;
  return `$${n.toFixed(4)}`;
}
