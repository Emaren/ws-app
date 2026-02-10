# Mobile Performance Checks

`ws-app` now includes a repeatable mobile-first Lighthouse check so regressions are caught early.

## Command

```bash
pnpm perf:mobile
```

What it does:

1. Builds production assets.
2. Starts `next start` on `PORT` (default `3311`).
3. Runs Lighthouse in mobile mode.
4. Applies a score gate.

Reports are written to `.lighthouse/`:

- `.lighthouse/ws-app-mobile.report.html`
- `.lighthouse/ws-app-mobile.report.json`

## Gate thresholds

- `performance >= 70`
- `pwa >= 80`
- `accessibility >= 85`
- `best-practices >= 85`

The command exits non-zero when any category is below threshold.

## Notes

- The script uses `npx lighthouse` and expects headless Chrome to be available.
- For CI/servers, pass `PORT` and `REPORT_DIR` when needed:

```bash
PORT=3411 REPORT_DIR=.lighthouse-ci pnpm perf:mobile
```
