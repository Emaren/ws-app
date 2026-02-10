# ws-app deploy runbook

Updated: 2026-02-10

## Scope

This runbook covers production pull/restart/smoke for `ws-app` on hel1.

## Preconditions

- Repo path: `/var/www/wheatandstone/ws-app`
- Services: `wheatandstone-app.service` (active), `wheatandstone-web.service` (legacy alias)
- Branch policy: `main` only

## Deploy sequence

```bash
cd /var/www/wheatandstone/ws-app
git fetch --prune origin
git checkout main
git pull --ff-only origin main
pnpm install --frozen-lockfile
pnpm build
sudo systemctl restart wheatandstone-app
sudo systemctl --no-pager --full status wheatandstone-app
```

If your host still uses `wheatandstone-web.service`, restart it as well:

```bash
sudo systemctl restart wheatandstone-web
```

## Smoke checks

```bash
cd /var/www/wheatandstone/ws-app
BASE_URL=http://127.0.0.1:3010 PUBLIC_URL=https://wheatandstone.ca pnpm run smoke:http
```

Expected:

- `/api/health` returns `200` with `"ok":true`
- `/` returns `200` and renders Wheat & Stone shell
- `/articles` returns `200`

## Parity verification

Compare commit hashes for local MBP, GitHub `origin/main`, and VPS working tree:

```bash
git rev-parse HEAD
git rev-parse origin/main
```

If hashes differ, stop and reconcile before continuing.

## Recovery

If smoke fails:

```bash
sudo journalctl -u wheatandstone-app -n 200 --no-pager
sudo systemctl restart wheatandstone-app
```

If failure persists, roll back to the last known-good commit and restart service.
