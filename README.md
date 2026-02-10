# WheatAndStone `ws-app`

Frontend + in-process application API for WheatAndStone.ca.

## Current role in the system

`ws-app` is the live Next.js application that currently handles:

- Public article and home pages
- Admin/editor UI
- Authentication (NextAuth credentials)
- Article and registration API routes
- Stripe checkout session creation
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

Checkout flow required (if premium page enabled):

- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID_MONTHLY`

Optional:

- `NEXT_PUBLIC_SITE_ORIGIN`
- `STRIPE_SUCCESS_URL`
- `STRIPE_CANCEL_URL`
- `PORT`
- `NEXT_DIST_DIR`

## Scripts

- `pnpm dev`
- `pnpm build`
- `pnpm start`
- `pnpm preview`
- `pnpm prisma:migrate:deploy`
- `pnpm studio:dev`

## Baseline documentation

- `docs/baseline-audit.md` current architecture, env matrix, risks, missing guardrails
- `docs/repo-analysis.md` deeper walkthrough of code layout and route behavior

## Known gaps (summary)

- Missing repo-level `lint`, `test`, and `typecheck` scripts
- Article create route currently unauthenticated
- Ownership and rate-limit guardrails are incomplete
