# ws-app repo health baseline

Updated: 2026-02-10

## Purpose

This file defines the minimum reliable checks and hygiene standards for `ws-app`.

## Required scripts

- `pnpm dev`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm verify`
- `pnpm ci:migrations`

## Local verification flow

Run before pushing:

```bash
pnpm verify
```

`verify` runs typecheck, test, and production build in sequence.

Migration gate check:

```bash
pnpm ci:migrations
```

## CI workflow

- Workflow: `.github/workflows/ci.yml`
- Gate order: migrations -> lint -> test -> build
- Reporting: writes a gate status table to the GitHub Actions step summary and fails if any gate is not `PASS`.

## Environment hygiene

- Keep local secrets in `.env` or `.env.local` only.
- Keep `.env.example` in sync when adding/removing env vars.
- Never commit private credentials.

## Guardrail status (current)

- Typecheck: available
- Lint: currently mapped to typecheck (eslint not yet configured)
- Test: baseline harness via Node test runner
- Build: reliable with explicit Prisma client generation helper

## Branch hygiene

- Mainline branch: `main`
- Keep commits scoped and reversible
- Prefix commit messages with current step id (for example `1b:`)
