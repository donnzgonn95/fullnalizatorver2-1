import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, FlaskConical, FileBarChart, ScanSearch, ShieldAlert,
  Notebook, Send, Sunrise, Moon, Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/lab", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/lab/backtest", label: "Backtest 3M", icon: FileBarChart },
  { to: "/lab/paper", label: "Paper Trading", icon: FlaskConical },
  { to: "/lab/scanner", label: "Setup Scanner", icon: ScanSearch },
  { to: "/lab/risk", label: "Risk Engine", icon: ShieldAlert },
  { to: "/lab/journal", label: "Trade Journal", icon: Notebook },
  { to: "/lab/telegram", label: "Telegram Alerts", icon: Send },
  { to: "/lab/morning", label: "Morning Report", icon: Sunrise },
  { to: "/lab/evening", label: "Evening Report", icon: Moon },
  { to: "/lab/ledger", label: "Bajtlik Ledger", icon: Wallet },
] as const;

export function LabSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="lg:sticky lg:top-4">
      <nav className="rounded-xl border border-border bg-card p-2">
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Agent Trading Lab
        </div>
        <ul className="space-y-0.5">
          {items.map((it) => {
            const exact = "exact" in it ? it.exact : false;
            const active = exact ? path === it.to : path === it.to || path.startsWith(it.to + "/");
            const Icon = it.icon;
            return (
              <li key={it.to}>
                <Link to={it.to} className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}>
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{it.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
