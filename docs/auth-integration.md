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

## OAuth flow

- OAuth providers are enabled only when corresponding env credentials are present.
- Supported providers: Google, Apple, Microsoft, Facebook, Instagram, GitHub.
- OAuth sign-in/registration is bridged into `ws-api` auth via deterministic bridge password + shared email identity.
- Instagram provider does not return email by default; `ws-app` uses a synthetic internal alias (`ig_<providerAccountId>@oauth.wheatandstone.local`) so account creation/login can still complete.

## Forgot password flow

- `/forgot-password` provides the UI entry point from login.
- `/api/auth/forgot-password` returns a generic success response and logs reset intent for existing users.
- The endpoint is non-enumerating by design (same response whether user exists or not).

## Required env

- `WS_API_BASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`

OAuth env (optional, per provider):

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET`
- `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET`
- `INSTAGRAM_CLIENT_ID`, `INSTAGRAM_CLIENT_SECRET`
- `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID`
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`

## Notes

- Backend auth state (session validity + role) is synchronized from `ws-api`.
- NextAuth remains the web session wrapper for the frontend.
- If `ws-api` login fails, `authorize` falls back to local Prisma user credentials.
- Legacy/plaintext Prisma passwords are auto-upgraded to bcrypt on successful fallback login.
- Fallback attempts to provision/login the same user in `ws-api`; if that fails, a local-only web session is still issued.
- Frontend/admin route and article API RBAC use the shared role set:
  `OWNER`, `ADMIN`, `EDITOR`, `CONTRIBUTOR`, `USER` (legacy `STONEHOLDER` maps to `USER`).
