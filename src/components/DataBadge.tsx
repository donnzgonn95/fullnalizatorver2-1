// Etykieta źródła danych: REAL / PROXY / DEMO. Używana w panelach analitycznych,
// żeby użytkownik wiedział, czy widzi dane z API, estymację, czy demo.
import { cn } from "@/lib/utils";

export type DataKind = "real" | "proxy" | "demo";

const STYLES: Record<DataKind, string> = {
  real: "bg-bull/15 text-bull border-bull/30",
  proxy: "bg-warning/15 text-warning border-warning/30",
  demo: "bg-muted text-muted-foreground border-border",
};

const LABELS: Record<DataKind, string> = {
  real: "REAL DATA",
  proxy: "PROXY",
  demo: "DEMO",
};

const TITLES: Record<DataKind, string> = {
  real: "Dane realne pobierane bezpośrednio z API rynkowego.",
  proxy: "Estymacja heurystyczna na podstawie innych danych — nie surowe dane on-chain.",
  demo: "Dane demonstracyjne / syntetyczne — nie używaj do decyzji tradingowych.",
};

export function DataBadge({ kind, className, label }: { kind: DataKind; className?: string; label?: string }) {
  return (
    <span
      title={TITLES[kind]}
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        STYLES[kind],
        className,
      )}
    >
      {label ?? LABELS[kind]}
    </span>
  );
}
