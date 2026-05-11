// Star button to toggle a coin in/out of the watchlist.
import { Star } from "lucide-react";
import { useWatchlist } from "@/lib/watchlist";
import { cn } from "@/lib/utils";

export function WatchlistStar({ symbol, className }: { symbol: string; className?: string }) {
  const { has, toggle } = useWatchlist();
  const active = has(symbol);
  return (
    <button
      type="button"
      onClick={() => toggle(symbol)}
      aria-label={active ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
      title={active ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs transition-colors hover:bg-secondary",
        active ? "text-warning" : "text-muted-foreground",
        className,
      )}
    >
      <Star className={cn("h-4 w-4", active && "fill-current")} />
      {active ? "Ulubione" : "Dodaj do ulubionych"}
    </button>
  );
}
