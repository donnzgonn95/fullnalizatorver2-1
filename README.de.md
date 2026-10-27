**Sprache / Language / Język:** 🇩🇪 **Deutsch** · 🇬🇧 [English](README.en.md) · 🇵🇱 [Polski](README.md)

# CryptoPuls — AI Quant Cockpit

Ein Dashboard für die Marktanalyse mit einem **globalen Setup-Scanner rund um die Uhr (24/7)**, Admin-Panel, Risikosteuerung, KI-gestütztem Reasoning und Webhook-Benachrichtigungen. Gestaltet im Stil **Orange Institutional Quant** (Dark Cockpit + Institutional Light).

---

## 1. Was der Analysator leistet

Analysator 2.1 ist als **Betriebssystem für Trader** konzipiert. Er verbindet:

- **Live-Kurs- und Candlestick-Feed** (Binance + CoinGecko)
- **Globaler Setup-Scanner** (BB-Bounce, Elliott Wave), der rund um die Uhr im Hintergrund läuft — unabhängig davon, ob der Browser-Tab geöffnet ist
- **Automatische PnL-Prüfung** (Cron-Jobs prüfen, ob ein Setup TP/SL erreicht hat)
- **Webhook-Benachrichtigungen** (Discord / Slack / IFTTT / Make / n8n)
- **Admin-Panel** zum Ändern von Symbolen und Intervallen ohne Codeänderungen oder Neustart
- **AI Reasoning Feed** — ein KI-Agent kommentiert den Markt nahezu in Echtzeit
- **Risikosteuerung** — tägliches Verlustlimit, maximale Anzahl an Trades, maximales Risiko pro Trade und Kill-Switch
- **Börsenmodul** (USA / Europa, Makro, Sektoren, ETFs, Taktiken, Watchlist, Journal) und **Lab** (Paper-Trading, Backtesting, Scanner, Morgen- und Abendberichte)

Die Benutzeroberfläche ist durchgängig auf Polnisch verfügbar und bietet zwei Themes: Dark Cockpit und Institutional Light.

---

## 2. Technologie-Stack

| Ebene | Technologie |
|---|---|
| Framework | TanStack Start v1 (React 19, Vite 7, SSR/SSG) |
| Styling | Tailwind CSS v4 + OKLCH-Tokens in `src/styles.css` |
| UI | shadcn/ui + lucide-react |
| Zustand | TanStack Query, lokale Hooks, localStorage |
| Backend | Lovable Cloud (auf Basis von Supabase) |
| Authentifizierung | E-Mail/Passwort + Google OAuth |
| Serverseite | TanStack `createServerFn` + Server-Routen (`src/routes/api/public/...`) |
| Cron | Supabase `pg_cron` + `pg_net` → öffentliche Routen `/api/public/hooks/*` |
| KI | Lovable AI Gateway (Gemini/GPT) — kein eigener API-Schlüssel erforderlich |
| Diagramme | TradingView, leichte Inline-Sparklines |
| Hosting | Cloudflare Workers (Edge) |

---

## 3. Architektur des globalen Scanners

```text
┌──────────────────────────────────────────────────────────────┐
│  pg_cron (Supabase)   alle 5 Min.                            │
│   ├─ scan-setups-global   → POST /api/public/hooks/scan      │
│   ├─ verify-setups-global → POST /api/public/hooks/verify    │
│   └─ notify-setups-global → POST /api/public/hooks/notify    │
└──────────────────────────────────────────────────────────────┘
                │                │                │
                ▼                ▼                ▼
   ┌─────────────────┐  ┌──────────────┐  ┌──────────────────┐
   │  Binance klines │  │  detected_   │  │  notification_   │
   │  + Detektoren   │  │  setups (PnL │  │  settings        │
   │  (BB / Elliott) │  │  check)      │  │  → webhook POST  │
   └────────┬────────┘  └──────┬───────┘  └────────┬─────────┘
            ▼                  ▼                   ▼
       detected_setups    Status aktualisieren  notification_log
       (user_id = NULL)   win/loss              + cron_run_logs
```

**Zentrale Annahme:** Alle globalen Setups haben `user_id = NULL`. RLS erlaubt allen angemeldeten Benutzern, sie zu lesen; neue Einträge werden ausschließlich von `service_role` über die Cron-Hooks angelegt.

---

## 4. Datenbankschema (wichtigste Tabellen)

