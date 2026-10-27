# Fullanalizator 2.1 — Market Analysis Platform

**Language / Sprache / Język:** 🇬🇧 **English** · 🇩🇪 [Deutsch](README.de.md) · 🇵🇱 [Polski](README.pl.md)

## Project overview

Fullanalizator 2.1 is a web-based market analysis platform that brings market data, analytical modules and visualizations into one application. Its focus is research and decision support, not automated live trading.

## Key capabilities

- Live prices and candlestick data from configured market-data providers
- Global setup scanning and status verification
- Technical analysis and pattern-based setup detection
- Market-regime and sentiment views
- AI-assisted reasoning, summaries and reports
- Risk-control settings and paper-trading/research modules
- Webhook notifications and an administrative configuration area
- User authentication and role-based access controls

## Technology

- React 19, TypeScript, TanStack Start and Vite
- Tailwind CSS and shadcn/ui
- Supabase / Lovable Cloud
- Server-side functions and scheduled jobs
- Market charts and interactive data visualizations
- AI gateway integration

## Architecture at a glance

Scheduled jobs trigger scanning, setup verification and notification workflows. Market-analysis results are stored and presented in the application. User-specific settings and administrative operations are separated by authentication and authorization controls.

## Themes

The interface includes two visual themes:
- **Dark Cockpit** — dark, high-contrast analytical workspace
- **Institutional Light** — light, restrained dashboard theme

## Development status

This repository describes the application's implementation and intended workflows. External provider availability, deployment configuration and production behavior should be verified in the target environment. The project is designed for analysis and simulation; it does not place real trades.

## Disclaimer

Market analysis is informational only and is not investment advice. Historical or generated signals do not guarantee future results.
