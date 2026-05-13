import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type FeatureVariant = "orange" | "mint" | "cyan" | "bear" | "warning" | "neutral";

const variantStyles: Record<FeatureVariant, { ring: string; chip: string; glow: string }> = {
  orange: {
    ring: "border-l-4 border-l-[var(--accent-orange)]",
    chip: "bg-[var(--accent-orange)]/15 text-[var(--accent-orange)]",
    glow: "hover:shadow-[0_0_28px_-12px_var(--accent-orange)]",
  },
  mint: {
    ring: "border-l-4 border-l-[var(--accent-mint)]",
    chip: "bg-[var(--accent-mint)]/15 text-[var(--accent-mint)]",
    glow: "hover:shadow-[0_0_28px_-12px_var(--accent-mint)]",
  },
  cyan: {
    ring: "border-l-4 border-l-[var(--accent-cyan)]",
    chip: "bg-[var(--accent-cyan)]/15 text-[var(--accent-cyan)]",
    glow: "hover:shadow-[0_0_28px_-12px_var(--accent-cyan)]",
  },
  bear: {
    ring: "border-l-4 border-l-[var(--accent-coral)]",
    chip: "bg-[var(--accent-coral)]/15 text-[var(--accent-coral)]",
    glow: "hover:shadow-[0_0_28px_-12px_var(--accent-coral)]",
  },
  warning: {
    ring: "border-l-4 border-l-[var(--accent-warning)]",
    chip: "bg-[var(--accent-warning)]/15 text-[var(--accent-warning)]",
    glow: "hover:shadow-[0_0_28px_-12px_var(--accent-warning)]",
  },
  neutral: {
    ring: "border-l-4 border-l-[var(--accent-neutral)]",
    chip: "bg-[var(--accent-neutral)]/15 text-[var(--accent-neutral)]",
    glow: "hover:shadow-[0_0_28px_-12px_var(--accent-neutral)]",
  },
};

interface Props {
  variant?: FeatureVariant;
  icon?: LucideIcon;
  title: ReactNode;
  badge?: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  children?: ReactNode;
  size?: "sm" | "md" | "lg";
}

export function FeatureCard({
  variant = "orange",
  icon: Icon,
  title,
  badge,
  description,
  action,
  className,
  children,
  size = "md",
}: Props) {
  const v = variantStyles[variant];
  const padding = size === "lg" ? "p-6 md:p-8" : size === "sm" ? "p-4" : "p-5 md:p-6";
  return (
    <section
      className={cn(
        "quant-card relative overflow-hidden transition-all",
        v.ring,
        v.glow,
        padding,
        className,
      )}
    >
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <span className={cn("inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", v.chip)}>
              <Icon className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-foreground md:text-base">
                {title}
              </h3>
              {badge && (
                <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", v.chip)}>
                  {badge}
                </span>
              )}
            </div>
            {description && (
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      {children && <div>{children}</div>}
    </section>
  );
}
