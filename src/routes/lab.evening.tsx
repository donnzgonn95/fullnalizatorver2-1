import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { generateEveningReport } from "@/lib/lab/reports";
import { seoHead } from "@/lib/seo";
import { Moon } from "lucide-react";

export const Route = createFileRoute("/lab/evening")({
  head: () => ({ ...seoHead({ title: "Evening Report — Lab", description: "Podsumowanie sesji USA o 21:00 (mock).", path: "/lab/evening" }) }),
  component: EveningPage,
});

function EveningPage() {
  const [date] = useState(() => new Date().toISOString().slice(0, 10));
  const r = useMemo(() => generateEveningReport(date), [date]);

  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Lab · Evening Report</div>
        <h1 className="mt-1 text-2xl font-bold flex items-center gap-2"><Moon className="h-5 w-5" /> {r.date} · 21:00</h1>
      </header>
      <Section title="Headline">{r.headline}</Section>
      <Section title="Podsumowanie sesji USA">{r.summary}</Section>
      <ListSection title="Rotacja sektorowa" items={r.sector_rotation} />
      <ListSection title="Przepływy kapitału" items={r.flows} />
      <Section title="Skuteczność decyzji agenta">
        Decyzji: <b>{r.agent_performance.decisions}</b> · Zatwierdzonych: <b>{r.agent_performance.approved}</b> ·
        Trafionych: <b className="text-bull">{r.agent_performance.hit}</b> · Chybionych: <b className="text-bear">{r.agent_performance.miss}</b> ·
        Winrate: <b>{(r.agent_performance.winrate * 100).toFixed(0)}%</b>
      </Section>
      <ListSection title="Setupy na kolejny dzień" items={r.setups_for_tomorrow} />
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
function ListSection({ title, items }: { title: string; items: string[] }) {
  return <Section title={title}><ul className="list-disc pl-5 space-y-1">{items.map((x, i) => <li key={i}>{x}</li>)}</ul></Section>;
}
