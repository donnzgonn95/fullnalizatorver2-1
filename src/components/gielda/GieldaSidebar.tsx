import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Flag, Globe2, Layers, Activity, BarChart3,
  Star, Compass, Wallet, NotebookPen, Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/gielda", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/gielda/usa", label: "USA", icon: Flag },
  { to: "/gielda/europa", label: "Europa", icon: Globe2 },
  { to: "/gielda/etf", label: "ETF / Fundusze", icon: Layers },
  { to: "/gielda/sektory", label: "Sektory", icon: BarChart3 },
  { to: "/gielda/makro", label: "Makro", icon: Activity },
  { to: "/gielda/watchlista", label: "Watchlista", icon: Star },
  { to: "/gielda/taktyki", label: "Taktyki", icon: Compass },
  { to: "/gielda/bajtlik", label: "Bajtlik / Portfel", icon: Wallet, auth: true },
  { to: "/gielda/dziennik", label: "Dziennik decyzji", icon: NotebookPen, auth: true },
  { to: "/gielda/agent", label: "Agent-Analityk", icon: Bot, auth: true },
] as const;

export function GieldaSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="lg:sticky lg:top-4">
      <nav className="rounded-xl border border-border bg-card p-2">
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Globalny portal
        </div>
        <ul className="space-y-0.5">
          {items.map((it) => {
            const active = it.exact ? path === it.to : path === it.to || path.startsWith(it.to + "/");
            const Icon = it.icon;
            return (
              <li key={it.to}>
                <Link
                  to={it.to}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{it.label}</span>
                  {"auth" in it && it.auth && (
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground/70">
                      log
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
