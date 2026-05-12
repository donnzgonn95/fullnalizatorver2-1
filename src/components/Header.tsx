import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  ArrowLeftRight,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  ChevronDown,
  Droplets,
  ChevronUp,
  RefreshCw,
  Settings,
  Sparkles,
  Target,
  Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLiveCoins } from "@/lib/binance";
import { CoinSearch } from "@/components/CoinSearch";
import { WatchlistMenu } from "@/components/WatchlistMenu";
import { openCommandPalette } from "@/lib/command-palette-bus";
import eljotLogo from "@/assets/eljot-logo.png";

const nav = [
  { to: "/", label: "Panel", icon: Sparkles },
  { to: "/sentyment", label: "Sentyment", icon: Activity },
  { to: "/przeplyw", label: "Przepływ", icon: ArrowLeftRight },
  { to: "/sila", label: "Siła", icon: BarChart3 },
  { to: "/setupy", label: "Setupy", icon: Target },
  { to: "/squeeze", label: "Squeeze", icon: Flame },
  { to: "/alerty", label: "Alerty", icon: Bell },
  { to: "/historia-alertow", label: "Historia", icon: Bell },
  { to: "/likwidacja", label: "Płynność", icon: Droplets },
  { to: "/asystent", label: "Asystent", icon: Bot },
  { to: "/slownik", label: "Słownik", icon: BookOpen },
  { to: "/ustawienia", label: "Ustawienia", icon: Settings },
] as const;

export function Header() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState(false);
  const qc = useQueryClient();
  const { data, isFetching, isError, dataUpdatedAt } = useLiveCoins();

  const isLive = !isError && !!data && data.length > 0;
  const status = isError
    ? { label: "brak połączenia", dot: "bg-bear" }
    : isFetching && !data
      ? { label: "łączę…", dot: "bg-warning animate-pulse" }
      : isLive
        ? { label: "dane na żywo", dot: "bg-bull animate-pulse" }
        : { label: "dane demo", dot: "bg-muted-foreground" };

  const updated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "—";

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: ["coins"] });
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[var(--surface-glass-border)] bg-background/70 backdrop-blur-xl backdrop-saturate-150">
      <div className="pointer-events-none absolute inset-0 -z-10 [background:var(--gradient-mesh)] opacity-60" />
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-3">
          <img
            src={eljotLogo}
            alt="Logo eL Jot"
            width={56}
            height={56}
            className="h-14 w-14 rounded-full"
          />
          <div className="leading-tight">
            <div className="text-base font-bold md:text-lg">Kukomy co w rynkach piszczy</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              DEMO · v0.1 · szczegółowa analiza struktury rynku by eL Jot
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <CoinSearch className="hidden md:block" />
          <button
            type="button"
            onClick={openCommandPalette}
            title="Otwórz wyszukiwarkę globalną (Ctrl/Cmd + K)"
            aria-label="Otwórz wyszukiwarkę globalną"
            className="hidden h-8 items-center gap-1.5 rounded-md border border-border bg-card px-2 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:inline-flex"
          >
            <span className="num rounded border border-border bg-background px-1 text-[10px]">⌘K</span>
          </button>
          <WatchlistMenu />
          <div
            className="hidden items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[10px] uppercase tracking-widest text-muted-foreground sm:flex"
            title={`Ostatnia aktualizacja: ${updated}`}
          >
            <span className={cn("inline-block h-1.5 w-1.5 rounded-full", status.dot)} />
            {status.label}
            {isLive && <span className="num normal-case tracking-normal text-foreground/70">· {updated}</span>}
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isFetching}
            aria-label="Odśwież dane"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
          </button>
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Rozwiń pasek" : "Zwiń pasek"}
            aria-expanded={!collapsed}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          <div className="mx-auto hidden max-w-6xl items-center gap-1 px-4 pb-2 md:flex">
            {nav.map((n) => {
              const active = path === n.to;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  {n.label}
                </Link>
              );
            })}
          </div>
          <div className="border-t border-border px-3 py-2 md:hidden">
            <CoinSearch />
          </div>
          <nav className="flex gap-1 overflow-x-auto border-t border-border px-3 py-2 md:hidden">
            {nav.map((n) => {
              const active = path === n.to;
              const Icon = n.icon;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "flex shrink-0 flex-col items-center gap-0.5 rounded-md px-3 py-1.5 text-[11px] transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </>
      )}
    </header>
  );
}
