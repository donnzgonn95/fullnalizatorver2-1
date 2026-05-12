import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Supabase JS auto-handles the URL hash session via detectSessionInUrl on load.
      const { data, error } = await supabase.auth.getSession();
      if (cancelled) return;
      if (error) {
        setError(error.message);
        return;
      }
      if (data.session) {
        navigate({ to: "/" });
      } else {
        // Wait briefly for onAuthStateChange to populate, then go home regardless.
        setTimeout(() => navigate({ to: "/login" }), 600);
      }
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
      {error ? (
        <p className="text-destructive">Błąd logowania: {error}</p>
      ) : (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          Logowanie…
        </>
      )}
    </div>
  );
}
