import { Trash2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { clearRegimeHistory, useRegimeHistory } from "@/lib/regime-store";
import type { RegimeTone } from "@/lib/market-regime";

const toneChip: Record<RegimeTone, string> = {
  bull: "bg-bull/20 text-bull",
  bear: "bg-bear/20 text-bear",
  warning: "bg-warning/20 text-warning",
  neutral: "bg-muted text-muted-foreground",
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
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-lg font-bold">Historia reżimów</h2>
          <span className="num text-xs text-muted-foreground">({history.length})</span>
        </div>
        {history.length > 0 && (
          <button
            type="button"
            onClick={() => { if (confirm("Wyczyścić historię reżimów?")) clearRegimeHistory(); }}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
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
        <ul className="divide-y divide-border">
          {history.map((h, i) => {
            const next = history[i - 1];
            const duration = next ? next.at - h.at : Date.now() - h.at;
            return (
              <li key={`${h.at}-${h.id}`} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider", toneChip[h.tone])}>
                  {h.label}
                </span>
                <span className="text-muted-foreground">{h.pl}</span>
                <span className="num text-xs text-muted-foreground">pewność {h.confidence}%</span>
                <span className={cn("rounded px-1.5 py-0.5 text-[10px] uppercase",
                  h.source === "manual" ? "bg-warning/20 text-warning" : "bg-muted text-muted-foreground")}>
                  {h.source === "manual" ? "ręcznie" : "auto"}
                </span>
                <span className="ml-auto num text-xs text-muted-foreground">
                  {fmtTime(h.at)} <span className="text-foreground/60">· {fmtDuration(duration)}{i === 0 ? " (trwa)" : ""}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
