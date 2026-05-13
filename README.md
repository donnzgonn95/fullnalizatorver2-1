# CryptoPuls — AI Quant Cockpit

Polski dashboard tradingowy do krypto z **globalnym skanerem setupów 24/7**, panelem admina, ryzykiem, AI reasoningiem i powiadomieniami webhook. Zbudowany w stylu **Orange Institutional Quant** (dark cockpit + light institutional).

---

## 1. Czym jest CryptoPuls

CryptoPuls to **operating system tradera krypto**. Łączy:

- **Live feed** cen i świec (Binance + CoinGecko)
- **Globalny skaner setupów** (BB-bounce, Elliott Wave) działający w tle 24/7 — niezależnie od tego, czy masz otwartą kartę
- **Auto-weryfikację PnL** (cron pilnuje, czy setup zrealizował TP/SL)
- **Powiadomienia webhook** (Discord / Slack / IFTTT / Make / n8n)
- **Panel admina** do zmiany symboli/interwałów bez zmiany kodu i bez restartu
- **AI Reasoning Feed** — operator AI komentuje rynek w czasie rzeczywistym
- **Risk controls** — dzienny limit straty, max trade'ów, max ryzyko/trade, kill-switch
- **Moduły Giełda** (USA / Europa, makro, sektory, ETF, taktyki, watchlista, dziennik) i **Lab** (paper trading, backtest, scanner, raporty poranne/wieczorne)

Wszystko w spójnym języku polskim, z dwoma motywami (Dark Cockpit / Institutional Light).

---

## 2. Stack technologiczny

| Warstwa | Technologia |
|---|---|
| Framework | TanStack Start v1 (React 19, Vite 7, SSR/SSG) |
| Styling | Tailwind CSS v4 + tokeny OKLCH w `src/styles.css` |
| UI | shadcn/ui + lucide-react |
| State | TanStack Query, lokalne hooki, localStorage |
| Backend | Lovable Cloud (Supabase pod spodem) |
| Auth | Email/hasło + Google OAuth |
| Server-side | TanStack `createServerFn` + server routes (`src/routes/api/public/...`) |
| Cron | Supabase `pg_cron` + `pg_net` → publiczne route'y `/api/public/hooks/*` |
| AI | Lovable AI Gateway (Gemini/GPT) — bez własnego klucza |
| Wykresy | TradingView, lekkie sparkline'y inline |
| Hosting | Cloudflare Workers (edge) |

---

## 3. Architektura globalnego skanera

```text
┌──────────────────────────────────────────────────────────────┐
│  pg_cron (Supabase)   co 5 min                               │
│   ├─ scan-setups-global   → POST /api/public/hooks/scan      │
│   ├─ verify-setups-global → POST /api/public/hooks/verify    │
│   └─ notify-setups-global → POST /api/public/hooks/notify    │
└──────────────────────────────────────────────────────────────┘
                │                │                │
                ▼                ▼                ▼
   ┌─────────────────┐  ┌──────────────┐  ┌──────────────────┐
   │  Binance klines │  │  detected_   │  │  notification_   │
   │  + detektory    │  │  setups (PnL │  │  settings        │
   │  (BB / Elliott) │  │  check)      │  │  → webhook POST  │
   └────────┬────────┘  └──────┬───────┘  └────────┬─────────┘
            ▼                  ▼                   ▼
       detected_setups    update status         notification_log
       (user_id = NULL)   win/loss              + cron_run_logs
```

**Kluczowe założenie:** wszystkie globalne setupy mają `user_id = NULL`. RLS pozwala je czytać każdemu zalogowanemu użytkownikowi, ale insertuje je tylko `service_role` z hooków cronowych.

---

## 4. Schemat bazy (najważniejsze tabele)

| Tabela | Opis |
|---|---|
| `scanner_config` | Globalna lista symboli + interwałów + flaga `enabled`. Edytowalna z `/admin` przez rolę `admin`. |
| `detected_setups` | Wszystkie wykryte setupy (globalne, `user_id = NULL`). Status: `pending`/`active`/`completed`. Result: `win`/`loss`. |
| `cron_run_logs` | Każde wykonanie hooka — `job_name`, `status`, `duration_ms`, `details` JSON. |
| `notification_settings` | Konfiguracja webhooka per użytkownik + filtry (symbole, interwały, min siła). |
| `notification_log` | Historia wysłanych powiadomień. |
| `user_roles` | Role (`admin` / `user`) — sprawdzane przez `has_role()`. |
| `profiles` | Profil użytkownika (display name, akceptacja regulaminu). |
| `lab_*` | Moduł Lab: paper trades, backtesty, raporty, ryzyko, telegram. |
| `bajtlik_*`, `investment_tactics`, `decision_logs`, `agent_notes`, `portfolio_journal`, `stock_watchlist`, `watchlist` | Moduły Giełda + Asystent. |

Wszystkie tabele mają **RLS włączone**. Dane per-user widoczne tylko właścicielowi (`auth.uid() = user_id`). Globalne setupy widoczne dla wszystkich zalogowanych.

---

## 5. Panel admina (`/admin`)

Widoczny dla każdego zalogowanego, ale **edycja konfiguracji + ręczne uruchamianie** wymagają roli `admin`.

Sekcje:

1. **Ręczne uruchamianie** — 3 kolorowe przyciski: `scan`, `verify`, `notify`. Strzelają w hook publiczny i odświeżają logi.
2. **Konfiguracja skanera** — chips do dodawania/usuwania symboli i interwałów + toggle `enabled`. Zapis bez restartu.
3. **Moje powiadomienia** — webhook URL, min siła sygnału, filtry.
4. **Test webhooka** — wysyła przykładowy payload setupu na podany URL i pokazuje status (status code, czas, snippet odpowiedzi, payload).
5. **Logi cronów** — auto-refresh co 5 s, kolorowe statusy, expand → szczegóły JSON.

