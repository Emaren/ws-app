# ws-app auth integration (ws-api source of truth)

Updated: 2026-02-10

## Flow

1. Login form calls NextAuth credentials provider.
2. NextAuth `authorize` calls `ws-api` `POST /auth/login`.
3. `ws-api` returns `accessToken`, `user`, and `session`.
4. NextAuth stores backend token/session metadata in JWT.
5. JWT callback periodically syncs with `ws-api` `GET /auth/session`.
6. Session callback exposes user role/id to client/server React usage.
7. Sign out triggers `ws-api` `POST /auth/logout` via NextAuth `events.signOut`.

## Register flow

`/api/register` in `ws-app` proxies to `ws-api` `POST /auth/register`.

## Required env

- `WS_API_BASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`

## Notes

- Backend auth state (session validity + role) is synchronized from `ws-api`.
- NextAuth remains the web session wrapper for the frontend.
- Frontend/admin route and article API RBAC use the shared role set:
  `OWNER`, `ADMIN`, `EDITOR`, `CONTRIBUTOR`, `USER` (legacy `STONEHOLDER` maps to `USER`).
