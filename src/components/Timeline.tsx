import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Premium Activity Timeline
 * Wertykalna oś czasu z kropkami, używana m.in. w panelu historii reżimów.
 * Tokeny: --color-border, --color-card, --color-primary/bull/bear/warning/neutral, --font-display.
 */

export type TimelineTone = "bull" | "bear" | "warning" | "neutral" | "primary";

const dotTone: Record<TimelineTone, string> = {
  bull: "bg-bull shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-bull)_22%,transparent)]",
  bear: "bg-bear shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-bear)_22%,transparent)]",
  warning: "bg-warning shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-warning)_22%,transparent)]",
  neutral: "bg-neutral shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-neutral)_18%,transparent)]",
  primary: "bg-primary shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-primary)_22%,transparent)]",
};

export interface TimelineItemProps {
  tone?: TimelineTone;
  /** Krótki czas/odstęp wyrównany do osi liczbowej */
  time?: React.ReactNode;
  /** Pasek nagłówka — zwykle chip + tytuł */
  title: React.ReactNode;
  /** Drugorzędne meta — etykiety, źródło, pewność */
  meta?: React.ReactNode;
  /** Treść pod tytułem */
  children?: React.ReactNode;
  isLast?: boolean;
  /** Migotanie kropki dla wpisu aktywnego (np. „trwa") */
  pulse?: boolean;
}

export function TimelineItem({
  tone = "primary",
  time,
  title,
  meta,
  children,
  isLast,
  pulse,
}: TimelineItemProps) {
  return (
    <li className="relative grid grid-cols-[1.25rem_1fr] gap-x-3 pb-5 last:pb-0">
      {/* rail */}
      {!isLast && (
        <span
          aria-hidden
          className="absolute left-[0.55rem] top-3 h-full w-px bg-gradient-to-b from-border via-border/70 to-transparent"
        />
      )}
      {/* dot */}
      <span className="relative mt-1.5 flex h-3 w-3 items-center justify-center">
        <span
          className={cn(
            "h-2.5 w-2.5 rounded-full ring-1 ring-background",
            dotTone[tone],
            pulse && "animate-pulse",
          )}
        />
      </span>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">{title}</div>
          {time && (
            <span className="num ml-auto text-xs tabular-nums tracking-tight text-muted-foreground">
              {time}
            </span>
          )}
        </div>
        {meta && (
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {meta}
          </div>
        )}
        {children && <div className="mt-1.5 text-sm text-foreground/85">{children}</div>}
      </div>
    </li>
  );
}

export function Timeline({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <ol className={cn("relative", className)}>{children}</ol>;
}
