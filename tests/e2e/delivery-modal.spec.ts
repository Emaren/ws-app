import { expect, test, devices } from "@playwright/test";

test.use({
  ...devices["iPhone 13"],
  browserName: "chromium",
});

test("delivery modal fits inside the mobile viewport", async ({ page }) => {
  await page.goto("/e2e/article-regression");

  const openButton = page.locator('button[aria-label*="open delivery form"]').first();
  await openButton.click();

  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();

  const geometry = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top,
      bottom: rect.bottom,
      height: rect.height,
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      viewportHeight: window.innerHeight,
    };
  });

  expect(geometry.top).toBeGreaterThanOrEqual(0);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight);
  expect(geometry.height).toBeLessThanOrEqual(geometry.viewportHeight);
  expect(geometry.scrollHeight).toBeGreaterThan(geometry.clientHeight);
});
