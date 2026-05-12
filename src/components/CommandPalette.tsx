import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, Star, Clock, Sparkles, Activity, BarChart3, Bell, Bot, Droplets, BookOpen, Settings, Target, ArrowLeftRight } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useTopCoins } from "@/lib/top-coins";
import { useWatchlist } from "@/lib/watchlist";
import { getRecentCoins } from "@/lib/recent-coins";
import { COMMAND_PALETTE_OPEN_EVENT } from "@/lib/command-palette-bus";

const PAGES = [
  { to: "/", label: "Panel", icon: Sparkles },
  { to: "/sentyment", label: "Sentyment", icon: Activity },
  { to: "/przeplyw", label: "Przepływ kapitału", icon: ArrowLeftRight },
  { to: "/sila", label: "Ranking siły", icon: BarChart3 },
  { to: "/setupy", label: "Setupy", icon: Target },
  { to: "/alerty", label: "Alerty", icon: Bell },
  { to: "/historia-alertow", label: "Historia alertów", icon: Bell },
  { to: "/likwidacja", label: "Płynność", icon: Droplets },
  { to: "/asystent", label: "Asystent AI", icon: Bot },
  { to: "/slownik", label: "Słownik", icon: BookOpen },
  { to: "/ustawienia", label: "Ustawienia", icon: Settings },
] as const;

const INITIAL_PAGE = 30;
const PAGE_STEP = 30;

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: coins } = useTopCoins(open);
  const { list: watchlist } = useWatchlist();
  const [recent, setRecent] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(INITIAL_PAGE);

  // Cmd/Ctrl + K toggle
  useEffect(() => {
    function down(e: KeyboardEvent) {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Programowe otwieranie z dowolnego miejsca w UI (Header, WatchlistPanel, /ulubione).
  useEffect(() => {
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener(COMMAND_PALETTE_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(COMMAND_PALETTE_OPEN_EVENT, onOpen);
  }, []);

  // Refresh recents and reset paging when (re)opened.
  useEffect(() => {
    if (open) {
      setRecent(getRecentCoins());
      setSearch("");
      setVisibleCount(INITIAL_PAGE);
    }
  }, [open]);

  // Reset visible count whenever query changes.
  useEffect(() => {
    setVisibleCount(INITIAL_PAGE);
  }, [search]);

  const recentCoins = useMemo(() => {
    if (!coins) return [];
    return recent
      .map((s) => coins.find((c) => c.symbol === s))
      .filter((c): c is NonNullable<typeof c> => !!c);
  }, [recent, coins]);

  const watchlistCoins = useMemo(() => {
    if (!coins) return [];
    return watchlist
      .map((s) => coins.find((c) => c.symbol === s))
      .filter((c): c is NonNullable<typeof c> => !!c);
  }, [watchlist, coins]);

  // Pre-filter Top 100 server-side (by query) so cmdk renders fewer DOM nodes.
  const filteredTop = useMemo(() => {
    const list = coins ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list.slice(0, 100);
    return list.filter(
      (c) => c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
    );
  }, [coins, search]);

  const visibleTop = filteredTop.slice(0, visibleCount);

  function go(symbol: string) {
    setOpen(false);
    navigate({ to: "/coin/$symbol", params: { symbol: symbol.toUpperCase() } });
  }

  function goPage(to: string) {
    setOpen(false);
    navigate({ to });
  }

  // Explicit keyboard handling — cmdk handles Up/Down/Enter natively;
  // we ensure Escape closes even when focus is inside the list.
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <div onKeyDown={handleKeyDown} data-testid="command-palette">
        <CommandInput
          placeholder="Szukaj coina lub strony… (Ctrl/Cmd + K)"
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>Brak wyników.</CommandEmpty>

          {recentCoins.length > 0 && (
            <CommandGroup heading="Ostatnio oglądane">
              {recentCoins.map((c) => (
                <CommandItem key={`r-${c.symbol}`} value={`recent ${c.symbol} ${c.name}`} onSelect={() => go(c.symbol)}>
                  <Clock className="mr-2 h-4 w-4 opacity-60" />
                  <span className="font-semibold">{c.symbol}</span>
                  <span className="ml-2 text-muted-foreground">{c.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {watchlistCoins.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Ulubione">
                {watchlistCoins.map((c) => (
                  <CommandItem key={`w-${c.symbol}`} value={`fav ${c.symbol} ${c.name}`} onSelect={() => go(c.symbol)}>
                    <Star className="mr-2 h-4 w-4 text-warning" />
                    <span className="font-semibold">{c.symbol}</span>
                    <span className="ml-2 text-muted-foreground">{c.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          <CommandSeparator />
          <CommandGroup heading={`Top kryptowaluty (${filteredTop.length})`}>
            {visibleTop.map((c) => (
              <CommandItem key={c.symbol} value={`coin ${c.symbol} ${c.name}`} onSelect={() => go(c.symbol)}>
                <Search className="mr-2 h-4 w-4 opacity-60" />
                <span className="font-semibold">{c.symbol}</span>
                <span className="ml-2 text-muted-foreground">{c.name}</span>
                {c.rank && <span className="num ml-auto text-xs text-muted-foreground">#{c.rank}</span>}
              </CommandItem>
            ))}
            {filteredTop.length > visibleCount && (
              <CommandItem
                key="__load_more"
                value="__load_more"
                onSelect={() => setVisibleCount((n) => n + PAGE_STEP)}
                className="justify-center text-xs text-muted-foreground"
              >
                Pokaż więcej ({filteredTop.length - visibleCount} pozostało)
              </CommandItem>
            )}
          </CommandGroup>

          <CommandSeparator />
          <CommandGroup heading="Strony">
            {PAGES.map((p) => {
              const Icon = p.icon;
              return (
                <CommandItem key={p.to} value={`page ${p.label}`} onSelect={() => goPage(p.to)}>
                  <Icon className="mr-2 h-4 w-4 opacity-60" />
                  {p.label}
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </div>
    </CommandDialog>
  );
}
