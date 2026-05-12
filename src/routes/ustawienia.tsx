import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, Bell, BellOff, Check, Download, Radio, Send, Trash2 } from "lucide-react";
import { clearUsage, setLimits, useAiUsage, DEFAULT_LIMITS } from "@/lib/ai-usage";
import {
  DATA_SOURCES,
  DATA_SOURCE_LABELS,
  setDataSource,
  useDataSource,
  type DataSource,
} from "@/lib/data-source";
import { fetchBinanceCoins } from "@/lib/providers/binance";
import { fetchCoingeckoCoins } from "@/lib/providers/coingecko";
import { fetchCryptoCompareCoins } from "@/lib/providers/cryptocompare";
import {
  clearNotifHistory,
  DEDUP_PRESETS,
  exportNotifHistory,
  fireNotification,
  isInQuietHours,
  notifPermission,
  requestNotifPermission,
  sendTestPush,
  setNotifSettings,
  useNotifHistory,
  useNotifSettings,
  type NotifLevel,
} from "@/lib/notifications";
import { QuietHoursPreview } from "@/components/QuietHoursPreview";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/ustawienia")({
  head: () => ({
    ...seoHead({
      title: "Ustawienia",
      description: "Źródło danych, godziny ciszy, limity AI, powiadomienia push i preferencje wykresu.",
      path: "/ustawienia",
    }),
  }),
  component: SettingsPage,
});

const META: Record<DataSource, { desc: string; pros: string; klines: boolean }> = {
  binance: {
    desc: "Dane z największej giełdy spot. Najszybsze, najświeższe, świetne wolumeny.",
    pros: "Realne 7D z świec dziennych (/api/v3/klines)",
    klines: true,
  },
  coingecko: {
    desc: "Agregator z setek giełd. Globalna kapitalizacja i dominacja.",
    pros: "Wbudowane 7D, market cap, brak limitu CORS",
    klines: false,
  },
  cryptocompare: {
    desc: "Dobre źródło porównawcze, wolumeny zagregowane.",
    pros: "Realne 7D z dziennych świec (histoday)",
    klines: true,
  },
};