| Tabelle | Beschreibung |
|---|---|
| `scanner_config` | Globale Liste von Symbolen und Intervallen sowie das Flag `enabled`. Über `/admin` durch Benutzer mit der Rolle `admin` bearbeitbar. |
| `detected_setups` | Alle erkannten Setups (global, `user_id = NULL`). Status: `pending` / `active` / `completed`. Ergebnis: `win` / `loss`. |
| `cron_run_logs` | Jeder Hook-Aufruf — `job_name`, `status`, `duration_ms`, JSON-Feld `details`. |
| `notification_settings` | Webhook-Konfiguration pro Benutzer und Filter (Symbole, Intervalle, Mindeststärke). |
| `notification_log` | Verlauf der gesendeten Benachrichtigungen. |
| `user_roles` | Rollen (`admin` / `user`), geprüft durch `has_role()`. |
| `profiles` | Benutzerprofil (Anzeigename, Zustimmung zu den Nutzungsbedingungen). |
| `lab_*` | Lab-Modul: Paper-Trades, Backtests, Berichte, Risiko und Telegram. |
| `bajtlik_*`, `investment_tactics`, `decision_logs`, `agent_notes`, `portfolio_journal`, `stock_watchlist`, `watchlist` | Module Börse und Assistent. |

**RLS ist für alle Tabellen aktiviert.** Benutzerbezogene Daten sind nur für den jeweiligen Eigentümer sichtbar (`auth.uid() = user_id`). Globale Setups sind für alle angemeldeten Benutzer sichtbar.

---

## 5. Admin-Panel (`/admin`)

Das Panel ist für alle angemeldeten Benutzer sichtbar; **Konfigurationsänderungen und das manuelle Starten von Jobs** erfordern jedoch die Rolle `admin`.

Bereiche:

1. **Manuelle Ausführung** — drei farbige Schaltflächen: `scan`, `verify`, `notify`. Sie rufen die öffentlichen Hooks auf und aktualisieren die Logs.
2. **Scanner-Konfiguration** — Chips zum Hinzufügen/Entfernen von Symbolen und Intervallen sowie ein `enabled`-Schalter. Änderungen werden ohne Neustart gespeichert.
3. **Meine Benachrichtigungen** — Webhook-URL, Mindest-Signalstärke und Filter.
4. **Webhook-Test** — sendet eine Beispiel-Setup-Payload an die angegebene URL und zeigt Statuscode, Dauer, Antwortausschnitt und Payload an.
5. **Cron-Logs** — automatische Aktualisierung alle 5 Sekunden, farbige Statusanzeigen und aufklappbare JSON-Details.

---

## 6. Dashboard (`/`) — Orange Institutional Quant

| Karte | Variante | Anzeige |
|---|---|---|
| **4 Quick Frames** (Stimmung / BTC.D / Δ24h / Scanner-Modus) | mix | Kompakter Überblick über die aktuelle Marktlage. |
| **Marktregime** | mint/bear/warning | Regime (bull/bear/neutral) + Fear & Greed + BTC-Dominanz. |
| **Best Setup Now** (Hero) | orange | Bestes aktuelles Setup des globalen Scanners + Mini-Sparkline + Entry/SL/TP1/TP2/RR. |
| **Risiko** | mint/warning/bear | Tägliches Risikobudget, Limits und Auto-Entry. |
| **AI Thoughts** | cyan | Live-Reasoning-Feed mit Zeitstempeln. |
| **Kapitalfluss** | warning | BTC.D / ETH.D / USDT.D + Sektorrotation. |
| **Aktive Signale** | orange | Top 10 der globalen Setups (automatische Aktualisierung alle 30 Sekunden). |

Jede Karte verwendet die gemeinsame Komponente `<FeatureCard variant="..." description="..." />` — farbiger Rahmen, Symbol, Badge und erklärende Beschreibung.

---

## 7. Authentifizierung und Sicherheit

- E-Mail/Passwort + Google OAuth (ohne automatische Bestätigung).
- Rollen liegen in der separaten Tabelle `user_roles`; die Funktion `SECURITY DEFINER has_role()` prüft sie und hilft, eine Rechteausweitung zu verhindern.
- RLS ist für alle Tabellen aktiviert.
- `SUPABASE_SERVICE_ROLE_KEY` wird **ausschließlich** in serverseitigen Hooks (`/api/public/hooks/*`) verwendet.
- Webhooks verwenden nicht den Service-Key, sondern führen HTTP-Fetch-Anfragen pro Benutzer aus.

