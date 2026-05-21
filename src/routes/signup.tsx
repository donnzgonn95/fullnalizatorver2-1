import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { seoHead } from "@/lib/seo";
import { GoogleButton } from "@/components/auth/GoogleButton";

export const Route = createFileRoute("/signup")({
  head: () => ({
    ...seoHead({ title: "Rejestracja", description: "Załóż konto w CryptoPuls.", path: "/signup" }),
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (password !== confirm) {
      setError("Hasła nie są zgodne.");
      return;
    }
    if (password.length < 8) {
      setError("Hasło musi mieć co najmniej 8 znaków.");
      return;
    }
    if (!accepted) {
      setError("Musisz zaakceptować regulamin, politykę prywatności i ryzyko inwestycyjne.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data.session) {
      navigate({ to: "/" });
    } else {
      setInfo("Konto utworzone. Sprawdź skrzynkę email i potwierdź adres, aby się zalogować.");
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Załóż konto</h1>
        <p className="mt-1 text-sm text-muted-foreground">Dołącz do CryptoPuls.</p>
      </header>
      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border bg-card p-6">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" autoComplete="email" />
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Hasło</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" autoComplete="new-password" />
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Powtórz hasło</label>
          <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" autoComplete="new-password" />
        </div>
        <label className="flex items-start gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5" />
          <span>
            Akceptuję{" "}
            <Link to="/regulamin" className="underline hover:text-foreground">regulamin</Link>,{" "}
            <Link to="/polityka-prywatnosci" className="underline hover:text-foreground">politykę prywatności</Link>{" "}
            oraz{" "}
            <Link to="/disclaimer" className="underline hover:text-foreground">ryzyko inwestycyjne</Link>.
          </span>
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {info && <p className="text-sm text-bull">{info}</p>}
        <button type="submit" disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Załóż konto
        </button>
        <div className="relative my-2 text-center text-[11px] uppercase tracking-widest text-muted-foreground">
          <span className="bg-card px-2">lub</span>
          <div className="absolute inset-x-0 top-1/2 -z-10 h-px bg-border" />
        </div>
        <GoogleButton label="Załóż konto przez Google" />
        <p className="text-center text-xs text-muted-foreground">
          Masz już konto? <Link to="/login" search={{}} className="underline hover:text-foreground">Zaloguj się</Link>
        </p>
      </form>
    </div>
  );
}