function SettingsPage() {
  const source = useDataSource();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Ustawienia</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Wybierz źródło danych rynkowych. Wybór zapisuje się lokalnie w przeglądarce.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground">Źródło danych</h2>
        {DATA_SOURCES.map((s) => {
          const active = source === s;
          const meta = META[s];
          return (
            <button
              key={s}
              onClick={() => setDataSource(s)}
              className={cn(
                "block w-full rounded-xl border bg-card p-5 text-left transition-colors",
                active ? "border-primary ring-1 ring-primary/40" : "border-border hover:border-primary/50",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold">{DATA_SOURCE_LABELS[s]}</span>
                    {meta.klines && (
                      <span className="rounded bg-bull/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-bull">
                        7D realne
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{meta.desc}</p>
                  <p className="mt-2 text-xs text-foreground/70">✓ {meta.pros}</p>
                </div>
                <div className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                  active ? "border-primary bg-primary text-primary-foreground" : "border-border",
                )}>
                  {active && <Check className="h-3.5 w-3.5" />}
                </div>
              </div>
            </button>
          );
        })}
      </section>

      <NotificationsSection />

      <SourceTest />

      <AiLimitsSection />

      <section className="rounded-xl border border-border bg-card/60 p-5 text-sm">
        <h3 className="font-semibold">Wskazówka</h3>
        <p className="mt-2 text-muted-foreground">
          Jeśli któreś źródło zwraca błąd (CORS, limity rate limit), spróbuj innego.
          CoinGecko bywa wolniejsze, ale ma wbudowane 7D bez dodatkowych zapytań.
          Binance i CryptoCompare używają świec dziennych, by policzyć prawdziwą zmianę 7D.
        </p>
      </section>
    </div>
  );
}

function SourceTest() {
  const source = useDataSource();
  const { data, isFetching, isError, error, dataUpdatedAt, refetch } = useQuery({
    queryKey: ["settings-test", source],
    queryFn: () =>
      source === "binance"
        ? fetchBinanceCoins()
        : source === "coingecko"
          ? fetchCoingeckoCoins()
          : fetchCryptoCompareCoins(),
  });

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Test połączenia · {DATA_SOURCE_LABELS[source]}</h3>
        <button
          onClick={() => refetch()}
          className="rounded-md border border-border bg-background px-3 py-1 text-xs hover:bg-secondary"
        >
          Odśwież
        </button>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs">
        <Radio className={cn("h-3 w-3", !isError && data && "animate-pulse text-bull")} />
        {isFetching ? (
          <span className="text-muted-foreground">Pobieram…</span>
        ) : isError ? (
          <span className="text-bear">Błąd: {(error as Error)?.message ?? "nieznany"}</span>
        ) : data ? (
          <span className="text-bull">
            OK — pobrano {data.length} monet · {new Date(dataUpdatedAt).toLocaleTimeString("pl-PL")}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </div>
      {data && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
          {data.slice(0, 5).map((c) => (
            <div key={c.symbol} className="rounded border border-border bg-background/40 p-2">
              <div className="font-bold">{c.symbol}</div>
              <div className="num text-muted-foreground">${c.price.toFixed(2)}</div>
              <div className="num">7D: {c.change7d >= 0 ? "+" : ""}{c.change7d}%</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const LEVEL_META: Record<NotifLevel, { label: string; desc: string; tone: string }> = {
  critical: { label: "Krytyczne", desc: "Silne ruchy ≥|5%| 24h, panic / pump", tone: "text-bear" },
  warning: { label: "Ostrzeżenia", desc: "Wykupienie / wyprzedanie RSI ≥70 lub ≤30", tone: "text-warning" },
  info: { label: "Info", desc: "Trendy 7D, rotacja kapitału", tone: "text-muted-foreground" },
};

function NotificationsSection() {
  const settings = useNotifSettings();
  const history = useNotifHistory();
  const perm = notifPermission();
  const supported = perm !== "unsupported";
  const granted = perm === "granted";
  const muted = isInQuietHours(settings.quietHours);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground">Powiadomienia</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Otrzymuj alerty z poziomów <strong>critical / warning / info</strong> generowane na bieżąco z danych live.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-4" data-testid="notifications-panel">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {settings.enabled && granted ? (
              <Bell className="h-5 w-5 text-bull" />
            ) : (
              <BellOff className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <div className="text-sm font-semibold">Powiadomienia push (przeglądarka)</div>
              <div className="text-xs text-muted-foreground">
                {!supported
                  ? "Twoja przeglądarka nie obsługuje powiadomień."
                  : perm === "denied"
                    ? "Zablokowane w przeglądarce — odblokuj w ustawieniach strony."
                    : granted
                      ? "Pozwolenie udzielone — gotowe."
                      : "Wymaga pozwolenia przeglądarki."}
              </div>
            </div>
          </div>
          <Switch
            checked={settings.enabled && granted}
            disabled={!supported || perm === "denied"}
            onCheckedChange={async (v) => {
              if (v && perm === "default") {
                const r = await requestNotifPermission();
                if (r !== "granted") return;
              }
              setNotifSettings({ enabled: v });
            }}
          />
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <div>
            <div className="text-sm font-semibold">Powiadomienia w aplikacji (toast)</div>
            <div className="text-xs text-muted-foreground">
              Pokazuj „dymki" w prawym górnym rogu, nawet bez pozwolenia push.
            </div>
          </div>
          <Switch
            checked={settings.inAppToast}
            onCheckedChange={(v) => setNotifSettings({ inAppToast: v })}
          />
        </div>

        <div className="space-y-2 border-t border-border pt-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Poziomy alertów
          </div>
          {(Object.keys(LEVEL_META) as NotifLevel[]).map((lvl) => {
            const m = LEVEL_META[lvl];
            return (
              <label key={lvl} className="flex items-center justify-between gap-3 rounded-lg bg-background/40 px-3 py-2 cursor-pointer">
                <div>
                  <div className={cn("text-sm font-semibold", m.tone)}>{m.label}</div>
                  <div className="text-xs text-muted-foreground">{m.desc}</div>
                </div>
                <Switch
                  checked={settings.levels[lvl]}
                  onCheckedChange={(v) =>
                    setNotifSettings({ levels: { ...settings.levels, [lvl]: v } })
                  }
                />
              </label>
            );
          })}
        </div>

        {/* Harmonogram odcięć / quiet hours */}
        <div className="space-y-3 border-t border-border pt-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Harmonogram (godziny ciszy)</div>
              <div className="text-xs text-muted-foreground">
                Wycisza powiadomienia w wybranym przedziale. Alerty trafiają wtedy tylko do historii.
              </div>
            </div>
            <Switch
              checked={settings.quietHours.enabled}
              onCheckedChange={(v) =>
                setNotifSettings({ quietHours: { ...settings.quietHours, enabled: v } })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-muted-foreground">Od</span>
              <input
                type="time"
                value={settings.quietHours.from}
                onChange={(e) =>
                  setNotifSettings({ quietHours: { ...settings.quietHours, from: e.target.value } })
                }
                className="rounded-md border border-border bg-background px-2 py-1.5 text-sm num"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-muted-foreground">Do</span>
              <input
                type="time"
                value={settings.quietHours.to}
                onChange={(e) =>
                  setNotifSettings({ quietHours: { ...settings.quietHours, to: e.target.value } })
                }
                className="rounded-md border border-border bg-background px-2 py-1.5 text-sm num"
              />
            </label>
          </div>
          <QuietHoursPreview qh={settings.quietHours} />
          {settings.quietHours.enabled && (
            <div className={cn("text-xs", muted ? "text-warning" : "text-muted-foreground")}>
              {muted ? "🌙 Teraz trwa cisza — powiadomienia są wyciszone." : "🔔 Poza godzinami ciszy — powiadomienia działają."}
            </div>
          )}
        </div>

        {/* Limity duplikacji */}
        <div className="space-y-2 border-t border-border pt-4" data-testid="dedup-section">
          <div>
            <div className="text-sm font-semibold">Limit duplikacji alertów</div>
            <div className="text-xs text-muted-foreground">
              Ten sam alert (symbol + poziom + treść) nie powtórzy się częściej niż co wybrany czas.
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {DEDUP_PRESETS.map((m) => {
              const active = settings.dedupMinutes === m;
              return (
                <button
                  key={m}
                  data-testid={`dedup-${m}`}
                  onClick={() => setNotifSettings({ dedupMinutes: m })}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-xs num transition-colors",
                    active
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-background hover:bg-secondary",
                  )}
                >
                  {m < 60 ? `${m} min` : `${m / 60} h`}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <button
            data-testid="test-push"
            onClick={() => sendTestPush(settings)}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            <Send className="h-3 w-3" /> Test push
          </button>
          <button
            onClick={() =>
              fireNotification(
                {
                  id: "test",
                  time: new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }),
                  symbol: "TEST",
                  level: "critical",
                  message: "Tak będzie wyglądał alert krytyczny — silny ruch +6.2% w 24h.",
                },
                settings,
              )
            }
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-secondary"
          >
            Testuj critical
          </button>
          <button
            onClick={() =>
              fireNotification(
                { id: "t2", time: "", symbol: "ETH", level: "warning", message: "RSI 72 — strefa wykupienia." },
                settings,
              )
            }
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-secondary"
          >
            Testuj warning
          </button>
          <button
            onClick={() =>
              fireNotification(
                { id: "t3", time: "", symbol: "SOL", level: "info", message: "Trend 7D +14% — lider rotacji." },
                settings,
              )
            }
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-secondary"
          >
            Testuj info
          </button>
        </div>

        {/* Historia */}
        <div className="space-y-2 border-t border-border pt-4" data-testid="notif-history">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Historia powiadomień ({history.length})
            </div>
            <div className="flex gap-1.5">
              <button
                data-testid="export-history"
                onClick={() => exportNotifHistory()}
                disabled={history.length === 0}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs hover:bg-secondary disabled:opacity-50"
              >
                <Download className="h-3 w-3" /> Eksport
              </button>
              <button
                data-testid="clear-history"
                onClick={() => clearNotifHistory()}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs hover:bg-secondary"
              >
                <Trash2 className="h-3 w-3" /> Wyczyść
              </button>
            </div>
          </div>
          {history.length === 0 ? (
            <div className="rounded-md bg-background/40 p-3 text-xs text-muted-foreground">
              Brak zapisanych powiadomień. Kliknij „Test push" lub poczekaj na alert z rynku.
            </div>
          ) : (
            <ul className="max-h-64 overflow-y-auto divide-y divide-border rounded-md border border-border bg-background/40">
              {history.slice(0, 20).map((h) => (
                <li key={h.id} className="p-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{h.title}</span>
                    <span className="flex items-center gap-1.5">
                      {h.muted && (
                        <span className="rounded bg-warning/20 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-warning">
                          cisza
                        </span>
                      )}
                      <span className="num text-[10px] text-muted-foreground">
                        {new Date(h.ts).toLocaleTimeString("pl-PL")}
                      </span>
                    </span>
                  </div>
                  <div className="mt-0.5 text-muted-foreground">{h.body}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------- AI Limits section ---------- */

function AiLimitsSection() {
  const { stats, limits } = useAiUsage();

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground">Limity AI i koszty</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ogranicz zapytania asystenta i raportów. Koszty są szacunkowe (na bazie tokenów × cennik modelu).
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Dziś" value={`${stats.countDay}`} sub={`$${stats.costDayUsd.toFixed(4)}`} />
          <Stat label="7 dni" value={`${stats.countWeek}`} sub={`$${stats.costWeekUsd.toFixed(4)}`} />
          <Stat label="Budżet dzienny" value={`$${limits.dailyBudgetUsd.toFixed(2)}`} sub={`${stats.budgetPct.toFixed(0)}% wykorzystane`} />
          <Stat label="Status" value={stats.budgetExceeded ? "PRZEKROCZONY" : "OK"} sub={stats.budgetExceeded ? "ostrzeżenie" : "w normie"} tone={stats.budgetExceeded ? "bear" : "bull"} />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-border pt-4">
          <NumField label="Na minutę" value={limits.perMinute} onChange={(v) => setLimits({ perMinute: v })} />
          <NumField label="Na godzinę" value={limits.perHour} onChange={(v) => setLimits({ perHour: v })} />
          <NumField label="Na dzień" value={limits.perDay} onChange={(v) => setLimits({ perDay: v })} />
          <NumField label="Budżet $/dzień" value={limits.dailyBudgetUsd} onChange={(v) => setLimits({ dailyBudgetUsd: v })} step={0.1} />
        </div>

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <button
            onClick={() => setLimits(DEFAULT_LIMITS)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-secondary"
          >
            <Activity className="mr-1 inline h-3 w-3" /> Przywróć domyślne
          </button>
          <button
            onClick={() => { if (confirm("Wyczyścić historię zużycia?")) clearUsage(); }}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-secondary"
          >
            <Trash2 className="mr-1 inline h-3 w-3" /> Wyczyść licznik
          </button>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: "bull" | "bear" }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-lg font-bold num", tone === "bear" && "text-bear", tone === "bull" && "text-bull")}>{value}</div>
      <div className="text-xs text-muted-foreground num">{sub}</div>
    </div>
  );
}

function NumField({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <input
        type="number"
        value={value}
        step={step}
        min={0}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="rounded-md border border-border bg-background px-2 py-1.5 text-sm num"
      />
    </label>
  );
}
