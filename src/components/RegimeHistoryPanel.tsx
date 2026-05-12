import { Trash2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { clearRegimeHistory, useRegimeHistory } from "@/lib/regime-store";
import type { RegimeTone } from "@/lib/market-regime";
import { Timeline, TimelineItem, type TimelineTone } from "@/components/Timeline";

const toneChip: Record<RegimeTone, string> = {
  bull: "bg-bull/20 text-bull",
  bear: "bg-bear/20 text-bear",
  warning: "bg-warning/20 text-warning",
  neutral: "bg-muted text-muted-foreground",
};

const toneToTimeline: Record<RegimeTone, TimelineTone> = {
  bull: "bull",
  bear: "bear",
  warning: "warning",
  neutral: "neutral",
};

function fmtTime(at: number) {
  return new Date(at).toLocaleString("pl-PL", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

function fmtDuration(ms: number) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h`;
  return `${Math.round(h / 24)} d`;
}

export function RegimeHistoryPanel() {
  const history = useRegimeHistory();

  return (
    <section className="surface-glass rounded-xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-lg font-bold tracking-tight">Historia reżimów</h2>
          <span className="num text-xs tabular-nums text-muted-foreground">({history.length})</span>
        </div>
        {history.length > 0 && (
          <button
            type="button"
            onClick={() => { if (confirm("Wyczyścić historię reżimów?")) clearRegimeHistory(); }}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-background/60 px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <Trash2 className="h-3 w-3" /> Wyczyść
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Brak wpisów. Historia zapisuje się automatycznie przy każdej zmianie reżimu (auto lub ręcznej).
        </p>
      ) : (
        <Timeline>
          {history.map((h, i) => {
            const next = history[i - 1];
            const duration = next ? next.at - h.at : Date.now() - h.at;
            const isActive = i === 0;
            return (
              <TimelineItem
                key={`${h.at}-${h.id}`}
                tone={toneToTimeline[h.tone]}
                pulse={isActive}
                isLast={i === history.length - 1}
                title={
                  <>
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider",
                      toneChip[h.tone],
                    )}>
                      {h.label}
                    </span>
                    <span className="text-sm font-medium text-foreground/90">{h.pl}</span>
                  </>
                }
                time={
                  <>
                    {fmtTime(h.at)}
                    <span className="text-foreground/50"> · {fmtDuration(duration)}{isActive ? " (trwa)" : ""}</span>
                  </>
                }
                meta={
                  <>
                    <span className="num tabular-nums">pewność {h.confidence}%</span>
                    <span className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider",
                      h.source === "manual" ? "bg-warning/20 text-warning" : "bg-muted text-muted-foreground",
                    )}>
                      {h.source === "manual" ? "ręcznie" : "auto"}
                    </span>
                  </>
                }
              />
            );
          })}
        </Timeline>
      )}
    </section>
  );
}
