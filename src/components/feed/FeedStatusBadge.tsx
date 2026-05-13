import { useFeedSnapshot } from "@/lib/feed/use-live-candles";
import { getFeedManager } from "@/lib/feed/feed-manager";
import { cn } from "@/lib/utils";
import { Radio, WifiOff, AlertTriangle, RefreshCw } from "lucide-react";

export function FeedStatusBadge() {
  const snap = useFeedSnapshot();
  const fm = getFeedManager();

  const colorMap = {
    connected: "text-bull",
    fallback: "text-warning",
    reconnecting: "text-warning",
    offline: "text-bear",
  } as const;
  const iconMap = {
    connected: Radio, fallback: AlertTriangle, reconnecting: RefreshCw, offline: WifiOff,
  } as const;
  const Icon = iconMap[snap.status];
  const labelMap = {
    connected: "POŁĄCZONO",
    fallback: "TRYB AWARYJNY",
    reconnecting: "PONOWNE ŁĄCZENIE…",
    offline: "OFFLINE",
  } as const;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs">
      <Icon className={cn("h-3.5 w-3.5", colorMap[snap.status], snap.status === "connected" && "animate-pulse")} />
      <span className={cn("font-bold uppercase tracking-wider", colorMap[snap.status])}>
        {snap.provider === "binance" ? "Binance" : "CoinGecko"} · {labelMap[snap.status]}
      </span>
      <select
        value={snap.provider}
        onChange={(e) => fm.setProvider(e.target.value as "binance" | "coingecko")}
        className="ml-2 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] uppercase tracking-wider"
        aria-label="Wybór dostawcy danych"
      >
        <option value="binance">Binance</option>
        <option value="coingecko">CoinGecko</option>
      </select>
    </div>
  );
}
