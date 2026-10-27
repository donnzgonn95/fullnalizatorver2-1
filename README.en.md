**Language / Sprache / Język:** 🇬🇧 **English** · 🇩🇪 [Deutsch](README.de.md) · 🇵🇱 [Polski](README.md)

# CryptoPuls — AI Quant Cockpit

A market-focused dashboard with a **global 24/7 setup scanner**, admin panel, risk controls, AI reasoning and webhook notifications. Built in the **Orange Institutional Quant** style (Dark Cockpit + Institutional Light).

---

## 1. What the analyzer does

Analyzer 2.1 is designed as a **trader's operating system**. It combines:

- **Live price and candlestick feed** (Binance + CoinGecko)
- **Global setup scanner** (BB-bounce, Elliott Wave) running in the background 24/7, whether or not the browser tab is open
- **Automatic PnL verification** (cron jobs check whether a setup has reached TP/SL)
- **Webhook notifications** (Discord / Slack / IFTTT / Make / n8n)
- **Admin panel** for changing symbols and intervals without code changes or restarts
- **AI Reasoning Feed** — an AI operator comments on the market in near real time
- **Risk controls** — daily loss limit, maximum number of trades, maximum risk per trade and kill switch
- **Exchange module** (US / Europe, macro, sectors, ETFs, tactics, watchlist, journal) and **Lab** (paper trading, backtesting, scanner, morning/evening reports)

The interface is consistently in Polish and includes two themes: Dark Cockpit and Institutional Light.

---

## 2. Technology stack

| Layer | Technology |
|---|---|
| Framework | TanStack Start v1 (React 19, Vite 7, SSR/SSG) |
| Styling | Tailwind CSS v4 + OKLCH tokens in `src/styles.css` |
| UI | shadcn/ui + lucide-react |
| State | TanStack Query, local hooks, localStorage |
| Backend | Lovable Cloud (powered by Supabase) |
| Authentication | Email/password + Google OAuth |
| Server side | TanStack `createServerFn` + server routes (`src/routes/api/public/...`) |
| Cron | Supabase `pg_cron` + `pg_net` → public routes `/api/public/hooks/*` |
| AI | Lovable AI Gateway (Gemini/GPT) — no separate API key required |
| Charts | TradingView, lightweight inline sparklines |
| Hosting | Cloudflare Workers (edge) |

---

## 3. Global scanner architecture

```text
┌──────────────────────────────────────────────────────────────┐
│  pg_cron (Supabase)   every 5 min                            │
│   ├─ scan-setups-global   → POST /api/public/hooks/scan      │
│   ├─ verify-setups-global → POST /api/public/hooks/verify    │
│   └─ notify-setups-global → POST /api/public/hooks/notify    │
└──────────────────────────────────────────────────────────────┘
                │                │                │
                ▼                ▼                ▼
   ┌─────────────────┐  ┌──────────────┐  ┌──────────────────┐
   │  Binance klines │  │  detected_   │  │  notification_   │
   │  + detectors    │  │  setups (PnL │  │  settings        │
   │  (BB / Elliott) │  │  check)      │  │  → webhook POST  │
   └────────┬────────┘  └──────┬───────┘  └────────┬─────────┘
            ▼                  ▼                   ▼
       detected_setups    update status         notification_log
       (user_id = NULL)   win/loss              + cron_run_logs
```

**Key assumption:** all global setups have `user_id = NULL`. RLS allows any authenticated user to read them, while inserts are performed only by `service_role` through cron hooks.

---

## 4. Database schema (key tables)

| Table | Description |
|---|---|
| `scanner_config` | Global list of symbols and intervals plus the `enabled` flag. Editable at `/admin` by users with the `admin` role. |
| `detected_setups` | All detected setups (global, `user_id = NULL`). Status: `pending` / `active` / `completed`. Result: `win` / `loss`. |
| `cron_run_logs` | Each hook execution — `job_name`, `status`, `duration_ms`, `details` JSON. |
| `notification_settings` | Per-user webhook configuration and filters (symbols, intervals, minimum strength). |
| `notification_log` | History of sent notifications. |
| `user_roles` | Roles (`admin` / `user`) checked by `has_role()`. |
| `profiles` | User profile (display name, acceptance of terms). |
| `lab_*` | Lab module: paper trades, backtests, reports, risk and Telegram. |
| `bajtlik_*`, `investment_tactics`, `decision_logs`, `agent_notes`, `portfolio_journal`, `stock_watchlist`, `watchlist` | Exchange and Assistant modules. |

**RLS is enabled on all tables.** Per-user data is visible only to its owner (`auth.uid() = user_id`). Global setups are visible to all authenticated users.

---

## 5. Admin panel (`/admin`)

Visible to every authenticated user, but **editing configuration and manually running jobs** require the `admin` role.

Sections:

1. **Manual execution** — three colored buttons: `scan`, `verify`, `notify`. They call the public hooks and refresh the logs.
2. **Scanner configuration** — chips to add/remove symbols and intervals, plus an `enabled` toggle. Changes are saved without a restart.
3. **My notifications** — webhook URL, minimum signal strength and filters.
4. **Webhook test** — sends a sample setup payload to the supplied URL and displays the status (status code, duration, response snippet and payload).
5. **Cron logs** — auto-refresh every 5 seconds, color-coded statuses, expandable JSON details.

