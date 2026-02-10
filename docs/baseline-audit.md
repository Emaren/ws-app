# ws-app baseline audit (2026-02-10)

This document captures the current state of `ws-app` before deeper refactors.

## 1) Architecture snapshot

`ws-app` is currently a Next.js app-router monolith that includes:

- Server-rendered/public pages under `src/app/*` (`/`, `/articles`, `/articles/[slug]`)
- Admin/editor pages under `src/app/admin/*`
- Auth pages under `src/app/login` and `src/app/register`
- In-process API routes under `src/app/api/*` for auth, registration, articles, checkout, and health
- Prisma access directly from Next route handlers via `src/lib/prisma.ts`

Important: despite having a separate `ws-api` repo, core content/auth data flow still runs inside `ws-app` API routes and Prisma calls.

## 2) Script inventory

From `package.json`:

- `dev`: run Next dev server (`PORT` default `3211`, `.next-dev`)
- `start`: run Next production server (`PORT` default `3011`)
- `preview`, `preview:*`: local production-parity flow (`.next-preview`)
- `build`: production build
- `prisma:generate`, `prisma:migrate:deploy`, `studio:dev`, `studio:prod`
- `prepare`: Husky hook setup

Current guardrail scripts missing at repo level:

- no `lint`
- no `test`
- no `typecheck`

## 3) Environment variable matrix

Observed from route handlers/config/scripts.

Required for normal production behavior:

- `DATABASE_URL` (Prisma datasource)
- `NEXTAUTH_SECRET` (token/session signing, JWT decode in routes)
- `NEXTAUTH_URL` (auth callback/site origin)

Required for premium checkout flow:

- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID_MONTHLY`

Optional/conditional:

- `NEXT_PUBLIC_SITE_ORIGIN` (explicit public origin override)
- `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL` (checkout redirect overrides)
- `PORT` (app port)
- `NEXT_DIST_DIR` (preview/build dir split)
- `NODE_ENV` (CSP mode + runtime behavior)

## 4) Risk list (current)

High:

- `POST /api/articles` is unauthenticated. Any caller can create articles.
- `GET /api/articles/[slug]` returns an article by slug without checking status, so drafts can be exposed if slug is known.
- Contributor/editor mutation in `/api/articles/[slug]` has role checks, but no ownership checks; non-admin editors can modify/delete any article.

Medium:

- Reactions endpoint increments counters without rate limiting, anti-abuse, or dedupe controls.
- No automated lint/test/typecheck pipeline to prevent regressions.
- Repo contains `.DS_Store` and local sqlite db artifacts under `prisma/prisma/*.db` even though Prisma is configured for Postgres.
- API/auth/business logic is split between ws-app and ws-api directionally, but runtime source of truth is still ws-app.

Low:

- Documentation drift exists (older docs still mention sqlite-first local setup).

## 5) Missing guardrails

Security and access:

- Server-side auth on all editorial create/update/delete routes
- Ownership enforcement for contributor role
- Validation schemas (e.g., zod) for request payloads
- Rate limiting for reaction and auth-sensitive endpoints

Quality and delivery:

- `lint`, `test`, and `typecheck` scripts wired into CI
- PR checks and branch protection for `main`
- Structured runtime error policy and audit logging for admin actions

Configuration hygiene:

- Canonical `.env.example` for all required vars
- Removal of checked-in local artifacts (`.DS_Store`, stray local DB files)

## 6) Immediate documentation baseline

Reference docs:

- `README.md` (updated setup + env + scripts)
- `docs/repo-analysis.md` (existing deeper walkthrough)
- `docs/baseline-audit.md` (this current-state audit)
