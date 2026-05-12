import { createFileRoute } from "@tanstack/react-router";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/polityka-prywatnosci")({
  head: () => ({ ...seoHead({ title: "Polityka prywatności", description: "Jak CryptoPuls przetwarza dane użytkowników.", path: "/polityka-prywatnosci" }) }),
  component: () => (
    <article className="prose prose-invert mx-auto max-w-2xl">
      <h1>Polityka prywatności</h1>
      <p>Przetwarzamy minimalny zakres danych potrzebnych do działania konta (email, identyfikator, preferencje).</p>
      <h2>Dane logowania</h2>
      <p>Email oraz zaszyfrowane hasło przechowywane są w infrastrukturze backendu (Lovable Cloud / Supabase Auth).</p>
      <h2>Dane lokalne</h2>
      <p>Watchlisty, alerty i ustawienia mogą być zapisywane w przeglądarce (localStorage).</p>
      <h2>Twoje prawa</h2>
      <p>Możesz w każdej chwili usunąć konto i powiązane dane.</p>
    </article>
  ),
});
