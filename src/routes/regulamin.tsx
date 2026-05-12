import { createFileRoute } from "@tanstack/react-router";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/regulamin")({
  head: () => ({ ...seoHead({ title: "Regulamin", description: "Regulamin korzystania z CryptoPuls.", path: "/regulamin" }) }),
  component: () => (
    <article className="prose prose-invert mx-auto max-w-2xl">
      <h1>Regulamin</h1>
      <p>CryptoPuls jest narzędziem edukacyjnym do analizy rynku kryptowalut. Korzystając z aplikacji akceptujesz poniższe zasady.</p>
      <h2>1. Charakter usługi</h2>
      <p>Aplikacja prezentuje dane rynkowe i analizy w celach informacyjnych. Nie stanowi rekomendacji inwestycyjnej.</p>
      <h2>2. Konto</h2>
      <p>Użytkownik odpowiada za bezpieczeństwo swoich danych logowania. Konto jest osobiste.</p>
      <h2>3. Odpowiedzialność</h2>
      <p>Operator nie odpowiada za decyzje inwestycyjne podejmowane na podstawie danych z aplikacji.</p>
    </article>
  ),
});
