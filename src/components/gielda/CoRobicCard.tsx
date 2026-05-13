import { ShieldAlert, ShieldCheck, Target, TrendingDown, TrendingUp } from "lucide-react";
import type { DecisionVerdictResult } from "@/lib/gielda/types";
import { cn } from "@/lib/utils";

const VERDICT_STYLE: Record<DecisionVerdictResult["verdict"], { label: string; className: string; icon: React.ReactNode }> = {
  czekaj:       { label: "CZEKAJ",        className: "bg-muted text-foreground",       icon: <ShieldCheck className="h-4 w-4" /> },
  obserwuj:     { label: "OBSERWUJ",      className: "bg-warning/20 text-warning",     icon: <Target className="h-4 w-4" /> },
  akumuluj:     { label: "AKUMULUJ",      className: "bg-bull/20 text-bull",           icon: <TrendingUp className="h-4 w-4" /> },
  redukuj:      { label: "REDUKUJ",       className: "bg-bear/20 text-bear",           icon: <TrendingDown className="h-4 w-4" /> },
  zabezpieczaj: { label: "ZABEZPIECZAJ",  className: "bg-bear/30 text-bear",           icon: <ShieldAlert className="h-4 w-4" /> },
};

export function CoRobicCard({ result }: { result: DecisionVerdictResult }) {
  const v = VERDICT_STYLE[result.verdict];
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Co robić?</div>
          <div className={cn("mt-1 inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-bold", v.className)}>
            {v.icon} {v.label}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <Stat label="Conviction" value={`${result.conviction}`} suffix="/100" tone="bull" />
          <Stat label="Risk" value={`${result.risk}`} suffix="/100" tone="bear" />
          <Stat label="Horyzont" value={result.horizon} />
        </div>
      </div>

      <p className="mt-4 text-sm text-foreground">{result.rationale}</p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Block title="Czynniki potwierdzające" tone="bull" items={result.supports} emptyText="Brak silnych potwierdzeń." />
        <Block title="Czynniki ostrzegawcze" tone="bear" items={result.warnings} emptyText="Brak istotnych ostrzeżeń." />
      </div>
    </section>
  );
}

function Stat({ label, value, suffix, tone }: { label: string; value: string; suffix?: string; tone?: "bull" | "bear" }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={cn("num text-base font-bold", tone === "bull" && "text-bull", tone === "bear" && "text-bear")}>
        {value}<span className="ml-0.5 text-xs text-muted-foreground">{suffix}</span>
      </div>
    </div>
  );
}

function Block({ title, items, tone, emptyText }: { title: string; items: string[]; tone: "bull" | "bear"; emptyText: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className={cn("text-xs font-semibold uppercase tracking-wider", tone === "bull" ? "text-bull" : "text-bear")}>{title}</div>
      {items.length === 0 ? (
        <div className="mt-2 text-xs text-muted-foreground">{emptyText}</div>
      ) : (
        <ul className="mt-2 space-y-1 text-sm">
          {items.map((s, i) => (
            <li key={i} className="flex gap-2">
              <span className={cn("mt-1.5 h-1 w-1 rounded-full", tone === "bull" ? "bg-bull" : "bg-bear")} />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
