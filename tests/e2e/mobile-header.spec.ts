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
  await expect(page.locator("#mobile-menu").getByRole("button", { name: "Articles" })).toBeVisible();
  await expect(page.locator("#mobile-menu").getByRole("button", { name: "Premium" })).toBeVisible();
  await expect(page.locator("#mobile-menu").getByRole("button", { name: "Discover" })).toBeVisible();
  await expect(page.locator('button[aria-label$="theme"]:visible')).toHaveCount(7);
});

test("mobile header keeps only the logo rail, theme circles, and menu visible when closed", async ({
  page,
}) => {
  await page.goto("/");

  const geometry = await page.evaluate(() => {
    const visibleButtons = Array.from(document.querySelectorAll("button")).filter((candidate) => {
      const rect = candidate.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    const themeButtons = visibleButtons.filter((candidate) =>
      (candidate.getAttribute("aria-label") || "").endsWith("theme"),
    );
    const menuButton = visibleButtons.find((candidate) => candidate.getAttribute("aria-controls") === "mobile-menu");
    const hiddenUtilityLabels = ["Articles", "Premium", "Register", "Login", "Account", "Admin", "Admin Dashboard"];
    const visibleUtilityLabels = visibleButtons
      .filter((candidate) => !candidate.closest("#mobile-menu"))
      .map((candidate) => candidate.textContent?.trim() || "")
      .filter((label) => hiddenUtilityLabels.includes(label));
    const themeRects = themeButtons.map((button) => button.getBoundingClientRect());
    const menuRect = menuButton?.getBoundingClientRect() ?? null;

    return {
      width: window.innerWidth,
      height: window.innerHeight,
      themeCount: themeButtons.length,
      themeLeft: themeRects.length > 0 ? Math.min(...themeRects.map((rect) => rect.left)) : null,
      themeRight: themeRects.length > 0 ? Math.max(...themeRects.map((rect) => rect.right)) : null,
      themeTop: themeRects.length > 0 ? Math.min(...themeRects.map((rect) => rect.top)) : null,
      menuRect,
      visibleUtilityLabels,
    };
  });

  expect(geometry.themeCount).toBe(7);
  expect(geometry.visibleUtilityLabels).toEqual([]);
  expect(geometry.themeLeft ?? 0).toBeGreaterThanOrEqual(0);
  expect(geometry.themeRight ?? 0).toBeLessThanOrEqual(geometry.width);
  expect(geometry.menuRect).not.toBeNull();
  expect(geometry.themeTop ?? 0).toBeGreaterThanOrEqual((geometry.menuRect?.bottom ?? 0) - 1);
  expect(geometry.menuRect?.left ?? 0).toBeGreaterThanOrEqual(0);
  expect(geometry.menuRect?.right ?? 0).toBeLessThanOrEqual(geometry.width);
  expect(geometry.menuRect?.bottom ?? 0).toBeLessThanOrEqual(geometry.height);
});
