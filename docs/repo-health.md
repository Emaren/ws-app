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

## Local verification flow

Run before pushing:

```bash
pnpm verify
```

`verify` runs typecheck, test, and production build in sequence.

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
