import { expect, test, devices } from "@playwright/test";

test.use({
  ...devices["iPhone 13"],
  browserName: "chromium",
});

test("mobile menu opens as a single overlay without duplicate quick-action controls", async ({
  page,
}) => {
  await page.goto("/");

  const menuButton = page.locator('button[aria-controls="mobile-menu"]');
  await menuButton.click();

  await expect(menuButton).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#mobile-menu")).toBeVisible();
  await expect(page.locator("#mobile-menu").getByRole("button", { name: "Discover" })).toBeVisible();
  await expect(page.locator('button[aria-label$="theme"]:visible')).toHaveCount(7);
});
