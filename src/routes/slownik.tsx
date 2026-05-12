import { createFileRoute } from "@tanstack/react-router";
import { glossary } from "@/lib/demo-data";
import { seoHead, jsonLd } from "@/lib/seo";

export const Route = createFileRoute("/slownik")({
  head: () => ({
    ...seoHead({
      title: "Słownik tradera krypto po polsku",
      description: "Polskie tłumaczenia angielskich pojęć tradingowych: long, short, RSI, breakout, funding rate, likwidacja, POC i więcej.",
      path: "/slownik",
    }),
    scripts: [
      jsonLd({
        "@context": "https://schema.org",
        "@type": "DefinedTermSet",
        name: "Słownik tradera krypto",
        inLanguage: "pl",
        hasDefinedTerm: glossary.map((g) => ({
          "@type": "DefinedTerm",
          name: g.term,
          alternateName: g.pl,
          description: g.desc,
        })),
      }),
    ],
  }),
  component: SlownikPage,
});

function SlownikPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Słownik tradera</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Angielskie pojęcia tradingowe wytłumaczone po ludzku, po polsku.
        </p>
      </header>

      <section className="grid gap-3 md:grid-cols-2">
        {glossary.map((g) => (
          <article key={g.term} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-bold">{g.term}</h2>
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">{g.pl}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{g.desc}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
