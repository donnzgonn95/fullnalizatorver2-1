/**
 * Mały klientowy guard używany w trasach `/gielda/*`, które wymagają
 * zalogowania, ale są zagnieżdżone w layoucie `/gielda` (poza
 * `_authenticated/`).
 */
import { useEffect, useState } from "react";
import { Navigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

type State = "loading" | "ok" | "anon";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setState(data.session ? "ok" : "anon");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setState(session ? "ok" : "anon");
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  if (state === "loading") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Sprawdzam sesję…
      </div>
    );
  }
  if (state === "anon") {
    return <Navigate to="/login" search={{ redirect: typeof window !== "undefined" ? window.location.pathname : "/gielda" }} />;
  }
  return <>{children}</>;
}
