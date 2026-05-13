import { createFileRoute, Link } from "@tanstack/react-router";
import { seoHead } from "@/lib/seo";
import { FileBarChart, FlaskConical, Moon, Notebook, ScanSearch, Send, ShieldAlert, Sunrise, Wallet } from "lucide-react";

export const Route = createFileRoute("/lab/")({
  head: () => ({ ...seoHead({ title: "Agent Trading Lab — overview", description: "Centrum dowodzenia trybu paper trading.", path: "/lab" }) }),
  component: LabIndex,
});

const tiles = [
  { to: "/lab/backtest", icon: FileBarChart, title: "Backtest 3M", desc: "Symulacja strategii na 3 miesiącach historii." },
  { to: "/lab/paper", icon: FlaskConical, title: "Paper Trading", desc: "Generuj decyzje long/short i prowadź dziennik." },
  { to: "/lab/scanner", icon: ScanSearch, title: "Setup Scanner", desc: "Skaner setupów technicznych." },
  { to: "/lab/risk", icon: ShieldAlert, title: "Risk Engine", desc: "Limity, kill switch, cooldown, korelacje." },
  { to: "/lab/journal", icon: Notebook, title: "Trade Journal", desc: "Wszystkie decyzje paper z filtrami." },
  { to: "/lab/telegram", icon: Send, title: "Telegram Alerts", desc: "Konfiguracja i preview wiadomości." },
  { to: "/lab/morning", icon: Sunrise, title: "Morning Report", desc: "Plan sesji o 5:10." },
  { to: "/lab/evening", icon: Moon, title: "Evening Report", desc: "Podsumowanie sesji USA o 21:00." },
  { to: "/lab/ledger", icon: Wallet, title: "Bajtlik Ledger", desc: "PnL paper tradingu i progres do celu." },
];

function LabIndex() {
  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Agent Trading Lab</div>
        <h1 className="mt-1 text-2xl font-bold">Środowisko symulacyjne tradera</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Wszystkie moduły działają w trybie paper. Twoje decyzje są zapisywane w bazie z RLS.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => {
          const I = t.icon;
          return (
            <Link key={t.to} to={t.to} className="group rounded-xl border border-border bg-card p-4 transition-colors hover:bg-secondary/40">
              <div className="flex items-center gap-2"><I className="h-4 w-4 text-primary" /><div className="font-bold">{t.title}</div></div>
              <p className="mt-2 text-xs text-muted-foreground">{t.desc}</p>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
