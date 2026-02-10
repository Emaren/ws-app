# WheatAndStone `ws-app`

Frontend + in-process application API for WheatAndStone.ca.

## Current role in the system

`ws-app` is the live Next.js application that currently handles:

- Public article and home pages
- Admin/editor UI
- Authentication UI/session via NextAuth (backed by `ws-api` auth endpoints)
- Article and registration API routes
- Article lifecycle/ownership enforcement (`DRAFT/REVIEW/PUBLISHED/ARCHIVED`)
- Safe rich article render path with server-side HTML sanitization
- Stripe checkout + webhook-driven subscription entitlement sync
- Owner/admin billing reconciliation tooling
- Session-backed wallet link proxy routes for signature-based linking
- Owner/admin rewards reporting/export terminal proxied to ws-api
- PWA foundation (manifest, service worker, offline shell, install prompt)
- Web push campaign UX (browser subscription capture + push fallback metadata)
- Direct Prisma database access

Even though `ws-api` exists as a separate backend repo, `ws-app` is still the active source of truth for most content/auth operations today.

## Tech stack

- Next.js 15 (App Router)
- React 19 + Tailwind CSS
- NextAuth (credentials)
- Prisma ORM
- TypeScript

## Key directories

- `src/app/` routes and API handlers
- `src/components/` UI components
- `src/lib/` shared auth/prisma helpers
- `prisma/` schema and migrations
- `scripts/` deploy/preview helpers
- `docs/` architecture and audit docs

## Local setup

Prereqs:

- Node.js 20+
- pnpm 9+
- Postgres instance reachable by `DATABASE_URL`

Install and run:

```bash
pnpm install
pnpm prisma:generate
pnpm prisma:migrate:deploy
pnpm dev
```

## Environment variables

Core required:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `PORT` (default local dev port expected by scripts)
- `WS_API_BASE_URL` (backend auth base URL, e.g. `http://127.0.0.1:3012`)
- `NEXT_PUBLIC_WALLET_CHAIN_ID` (wallet chain id for Keplr, default `wheatandstone`)
- `NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY` (VAPID public key for browser push subscribe UX)

Checkout flow required (if premium page enabled):

- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID_MONTHLY`
- `STRIPE_WEBHOOK_SECRET`

Optional:

- `STRIPE_PRICE_ID_YEARLY`
- `NEXT_PUBLIC_SITE_ORIGIN`
- `STRIPE_SUCCESS_URL`
- `STRIPE_CANCEL_URL`
- `PORT`
- `NEXT_DIST_DIR`

## Scripts

- `pnpm dev`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm start`
- `pnpm preview`
- `pnpm verify`
- `pnpm ci:migrations`
- `pnpm pwa:icons`
- `pnpm perf:mobile`
- `pnpm prisma:migrate:deploy`
- `pnpm studio:dev`

## CI gates

GitHub Actions workflow: `.github/workflows/ci.yml`

Gate order:

1. `pnpm ci:migrations`
2. `pnpm lint`
3. `pnpm test`
4. `pnpm build`

The workflow always publishes a gate summary table and fails the run if any gate is not `PASS`.

## Baseline documentation

- `docs/baseline-audit.md` current architecture, env matrix, risks, missing guardrails
- `docs/repo-analysis.md` deeper walkthrough of code layout and route behavior
- `docs/repo-health.md` script reliability and repo hygiene baseline
- `docs/auth-integration.md` ws-api-backed auth login/logout/me/session flow
- `docs/billing-reconciliation.md` subscription entitlement + Stripe reconciliation contract
- `docs/mobile-performance.md` mobile Lighthouse checks + quality gates

## Known gaps (summary)

- Lint currently maps to TypeScript checks only (eslint not yet configured)
- Frontend unit coverage is still minimal around article lifecycle helpers
- Prisma role enum/migrations are not yet aligned to the full `OWNER/ADMIN/EDITOR/CONTRIBUTOR/USER` model
