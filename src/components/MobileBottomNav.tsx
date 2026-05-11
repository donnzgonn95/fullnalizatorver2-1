// Trwały dolny pasek nawigacyjny dla mobile. Nie zaburza deep-linków —
// renderuje zwykłe <Link/> z TanStack Routera, więc URL pozostaje źródłem prawdy.
import { Link, useRouterState } from "@tanstack/react-router";
import { Bot, Settings, Sparkles, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWatchlist } from "@/lib/watchlist";

const items = [
  { to: "/", label: "Panel", icon: Sparkles },
  { to: "/ulubione", label: "Ulubione", icon: Star },
  { to: "/asystent", label: "Asystent", icon: Bot },
  { to: "/ustawienia", label: "Ustawienia", icon: Settings },
] as const;

export function MobileBottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { list } = useWatchlist();

  return (
    <nav
      data-testid="mobile-bottom-nav"
      aria-label="Główna nawigacja mobilna"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto grid max-w-6xl grid-cols-4">
        {items.map((it) => {
          const active = path === it.to || (it.to !== "/" && path.startsWith(it.to));
          const Icon = it.icon;
          const showBadge = it.to === "/ulubione" && list.length > 0;
          return (
            <li key={it.to}>
              <Link
                to={it.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "fill-primary/10")} />
                <span>{it.label}</span>
                {showBadge && (
                  <span className="num absolute right-[20%] top-1 rounded-full bg-warning px-1.5 text-[9px] font-bold text-background">
                    {list.length}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
