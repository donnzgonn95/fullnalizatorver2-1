// Watchlist store — Supabase-backed when logged in, localStorage fallback otherwise.
// Migrates legacy localStorage entries into the user's Supabase rows on first sign-in.
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";

const KEY = "watchlist:v1";
const EVT = "watchlist:changed";

function readLocal(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

function writeLocal(list: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(EVT));
}

async function fetchRemote(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("watchlist")
    .select("symbol")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) {
    console.warn("[watchlist] fetch failed");
    return [];
  }
  return data.map((r) => String(r.symbol).toUpperCase());
}

export function useWatchlist() {
  const { user, loading: authLoading } = useAuth();
  const [list, setList] = useState<string[]>([]);
  const migratedRef = useRef(false);

  // Hydrate + sync.
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    const reload = async () => {
      if (user) {
        // One-time migration of legacy local entries.
        if (!migratedRef.current) {
          migratedRef.current = true;
          const local = readLocal();
          if (local.length) {
            await supabase
              .from("watchlist")
              .upsert(
                local.map((symbol) => ({ user_id: user.id, symbol })),
                { onConflict: "user_id,symbol", ignoreDuplicates: true },
              );
            try {
              localStorage.removeItem(KEY);
            } catch { /* noop */ }
          }
        }
        const remote = await fetchRemote(user.id);
        if (!cancelled) setList(remote);
      } else {
        if (!cancelled) setList(readLocal());
      }
    };
    reload();
    const onLocal = () => {
      if (!user) setList(readLocal());
    };
    window.addEventListener(EVT, onLocal);
    window.addEventListener("storage", onLocal);
    return () => {
      cancelled = true;
      window.removeEventListener(EVT, onLocal);
      window.removeEventListener("storage", onLocal);
    };
  }, [user, authLoading]);

  const has = (sym: string) => list.includes(sym.toUpperCase());

  const add = async (sym: string) => {
    const s = sym.toUpperCase();
    if (list.includes(s)) return;
    const next = [...list, s];
    setList(next);
    if (user) {
      const { error } = await supabase
        .from("watchlist")
        .insert({ user_id: user.id, symbol: s });
      if (error) {
        console.warn("[watchlist] add failed");
        setList(list);
      }
    } else {
      writeLocal(next);
    }
  };

  const remove = async (sym: string) => {
    const s = sym.toUpperCase();
    const next = list.filter((x) => x !== s);
    setList(next);
    if (user) {
      const { error } = await supabase
        .from("watchlist")
        .delete()
        .eq("user_id", user.id)
        .eq("symbol", s);
      if (error) {
        console.warn("[watchlist] remove failed");
        setList(list);
      }
    } else {
      writeLocal(next);
    }
  };

  const toggle = async (sym: string) => {
    if (has(sym)) await remove(sym);
    else await add(sym);
  };

  return { list, has, toggle, remove, add };
}