---

## 6. Dashboard (`/`) — Orange Institutional Quant

| Card | Variant | What it shows |
|---|---|---|
| **4 quick frames** (sentiment / BTC.D / Δ24h / scanner mode) | mix | A one-glance snapshot of market activity. |
| **Market regime** | mint/bear/warning | Regime (bull/bear/neutral) + Fear & Greed + BTC dominance. |
| **Best Setup Now** (hero) | orange | Best current setup from the global scanner + mini sparkline + entry/SL/TP1/TP2/RR. |
| **Risk** | mint/warning/bear | Daily risk budget, limits and auto-entry. |
| **AI Thoughts** | cyan | Live reasoning feed with timestamps. |
| **Capital flow** | warning | BTC.D / ETH.D / USDT.D + sector rotation. |
| **Active signals** | orange | Top 10 global setups (auto-refresh every 30 seconds). |

Each card uses the shared `<FeatureCard variant="..." description="..." />` component — colored border, icon, badge and explanatory description.

---

## 7. Authentication and security

- Email/password + Google OAuth (without auto-confirm).
- Roles are stored in the separate `user_roles` table and checked by the `SECURITY DEFINER has_role()` function, helping prevent privilege escalation.
- RLS is enabled on all tables.
- `SUPABASE_SERVICE_ROLE_KEY` is used **only** in server-side hooks (`/api/public/hooks/*`).
- Webhooks do not use the service key; they make HTTP fetch requests per user.

---

## 8. Cron jobs (`pg_cron`)

All jobs are scheduled every 5 minutes (`*/5 * * * *`):

```sql
SELECT * FROM cron.job;
```

- `scan-setups-global`
- `verify-setups-global`
- `notify-setups-global` (every 1–2 minutes)

Each job writes an entry to `cron_run_logs`.

---

## 9. Folder structure

```text
src/
├── routes/                   # TanStack file-based routing
│   ├── __root.tsx            # shell + providers (theme, query, auth)
│   ├── index.tsx             # AI Quant Cockpit (dashboard)
│   ├── admin.tsx             # admin panel
│   ├── setupy.tsx             # setup terminal
│   ├── setupy.historia.tsx   # global setup history
│   ├── gielda.*.tsx          # Exchange module (US, EU, macro, sectors, ETFs, ...)
│   ├── lab.*.tsx             # Lab module (paper, backtest, scanner, reports, ...)
│   ├── _authenticated/       # routes behind login (alerts, favorites, settings, assistant)
│   └── api/public/hooks/     # cron + webhook endpoints (scan, verify, notify, lab-reports)
├── lib/
│   ├── feed/                 # detectors, scanner, types, indicators
│   ├── admin.functions.ts    # serverFn: testWebhook
│   ├── setups.functions.ts   # legacy per-user implementation (to be cleaned up)
│   ├── theme.tsx             # ThemeProvider (dark/light + localStorage)
│   └── ...
├── components/
│   ├── FeatureCard.tsx       # reusable colored card with 6 variants
│   ├── ThemeToggle.tsx
│   ├── feed/                 # live widgets (TopSetupsWidget, FeedStatusBadge, LiveIndicators)
│   ├── gielda/, lab/         # modules
│   └── ui/                   # shadcn
├── integrations/supabase/    # AUTO-GENERATED (do not edit)
└── styles.css                # OKLCH tokens for both themes
supabase/
└── migrations/               # schema history
```

---

## 10. How to add another setup detector

1. Create `src/lib/feed/detectors/<name>.ts` with a function `(candles) => Setup | null`.
2. Call it from the symbol loop in `src/routes/api/public/hooks/scan-setups.ts`.
3. Add name recognition in the UI (`Best Setup`, `TopSetupsWidget`).
4. Optionally extend the `detected_setups.setup_type` schema.

No restart is required — redeploy is enough.

---

## 11. Themes

- **Dark Cockpit**: deep navy + warm institutional orange `oklch(0.74 0.17 55)`, with a soft glow.
- **Institutional Light**: off-white, soft gray, the same orange accent and clean shadows.
- The header toggle stores the choice in `localStorage` (`cryptopuls-theme`).
- Smooth transition via `transition-colors` on `<html>`.

---

## 12. Conventions

- All colors use CSS tokens (`var(--accent-orange)`, `text-bull`, `bg-bear/20`, etc.).
- Numbers use `font-mono` through the `.num` class.
- Functional cards always use `<FeatureCard>` — variant + explanatory description.
- The entire UI is in Polish (code and technical comments may use other languages).

---

## 13. Roadmap (summary)

- [ ] Email notifications (after connecting a domain in Lovable Email)
- [ ] Clean up legacy per-user `setups.functions.ts`
- [ ] More detectors (RSI divergence, order block, FVG)
- [ ] Global backtester (outside Lab)
- [ ] Per-user scanner-quality ranking

---

**Author:** Project built on Lovable Cloud.  
**License:** Private.
