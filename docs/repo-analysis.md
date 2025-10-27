# Wheat & Stone repository analysis

This document summarizes the structure, responsibilities, and notable risks across the entire `ws-app` codebase.

## Top-level layout
- `src/app/` – App Router layouts, pages, and API route handlers for both public and admin flows.【F:src/app/layout.tsx†L1-L34】【F:src/app/admin/page.tsx†L1-L186】
- `src/components/` – Shared UI (header, article rendering, ads, editor widgets) consumed by multiple routes.【F:src/components/Header.tsx†L1-L359】【F:src/components/article/ArticleView.tsx†L18-L360】
- `src/lib/` – Prisma singleton, NextAuth configuration, and query helpers shared between server components and API routes.【F:src/lib/prisma.ts†L1-L14】【F:src/lib/authOptions.ts†L1-L71】【F:src/lib/getLatestArticle.ts†L1-L12】
- `src/pages/_document.tsx` – Custom Document for legacy compatibility (app remains App Router–first).【F:src/pages/_document.tsx†L1-L13】
- `prisma/` – Database schema defining users, articles, comments, and reaction tracking, along with generated migrations.【F:prisma/schema.prisma†L1-L83】
- `public/` – Logos and advertisement artwork referenced by the article renderer and header; `public/ads/` holds rail creative variants.【F:public/ads/homesteader.svg†L1-L53】【F:public/ads/beaverlodge.svg†L1-L56】
- `docs/` – Internal documentation, including this analysis.【F:docs/repo-analysis.md†L1-L72】
- `scripts/` – Deployment automation and image-processing helpers for ad creatives.【F:scripts/deploy-prod.sh†L1-L38】【F:scripts/trim-bbs.mjs†L1-L39】
- Root configs (`next.config.ts`, `tailwind.config.js`, `postcss.config.js`, `tsconfig.json`, `prisma.config.ts`) establish framework, styling, and tooling defaults.【F:next.config.ts†L1-L7】【F:tailwind.config.js†L1-L134】【F:postcss.config.js†L1-L7】【F:tsconfig.json†L1-L37】【F:prisma.config.ts†L1-L13】

## Application runtime & layout
- The root layout loads Geist fonts, applies global theming, and wraps pages in a client layout that restores dark mode, injects the header, and maintains full-height content.【F:src/app/layout.tsx†L1-L34】【F:src/app/ClientLayout.tsx†L1-L30】
- `ClientLayout` also draws a border divider whose width mirrors the article rail grid.【F:src/app/ClientLayout.tsx†L21-L24】
- Global styles (`src/app/globals.css`) import Tailwind, define light/dark CSS variables, tighten `.wysiwyg` typography, and clear floats so text wraps around injected ads.【F:src/app/globals.css†L1-L94】

## Authentication & session management
- NextAuth credentials provider checks Prisma-backed users with bcrypt hashing and enriches JWT/session tokens with `id` and `role` for downstream authorization checks.【F:src/lib/authOptions.ts†L1-L71】【F:src/next-auth.d.ts†L1-L19】
- Auth API routes simply delegate GET/POST to the shared options, while registration hashes passwords and sets the default `STONEHOLDER` role.【F:src/app/api/auth/[...nextauth]/route.ts†L1-L7】【F:src/app/api/register/route.ts†L1-L28】
- Login and registration pages are client components that call these endpoints, display inline validation, and redirect after success.【F:src/app/login/page.tsx†L1-L90】【F:src/app/register/page.tsx†L1-L124】

## Data & persistence
- Prisma schema models users, articles, comments, and reactions, with enums governing roles, article status, and reaction types; timestamp columns track creation and updates.【F:prisma/schema.prisma†L1-L83】
- `src/lib/prisma.ts` exports a hot-reload-safe Prisma client, and helper `getLatestArticle` returns the newest published item with a `createdAt` fallback.【F:src/lib/prisma.ts†L1-L14】【F:src/lib/getLatestArticle.ts†L1-L12】

## API surface
- `/api/articles` exposes a public GET for published articles and an unauthenticated POST that slugifies titles, assigns status, and auto-sets `publishedAt` when publishing—no role guard is enforced.【F:src/app/api/articles/route.ts†L1-L88】
- `/api/articles/[slug]` supports anonymous GETs, public PATCH reactions (`op: "react"`), and authenticated editorial PATCH/DELETE operations that require an active session role. Slug normalization and collision checks protect renames.【F:src/app/api/articles/[slug]/route.ts†L1-L166】
- `/api/health` returns an uncached heartbeat, while `/api/register` handles signup validation and bcrypt hashing.【F:src/app/api/health/route.ts†L1-L12】【F:src/app/api/register/route.ts†L1-L28】

## Public site pages
- The homepage disables caching, fetches the latest published article through `getLatestArticle`, renders it via `ArticleView`, appends Facebook comments, and drops a full-width ad banner.【F:src/app/page.tsx†L1-L40】
- `/articles` paginates published posts 10-per-page with simple newer/older navigation.【F:src/app/articles/page.tsx†L1-L62】
- `/articles/[slug]` fetches an article dynamically, rejects unpublished content, composes the article body, comments, and below-the-fold ad inside a responsive rail grid.【F:src/app/articles/[slug]/page.tsx†L1-L53】

