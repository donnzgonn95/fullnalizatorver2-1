import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    ...seoHead({ title: "Reset hasła", description: "Zresetuj swoje hasło w CryptoPuls.", path: "/reset-password" }),
  }),
  component: ResetPage,
});

function ResetPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash.includes("type=recovery")) {
      setRecoveryMode(true);
    }
  }, []);

  const requestReset = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) setError(error.message);
    else setInfo("Wysłaliśmy link do zresetowania hasła. Sprawdź skrzynkę email.");
  };

  const updatePassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (newPassword.length < 8) {
      setError("Hasło musi mieć co najmniej 8 znaków.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) setError(error.message);
    else setInfo("Hasło zaktualizowane. Możesz się teraz zalogować.");
  };

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Reset hasła</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {recoveryMode ? "Ustaw nowe hasło." : "Wyślemy link resetujący na podany email."}
        </p>
      </header>
      <form onSubmit={recoveryMode ? updatePassword : requestReset}
        className="space-y-4 rounded-xl border border-border bg-card p-6">
        {recoveryMode ? (
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Nowe hasło</label>
            <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" autoComplete="new-password" />
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" autoComplete="email" />
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {info && <p className="text-sm text-bull">{info}</p>}
        <button type="submit" disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {recoveryMode ? "Ustaw nowe hasło" : "Wyślij link"}
        </button>
        <p className="text-center text-xs text-muted-foreground">
          <Link to="/login" search={{ redirect: "/" }} className="underline hover:text-foreground">Powrót do logowania</Link>
        </p>
      </form>
    </div>
  );
}
