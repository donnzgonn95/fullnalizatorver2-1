import { Link } from "@tanstack/react-router";
import { Bitcoin, LineChart, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const KEY = "app.preferred-mode";
type Mode = "krypto" | "gielda";

export function ModeSwitcher() {
  const [pref, setPref] = useState<Mode | null>(null);
  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY) as Mode | null;
      if (v) setPref(v);
    } catch {}
  }, []);

  const set = (m: Mode) => {
    setPref(m);
    try { localStorage.setItem(KEY, m); } catch {}
  };

  return (
    <section className="grid gap-3 md:grid-cols-2">
      <ModeCard
        active={pref === "krypto"}
        title="Analizator Krypto"
        desc="Reżim rynku, siła relatywna, setupy, alerty, AI asystent."
        icon={<Bitcoin className="h-5 w-5" />}
        accent="warning"
        onClick={() => set("krypto")}
        href="/"
        cta="Pozostań tutaj"
      />
      <ModeCard
        active={pref === "gielda"}
        title="Globalny Portal Giełdowy"
        desc="USA i Europa, ETF-y, sektory, makro, taktyki, portfel, agent."
        icon={<LineChart className="h-5 w-5" />}
        accent="bull"
        onClick={() => set("gielda")}
        href="/gielda"
        cta="Otwórz portal"
      />
    </section>
  );
}

function ModeCard({
  active, title, desc, icon, accent, onClick, href, cta,
}: {
  active: boolean;
  title: string;
  desc: string;
  icon: React.ReactNode;
  accent: "bull" | "warning";
  onClick: () => void;
  href: string;
  cta: string;
}) {
  return (
    <Link
      to={href}
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-colors hover:bg-secondary/40",
        active && "ring-1 ring-primary/60",
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg",
            accent === "bull" && "bg-bull/15 text-bull",
            accent === "warning" && "bg-warning/15 text-warning",
          )}
        >
          {icon}
        </div>
        <div className="flex-1">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Tryb</div>
          <div className="text-lg font-bold">{title}</div>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{desc}</p>
      <div className="mt-3 text-[11px] font-medium uppercase tracking-wider text-primary">{cta}</div>
    </Link>
  );
}
