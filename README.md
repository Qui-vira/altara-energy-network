# Altara Energy Network

A production-shaped private solar audit, equipment recommendation, quote, and pro-forma invoice system for Altara Energy Network.

## Features

- Public Solar Readiness Check with photo uploads
- Protected admin dashboard and lead pipeline
- Appliance load audit calculator with admin overrides
- Installer verification workflow with restricted pricing visibility
- Photo review placeholders for future AI vision analysis
- Editable equipment, vendor, vendor price, source, and research records
- Research-driven equipment recommendation engine
- Quote builder with margins, fees, tax, discounts, and payment structures
- Pro-forma invoice PDF generation with Altara branding and disclaimer
- Installer work orders and maintenance tracking

## Setup

```bash
npm install
cp .env.example .env
# update DATABASE_URL and NEXTAUTH_SECRET
npm run prisma:generate
npm run db:push
npm run db:seed
npm run dev
```

Seed credentials for local setup:

- Admin: `admin@altara.energy` / `AltaraAdmin2026!`
- Installer: `installer@altara.energy` / `AltaraInstaller2026!`

Change these immediately outside local development.

## App ownership rules

Altara owns customer data, vendor data, the calculator, pricing, quotes, and invoices. Installers only verify site/load details, safety risk, installation scope, and work orders. Installer pages intentionally hide cost price, profit margin, vendor margin, and full customer financial data.
