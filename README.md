# Wheat & Stone App

A content publishing platform built with Next.js 15 and React 19. It supports editorial workflows with TinyMCE-powered writing tools, authenticated contributor/admin dashboards, and public-facing article pages with comments and reaction tracking.

The project is configured to run on SQLite via Prisma ORM and uses NextAuth credential-based authentication.

## Tech Stack
- **Framework:** Next.js 15 (App Router)
- **UI:** React 19, Tailwind CSS 4, custom WYSIWYG styles, TinyMCE editor
- **Auth:** NextAuth.js with credentials provider
- **Database:** SQLite managed by Prisma ORM
- **Runtime tooling:** pnpm, TypeScript, PM2 (production)

## Repository Guide
- `src/app/` – Route handlers, pages, and layouts
- `src/components/` – Reusable UI components (article rendering, ads, header, etc.)
- `src/lib/` – Prisma client, auth configuration, helper utilities
- `prisma/` – Prisma schema and migrations
- `docs/repo-analysis.md` – Architectural overview, API summary, and known risks
- `scripts/` – Deployment and asset helper scripts
- `ecosystem.config.js` – PM2 process definition used in production

## Prerequisites
- Node.js 20+
- pnpm 9+
- SQLite (bundled with the OS; Prisma manages the database file)

## Local Setup
1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Create an environment file `.env.local` (Next.js will also pick up `.env`) and define the variables:
   ```env
   DATABASE_URL="file:./prisma/dev.db"
   NEXTAUTH_SECRET="changeme"
   NEXTAUTH_URL="http://localhost:3111"
   ```
   > The production PM2 config in `ecosystem.config.js` includes hard-coded secrets—replace them with environment variables before deploying.
3. Run Prisma migrations (generates the SQLite database file):
   ```bash
   pnpm exec prisma migrate deploy
   ```
   For local iteration you can instead use:
   ```bash
   pnpm exec prisma migrate dev
   ```
4. Start the development server:
   ```bash
   pnpm dev
   ```
   The app listens on [http://localhost:3111](http://localhost:3111).

### Useful Development Commands
- Launch Prisma Studio for browsing the database:
  ```bash
  pnpm studio:dev
  ```
- Build for production:
  ```bash
  pnpm build
  pnpm start
  ```

## Authentication
- Registration happens via `/api/register`, which stores bcrypt-hashed passwords.
- Sessions use JWT strategy. The `NEXTAUTH_SECRET` must be set for both development and production.

## Database Notes
- The schema defines `User`, `Article`, `Comment`, and `Reaction` models. Articles can be published or draft, and reaction counts are aggregated per article.
- Default setup stores data in `prisma/dev.db`. Back up or reset by deleting the file and re-running migrations.

## Deployment
- Production deployment is scripted through `scripts/deploy-prod.sh`, which installs dependencies, runs migrations, builds, and restarts the PM2 process.
- Update `ecosystem.config.js` (or better, environment variables) with real secrets before running `pnpm start` under PM2.

## Additional Documentation
- See [`docs/repo-analysis.md`](docs/repo-analysis.md) for an in-depth walkthrough of the architecture, API routes, and outstanding risks (such as unauthenticated article creation). Use it as a companion guide for onboarding or further hardening the platform.

## Contributing
1. Fork and clone the repository.
2. Create a feature branch: `git checkout -b feature/your-change`.
3. Follow the setup instructions above.
4. Submit a PR with a summary of changes and testing steps.

Please open an issue if you discover security concerns (e.g., the unauthenticated article submission route) so they can be prioritized.