---

## 6. Dashboard (`/`) — Orange Institutional Quant

| Karta | Wariant | Co pokazuje |
|---|---|---|
| **4 quick frames** (sentyment / BTC.D / Δ24h / tryb skanera) | mix | Skrót pulsacji rynku w jednym rzucie oka. |
| **Tryb rynku** | mint/bear/warning | Reżim (bull/bear/neutral) + Fear & Greed + dominacja BTC. |
| **Best Setup Now** (hero) | orange | Najlepszy aktualny setup z globalnego skanera + mini sparkline + entry/SL/TP1/TP2/RR. |
| **Ryzyko** | mint/warning/bear | Dzienny budżet ryzyka, limity, auto-entry. |
| **AI Myśli** | cyan | Live reasoning feed z timestampami. |
| **Przepływ kapitału** | warning | BTC.D / ETH.D / USDT.D + rotacja sektorowa. |
| **Aktywne sygnały** | orange | Top 10 globalnych setupów (auto-refresh 30 s). |

Każda karta używa współdzielonego `<FeatureCard variant="..." description="..." />` — kolorowa ramka, ikona, badge i opis znaczenia.

---

## 7. Auth i bezpieczeństwo

- Email/hasło + Google OAuth (bez auto-confirm).
- Role w osobnej tabeli `user_roles` + funkcja `SECURITY DEFINER has_role()` — chroni przed privilege escalation.
- RLS na wszystkich tabelach.
- `SUPABASE_SERVICE_ROLE_KEY` używany **wyłącznie** w hookach serverowych (`/api/public/hooks/*`).
- Webhooki nie używają klucza serwisowego — tylko fetch HTTP per użytkownik.

---

## 8. Cron jobs (pg_cron)

Wszystkie zaplanowane co 5 min (`*/5 * * * *`):

```sql
SELECT * FROM cron.job;
```

- `scan-setups-global`
- `verify-setups-global`
- `notify-setups-global` (co 1–2 min)

Każdy zapisuje wpis do `cron_run_logs`.

---

## 9. Struktura folderów

```text
src/
├── routes/                   # TanStack file-based routing
│   ├── __root.tsx            # shell + providers (theme, query, auth)
│   ├── index.tsx             # AI Quant Cockpit (dashboard)
│   ├── admin.tsx             # panel admina
│   ├── setupy.tsx            # terminal setupów
│   ├── setupy.historia.tsx   # historia globalnych setupów
│   ├── gielda.*.tsx          # moduł Giełda (USA, EU, makro, sektory, ETF, ...)
│   ├── lab.*.tsx             # moduł Lab (paper, backtest, scanner, raporty, ...)
│   ├── _authenticated/       # routes za loginem (alerty, ulubione, ustawienia, asystent)
│   └── api/public/hooks/     # endpointy cron + webhook (scan, verify, notify, lab-reports)
├── lib/
│   ├── feed/                 # detektory, scanner, types, indicators
│   ├── admin.functions.ts    # serverFn: testWebhook
│   ├── setups.functions.ts   # legacy per-user (do sprzątnięcia)
│   ├── theme.tsx             # ThemeProvider (dark/light + localStorage)
│   └── ...
├── components/
│   ├── FeatureCard.tsx       # uniwersalna kolorowa karta z 6 wariantami
│   ├── ThemeToggle.tsx
│   ├── feed/                 # widgety live (TopSetupsWidget, FeedStatusBadge, LiveIndicators)
│   ├── gielda/, lab/         # moduły
│   └── ui/                   # shadcn
├── integrations/supabase/    # AUTO-GENEROWANE (nie edytować)
└── styles.css                # tokeny OKLCH dla obu motywów
supabase/
└── migrations/               # historia schematu
```

---

## 10. Jak dodać kolejny setup-detector

1. Stwórz `src/lib/feed/detectors/<nazwa>.ts` z funkcją `(candles) => Setup | null`.
2. Wywołaj go w `src/routes/api/public/hooks/scan-setups.ts` w pętli po symbolach.
3. Dodaj rozpoznanie nazwy w UI (`Best Setup`, `TopSetupsWidget`).
4. (Opcjonalnie) rozszerz schemat `detected_setups.setup_type`.

Bez restartu — wystarczy redeploy.

---

## 11. Motywy

- **Dark Cockpit**: głęboki granat + warm institutional orange `oklch(0.74 0.17 55)`, miękkie glow.
- **Institutional Light**: off-white, soft gray, ten sam orange jako akcent, czyste cienie.
- Przełącznik w nagłówku, zapamiętany w `localStorage` (`cryptopuls-theme`).
- Płynna tranzycja przez `transition-colors` na `<html>`.

---

## 12. Konwencje

- Wszystkie kolory przez tokeny CSS (`var(--accent-orange)`, `text-bull`, `bg-bear/20`...).
- Liczby w `font-mono` przez klasę `.num`.
- Karty funkcyjne zawsze przez `<FeatureCard>` — wariant + opis znaczenia.
- Polski język całego UI (kod i komentarze techniczne dowolnie).

---

## 13. Roadmap (skrót)

- [ ] Email notifications (po podpięciu domeny w Lovable Email)
- [ ] Sprzątnięcie legacy per-user `setups.functions.ts`
- [ ] Więcej detektorów (RSI divergence, order block, FVG)
- [ ] Backtester globalny (poza Lab)
- [ ] Per-user ranking jakości skanera

---

**Autor:** projekt zbudowany na Lovable Cloud.
**Licencja:** prywatna.
