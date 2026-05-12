import { createFileRoute } from "@tanstack/react-router";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/disclaimer")({
  head: () => ({ ...seoHead({ title: "Ryzyko inwestycyjne", description: "Disclaimer i ryzyko inwestycyjne.", path: "/disclaimer" }) }),
  component: () => (
    <article className="prose prose-invert mx-auto max-w-2xl">
      <h1>Ryzyko inwestycyjne</h1>
      <p>
        Inwestowanie w kryptowaluty wiąże się z wysokim ryzykiem utraty części lub całości kapitału. Treści w aplikacji
        mają charakter wyłącznie edukacyjny i informacyjny i nie stanowią porady ani rekomendacji inwestycyjnej.
      </p>
      <p>
        Każdą decyzję inwestycyjną podejmujesz samodzielnie, na własną odpowiedzialność. Operator nie ponosi
        odpowiedzialności za skutki finansowe takich decyzji.
      </p>
    </article>
  ),
});
