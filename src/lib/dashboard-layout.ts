// Konfiguracja pulpitu (kolejność sekcji + zwinięte panele) w localStorage.
import { useEffect, useState } from "react";

const KEY = "eljot-dashboard-layout-v1";
const EVT = "eljot-dashboard-layout:changed";

export const DEFAULT_SECTION_ORDER = [
  "regime",
  "watchlist",
  "tickers",
  "stats",
  "setups",
  "alerts",
  "history",
] as const;

export type SectionId = (typeof DEFAULT_SECTION_ORDER)[number];

export type DashboardLayout = {
  order: SectionId[];
  collapsed: Partial<Record<SectionId, boolean>>;
};

const DEFAULT: DashboardLayout = {
  order: [...DEFAULT_SECTION_ORDER],
  collapsed: {},
};

function read(): DashboardLayout {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Partial<DashboardLayout>;
    const validIds = new Set(DEFAULT_SECTION_ORDER);
    const cleaned = (parsed.order ?? []).filter((id): id is SectionId => validIds.has(id as SectionId));
    // Dodaj brakujące sekcje na końcu (np. po deployu nowej sekcji).
    const order = [...cleaned, ...DEFAULT_SECTION_ORDER.filter((id) => !cleaned.includes(id))];
    return { order, collapsed: parsed.collapsed ?? {} };
  } catch {
    return DEFAULT;
  }
}

function write(layout: DashboardLayout) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(layout));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function useDashboardLayout() {
  const [layout, setLayout] = useState<DashboardLayout>(DEFAULT);
  useEffect(() => {
    const reload = () => setLayout(read());
    reload();
    window.addEventListener(EVT, reload);
    window.addEventListener("storage", reload);
    return () => {
      window.removeEventListener(EVT, reload);
      window.removeEventListener("storage", reload);
    };
  }, []);

  const toggleCollapsed = (id: SectionId) => {
    const cur = read();
    const next = { ...cur, collapsed: { ...cur.collapsed, [id]: !cur.collapsed[id] } };
    write(next);
    setLayout(next);
  };

  const move = (id: SectionId, dir: -1 | 1) => {
    const cur = read();
    const idx = cur.order.indexOf(id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= cur.order.length) return;
    const order = [...cur.order];
    [order[idx], order[target]] = [order[target], order[idx]];
    const next = { ...cur, order };
    write(next);
    setLayout(next);
  };

  const reset = () => {
    write(DEFAULT);
    setLayout(DEFAULT);
  };

  return { layout, toggleCollapsed, move, reset };
}
