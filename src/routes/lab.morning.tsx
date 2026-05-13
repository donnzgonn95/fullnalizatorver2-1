import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { generateMorningReport } from "@/lib/lab/reports";
import { seoHead } from "@/lib/seo";
import { Sunrise } from "lucide-react";

export const Route = createFileRoute("/lab/morning")({
  head: () => ({ ...seoHead({ title: "Morning Report — Lab", description: "Plan sesji o 5:10 (mock).", path: "/lab/morning" }) }),
  component: MorningPage,
});

function MorningPage() {
  const [date] = useState(() => new Date().toISOString().slice(0, 10));
  const r = useMemo(() => generateMorningReport(date), [date]);

  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Lab · Morning Report</div>
        <h1 className="mt-1 text-2xl font-bold flex items-center gap-2"><Sunrise className="h-5 w-5" /> {r.date} · 5:10</h1>
      </header>
      <Section title="Headline">{r.headline}</Section>
      <ListSection title="Ostatnie 5–7 dni" items={r.last5to7} />
      <ListSection title="Kluczowe wydarzenia dnia" items={r.key_events} />
      <ListSection title="Sygnały poprzedzające" items={r.leading_signals} />
      <ListSection title="Preferowane taktyki" items={r.preferred_tactics} />
      <ListSection title="Instrumenty do obserwacji" items={r.watchlist} mono />
      <ListSection title="Ryzyka dnia" items={r.risks} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">{title}</h2>
      <div className="text-sm">{children}</div>
    </section>
  );
}
function ListSection({ title, items, mono }: { title: string; items: string[]; mono?: boolean }) {
  return (
    <Section title={title}>
      <ul className="list-disc pl-5 space-y-1">
        {items.map((x, i) => <li key={i} className={mono ? "font-mono text-xs" : ""}>{x}</li>)}
      </ul>
    </Section>
  );
}
