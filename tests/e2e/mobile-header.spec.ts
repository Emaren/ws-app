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

test("mobile quick actions stay within the viewport", async ({ page }) => {
  await page.goto("/");

  const geometry = await page.evaluate(() => {
    const labels = ["Articles", "Premium", "Register", "Login"];
    const buttons = labels.map((label) => {
      const element = Array.from(document.querySelectorAll("button")).find((candidate) => {
        const rect = candidate.getBoundingClientRect();
        return (
          candidate.textContent?.trim() === label &&
          rect.width > 0 &&
          rect.height > 0
        );
      });

      if (!element) {
        return { label, found: false };
      }

      const rect = element.getBoundingClientRect();
      return {
        label,
        found: true,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
      };
    });

    return {
      width: window.innerWidth,
      height: window.innerHeight,
      buttons,
    };
  });

  for (const button of geometry.buttons) {
    expect(button.found, `${button.label} should render as a tappable mobile quick action`).toBe(
      true,
    );
    if (!button.found) {
      continue;
    }
    expect(button.left, `${button.label} should stay on-screen horizontally`).toBeGreaterThanOrEqual(
      0,
    );
    expect(button.right, `${button.label} should stay on-screen horizontally`).toBeLessThanOrEqual(
      geometry.width,
    );
    expect(button.bottom, `${button.label} should stay on-screen vertically`).toBeLessThanOrEqual(
      geometry.height,
    );
  }
});