---

## 8. Cron-Jobs (`pg_cron`)

Alle Jobs sind alle 5 Minuten geplant (`*/5 * * * *`):

```sql
SELECT * FROM cron.job;
```

- `scan-setups-global`
- `verify-setups-global`
- `notify-setups-global` (alle 1–2 Minuten)

Jeder Job schreibt einen Eintrag in `cron_run_logs`.

---

## 9. Ordnerstruktur

```text
src/
├── routes/                   # TanStack File-based Routing
│   ├── __root.tsx            # Shell + Provider (Theme, Query, Auth)
│   ├── index.tsx             # AI Quant Cockpit (Dashboard)
│   ├── admin.tsx             # Admin-Panel
│   ├── setupy.tsx             # Setup-Terminal
│   ├── setupy.historia.tsx   # Globale Setup-Historie
│   ├── gielda.*.tsx          # Börsenmodul (USA, EU, Makro, Sektoren, ETFs, ...)
│   ├── lab.*.tsx             # Lab-Modul (Paper, Backtest, Scanner, Berichte, ...)
│   ├── _authenticated/       # Routen hinter dem Login (Alerts, Favoriten, Einstellungen, Assistent)
│   └── api/public/hooks/     # Cron- und Webhook-Endpunkte (scan, verify, notify, lab-reports)
├── lib/
│   ├── feed/                 # Detektoren, Scanner, Typen, Indikatoren
│   ├── admin.functions.ts    # serverFn: testWebhook
│   ├── setups.functions.ts   # ältere benutzerbezogene Implementierung (aufzuräumen)
│   ├── theme.tsx             # ThemeProvider (dark/light + localStorage)
│   └── ...
├── components/
│   ├── FeatureCard.tsx       # wiederverwendbare farbige Karte mit 6 Varianten
│   ├── ThemeToggle.tsx
│   ├── feed/                 # Live-Widgets (TopSetupsWidget, FeedStatusBadge, LiveIndicators)
│   ├── gielda/, lab/         # Module
│   └── ui/                   # shadcn
├── integrations/supabase/    # AUTOMATISCH GENERIERT (nicht bearbeiten)
└── styles.css                # OKLCH-Tokens für beide Themes
supabase/
└── migrations/               # Schema-Historie
```

---

## 10. Einen weiteren Setup-Detektor hinzufügen

1. Erstelle `src/lib/feed/detectors/<name>.ts` mit einer Funktion `(candles) => Setup | null`.
2. Rufe sie in der Symbol-Schleife von `src/routes/api/public/hooks/scan-setups.ts` auf.
3. Ergänze die Erkennung des Namens in der UI (`Best Setup`, `TopSetupsWidget`).
4. Optional: Erweitere das Schema `detected_setups.setup_type`.

Ein Neustart ist nicht nötig — ein erneutes Deployment genügt.

---

## 11. Themes

- **Dark Cockpit**: tiefes Marineblau + warmes institutionelles Orange `oklch(0.74 0.17 55)`, mit sanftem Glow.
- **Institutional Light**: Off-White, weiches Grau, derselbe Orangeton als Akzent und dezente Schatten.
- Der Schalter in der Kopfzeile speichert die Auswahl in `localStorage` (`cryptopuls-theme`).
- Weicher Übergang über `transition-colors` auf `<html>`.

---

## 12. Konventionen

- Alle Farben werden über CSS-Tokens definiert (`var(--accent-orange)`, `text-bull`, `bg-bear/20` usw.).
- Zahlen verwenden `font-mono` über die Klasse `.num`.
- Funktionale Karten verwenden immer `<FeatureCard>` — Variante plus erklärende Beschreibung.
- Die gesamte UI ist auf Polnisch (Code und technische Kommentare können andere Sprachen verwenden).

---

## 13. Roadmap (Kurzfassung)

- [ ] E-Mail-Benachrichtigungen (nach dem Verbinden einer Domain in Lovable Email)
- [ ] Alte benutzerbezogene `setups.functions.ts` bereinigen
- [ ] Weitere Detektoren (RSI-Divergenz, Order Block, FVG)
- [ ] Globaler Backtester (außerhalb von Lab)
- [ ] Benutzerbezogenes Ranking der Scanner-Qualität

---

**Autor:** Projekt auf Lovable Cloud erstellt.  
**Lizenz:** Privat.