## Admin & contributor experiences
- `/admin` lists all articles for admins, including filtering, client-side auth gating, and optimistic deletion refreshes via the article API.【F:src/app/admin/page.tsx†L1-L186】
- `/admin/new` posts directly to `/api/articles` using the TinyMCE-based `RichField` component, lacking server-side authorization (relies on client gating only).【F:src/app/admin/new/page.tsx†L1-L76】
- `/admin/edit/[slug]` protects access with server-side session checks, hydrates article data, and renders a client `Editor` with slug normalization, publish/unpublish toggles, and destructive delete actions that call the article API.【F:src/app/admin/edit/[slug]/page.tsx†L1-L52】【F:src/app/admin/edit/[slug]/Editor.tsx†L1-L206】
- `/drafts` is a server component that requires an authenticated session and lists the viewer’s unpublished articles ordered by `publishedAt`.【F:src/app/drafts/page.tsx†L1-L49】

## Shared UI components
- `Header` manages responsive navigation, Keplr wallet prompts, admin shortcuts, theme switching, and mobile drawer behavior with extensive Tailwind classes.【F:src/components/Header.tsx†L1-L359】
- `ArticleView` orchestrates article rendering: it selects header imagery, splits HTML to position float ads, sanitizes sections client-side with DOMPurify, and embeds rail ads and WYSIWYG styling.【F:src/components/article/ArticleView.tsx†L18-L360】
- `AdRail` and `AdFullWidth` render email-linked ad cards referencing assets under `public/ads`, with Tailwind safelists ensuring their responsive dimensions survive PurgeCSS.【F:src/components/article/AdRail.tsx†L1-L156】【F:tailwind.config.js†L67-L133】
- `CommentsSection` lazily loads the Facebook SDK, renders a dark-themed comment container, and includes a `ReactionsBar` that performs optimistic reaction updates.【F:src/components/article/CommentsSection.tsx†L1-L70】【F:src/components/article/ReactionsBar.tsx†L1-L92】
- Editor utilities include TinyMCE integration (`RichField`), a dormant TipTap-based alternative (`RichEditor`), and shared WYSIWYG CSS exported for reuse across editor and reader surfaces.【F:src/components/editor/RichField.tsx†L1-L77】【F:src/components/editor/RichEditor.tsx†L1-L277】【F:src/components/editor/wysiwygStyle.ts†L1-L126】

## Styling & assets
- `globals.css` and `WysiwygStyle` enforce typography, float ad clearing, and responsive image handling; the latter re-injects shared CSS and overrides to clamp inline image widths.【F:src/app/globals.css†L1-L94】【F:src/components/article/WysiwygStyle.tsx†L1-L62】
- Tailwind is configured in class-based dark mode, extends typography defaults, and safelists advertisement layout utilities required by `ArticleView` and `AdRail`.【F:tailwind.config.js†L1-L134】
- Image assets in `public/` include multiple logo variants and ad creatives (`ads/homesteader.svg`, `ads/beaverlodge.svg`) referenced by ad components.【F:public/ads/homesteader.svg†L1-L53】【F:public/ads/beaverlodge.svg†L1-L56】

## Tooling & operations
- `scripts/deploy-prod.sh` provides a production deployment flow: load `.env.production`, install dependencies, run Prisma migrations, build, and restart the PM2 process before persisting state.【F:scripts/deploy-prod.sh†L1-L38】
- `scripts/trim-bbs.mjs` uses Sharp to trim and resize ad artwork, generating cache-busting assets in `public/`.【F:scripts/trim-bbs.mjs†L1-L39】
- PM2 configuration launches the Next.js server with bundled secrets (`NEXTAUTH_SECRET`, `DATABASE_URL`) that should be relocated to environment management before sharing the repo.【F:ecosystem.config.js†L1-L22】
- Package scripts expose dev/build commands and Prisma Studio shortcuts for dev/prod, while dependencies include both TinyMCE and TipTap stacks (only the former is wired into the UI).【F:package.json†L1-L49】

## Observations & risks
- Administrative UI relies on client-side session checks while `/api/articles` accepts unauthenticated POST/PUT operations, enabling anonymous article creation or mutation if the endpoints are exposed publicly; server-side authorization should be added.【F:src/app/api/articles/route.ts†L1-L88】【F:src/app/admin/new/page.tsx†L1-L76】【F:src/app/admin/page.tsx†L1-L186】
- PM2 config embeds production secrets and DB paths in version control, creating leakage risk—move them to environment variables or secret stores before deployment.【F:ecosystem.config.js†L1-L22】
- `ArticleView` sanitizes HTML client-side after fetching raw database content; if other renderers bypass this logic, consider server-side sanitization to avoid stale unsafe markup being delivered to clients.【F:src/components/article/ArticleView.tsx†L283-L305】
- The repo includes a `globals.css.bak` backup with divergent typography; confirm it is intentionally unused to avoid confusion or stale style updates.【F:src/app/globals.css.bak†L1-L206】

## Documentation & onboarding
- `README.md` now provides stack context, setup steps, environment variables, database guidance, deployment flow, and links back to this deeper analysis for onboarding.【F:README.md†L1-L86】
- Keep this document updated alongside architectural changes so new contributors can quickly understand cross-cutting concerns.
