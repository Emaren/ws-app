import { defineConfig } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3211);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "line",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: `PORT=${port} NEXT_PUBLIC_SITE_ORIGIN=${baseURL} NEXTAUTH_URL=${baseURL} WS_E2E_SMOKE_AUTH=enabled pnpm dev`,
    url: `${baseURL}/forgot-password`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
