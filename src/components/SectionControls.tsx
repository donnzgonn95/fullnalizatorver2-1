// Wspólny pasek nagłówka sekcji pulpitu — zwijanie + zmiana kolejności.
import { ChevronDown, ChevronUp, ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SectionId } from "@/lib/dashboard-layout";
import { useDashboardLayout } from "@/lib/dashboard-layout";

export function SectionControls({
  id,
  title,
  children,
  className,
}: {
  id: SectionId;
  title: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const { layout, toggleCollapsed, move } = useDashboardLayout();
  const collapsed = !!layout.collapsed[id];
  const idx = layout.order.indexOf(id);
  const last = layout.order.length - 1;

  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-2", className)}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => toggleCollapsed(id)}
          aria-label={collapsed ? "Rozwiń sekcję" : "Zwiń sekcję"}
          aria-expanded={!collapsed}
          data-testid={`section-toggle-${id}`}
          className="inline-flex h-6 w-6 items-center justify-center rounded border border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </button>
        {title}
      </div>
      <div className="flex items-center gap-1">
        {children}
        <button
          type="button"
          onClick={() => move(id, -1)}
          disabled={idx <= 0}
          aria-label="Przesuń w górę"
          data-testid={`section-up-${id}`}
          className="inline-flex h-6 w-6 items-center justify-center rounded border border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30"
        >
          <ArrowUp className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={() => move(id, 1)}
          disabled={idx >= last}
          aria-label="Przesuń w dół"
          data-testid={`section-down-${id}`}
          className="inline-flex h-6 w-6 items-center justify-center rounded border border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30"
        >
          <ArrowDown className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
