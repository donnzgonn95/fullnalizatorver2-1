import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { isInQuietHours, type QuietHours } from "@/lib/notifications";

/**
 * 24-hour timeline showing which hours are muted by quiet hours,
 * with a marker for the current time.
 */
export function QuietHoursPreview({ qh }: { qh: QuietHours }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const slots = Array.from({ length: 48 }, (_, i) => {
    const d = new Date(now);
    d.setHours(Math.floor(i / 2), (i % 2) * 30, 0, 0);
    return { i, muted: isInQuietHours({ ...qh, enabled: true }, d) };
  });

  const cursor = (now.getHours() * 60 + now.getMinutes()) / (24 * 60);
  const muted = isInQuietHours(qh, now);

  return (
    <div className="space-y-2" data-testid="quiet-preview">
      <div className="num flex items-center justify-between text-[10px] tracking-wider text-muted-foreground">
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>24:00</span>
      </div>
      <div className="relative h-6 overflow-hidden rounded-md border border-border bg-background/60">
        <div className="flex h-full w-full">
          {slots.map((s) => (
            <div
              key={s.i}
              className={cn(
                "h-full flex-1 border-r border-border/40 last:border-r-0",
                s.muted ? "bg-warning/40" : "bg-bull/15",
              )}
            />
          ))}
        </div>
        {qh.enabled && (
          <div
            data-testid="quiet-cursor"
            className="absolute top-0 bottom-0 w-px bg-foreground/80 shadow-[0_0_4px_rgba(255,255,255,0.6)]"
            style={{ left: `${cursor * 100}%` }}
          />
        )}
      </div>
      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2 w-2 rounded-sm bg-warning/50" /> cisza
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2 w-2 rounded-sm bg-bull/40" /> aktywne
          </span>
        </div>
        <span className={cn("num", muted ? "text-warning" : "text-bull")}>
          {now.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
          {" · "}
          {muted ? "🌙 cisza" : "🔔 aktywne"}
        </span>
      </div>
    </div>
  );
}
