# Wheat & Stone codebase overview

## Framework & runtime
- Next.js App Router targeting React 19 with a custom root layout that injects Geist fonts and a client-side session wrapper responsible for theme restoration and header rendering.【F:src/app/layout.tsx†L1-L31】【F:src/app/ClientLayout.tsx†L1-L30】
- Authentication is handled through NextAuth credentials with JWT sessions and Prisma-backed lookups; session augmentation supplies `id` and `role` for downstream role checks.【F:src/lib/authOptions.ts†L1-L65】【F:src/next-auth.d.ts†L1-L19】

## Data layer
- Prisma ORM targets a SQLite datasource with models for users, articles (including reaction counters), comments, and reactions alongside supporting enums for roles, statuses, and reaction types.【F:prisma/schema.prisma†L1-L83】
- Prisma client reuse is handled via a singleton to survive hot reloads, and helper utilities expose frequently used queries such as fetching the latest published article.【F:src/lib/prisma.ts†L1-L13】【F:src/lib/getLatestArticle.ts†L1-L12】

## API surface
- `/api/articles` exposes a public GET for published articles and an unauthenticated POST that slugifies new article titles, sets status, and immediately marks published articles as live—no auth guard is enforced here.【F:src/app/api/articles/route.ts†L1-L88】
- `/api/articles/[slug]` allows anonymous GET reads, unauthenticated reaction increments, and authenticated PATCH/DELETE editorial actions based on session roles. Slug normalization prevents collisions during renames.【F:src/app/api/articles/[slug]/route.ts†L1-L146】
- `/api/register` provisions credential accounts with bcrypt hashing while defaulting roles to `STONEHOLDER`; `/api/health` returns an uncached heartbeat payload for uptime checks.【F:src/app/api/register/route.ts†L1-L30】【F:src/app/api/health/route.ts†L1-L12】
- NextAuth routes proxy to the shared auth options, and supporting scripts (e.g., deploy shell script, PM2 ecosystem file) manage production operations.【F:src/app/api/auth/[...nextauth]/route.ts†L1-L8】【F:scripts/deploy-prod.sh†L1-L37】【F:ecosystem.config.js†L1-L24】

## App pages
- Home page disables caching, retrieves the newest published article, renders it via `ArticleView`, and appends comments plus a full-width ad unit.【F:src/app/page.tsx†L1-L37】
- Article index paginates published posts with basic navigation, while article detail pages fetch by slug, gate unpublished content, and embed article body, comments, and ad placements within a responsive rail grid.【F:src/app/articles/page.tsx†L1-L55】【F:src/app/articles/[slug]/page.tsx†L1-L49】
- Admin dashboard, creation, and edit flows depend on client-side role checks; they use fetch calls to the article APIs, TinyMCE-based rich text editing, and optimistic state updates. Auth gating for `/admin` happens on the client, so direct API hardening is critical.【F:src/app/admin/page.tsx†L1-L123】【F:src/app/admin/new/page.tsx†L1-L56】【F:src/app/admin/edit/[slug]/page.tsx†L1-L41】
- Drafts view runs server-side, requiring an authenticated session before listing the viewer’s unpublished work.【F:src/app/drafts/page.tsx†L1-L36】
- Login/registration pages are client components that manage credential submission and auto-login after registration.【F:src/app/login/page.tsx†L1-L70】【F:src/app/register/page.tsx†L1-L92】

## Shared UI & styling
- `Header` handles responsive navigation, role-aware admin links, Keplr wallet prompts, theme toggling, and mobile drawer behavior with dynamic CSS variables for layout sizing.【F:src/components/Header.tsx†L1-L240】
- `ArticleView` is the article renderer, responsible for sanitizing server HTML on the client, injecting floating advertisement components, controlling header imagery, and coordinating supporting components like `WysiwygStyle` and ad rails.【F:src/components/article/ArticleView.tsx†L1-L228】
- `CommentsSection` lazily loads the Facebook SDK and pairs it with a reactions bar that performs optimistic PATCH calls to the article API.【F:src/components/article/CommentsSection.tsx†L1-L53】【F:src/components/article/ReactionsBar.tsx†L1-L58】
- Editorial experiences rely on TinyMCE (`RichField`) with shared WYSIWYG CSS, while a TipTap-based `RichEditor` remains available but unused in the current UI.【F:src/components/editor/RichField.tsx†L1-L73】【F:src/components/editor/wysiwygStyle.ts†L1-L79】【F:src/components/editor/RichEditor.tsx†L1-L200】
- Global styles define typography, float ad behavior, image constraints, and Facebook comment polish; Tailwind config extends typography and safelists utilities required for advertisement layouts.【F:src/app/globals.css†L1-L167】【F:tailwind.config.js†L1-L82】

## Tooling & operations
- `prisma.config.ts`, Tailwind/PostCSS setup, and TypeScript path aliases support developer workflow, while the PM2 ecosystem file embeds production secrets that should be externalized in secure env vars.【F:prisma.config.ts†L1-L13】【F:postcss.config.js†L1-L7】【F:tsconfig.json†L1-L32】【F:ecosystem.config.js†L1-L24】
- Deployment script installs dependencies with a frozen lockfile, runs migrations, builds, and restarts the PM2-managed Next.js process.【F:scripts/deploy-prod.sh†L1-L37】

## Risks & opportunities
- Public POST access on `/api/articles` and client-side admin gating mean unauthorized users could create or publish content; server-side authorization should be introduced for administrative routes.【F:src/app/api/articles/route.ts†L1-L88】【F:src/app/admin/page.tsx†L1-L123】
- PM2 configuration hardcodes secrets and database paths in version control, increasing leakage risk if the repo is shared; migrate these values to environment variables or secret management tooling.【F:ecosystem.config.js†L1-L24】
- Rich text sanitization happens client-side before rendering; ensure HTML persisted server-side remains trusted or introduce server-side sanitization if additional editors or ingestion sources are added.【F:src/components/article/ArticleView.tsx†L97-L142】【F:src/components/editor/RichField.tsx†L1-L73】

## Documentation gaps
- README retains the default Next.js scaffold and does not describe the project, setup steps, or deployment workflow—updating it would improve onboarding.【F:README.md†L1-L32】
