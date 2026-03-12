import { expect, test } from "@playwright/test";

test("article body fixture renders only the structured excerpt", async ({ page, context }) => {
  await context.addCookies([
    {
      name: "ws-e2e-role",
      value: "OWNER",
      domain: "localhost",
      path: "/",
    },
    {
      name: "ws-e2e-email",
      value: "tonyblum@me.com",
      domain: "localhost",
      path: "/",
    },
  ]);

  await page.goto("/e2e/article-regression");

  await expect(page.getByRole("heading", { name: "Excerpt:" })).toHaveCount(1);
  await expect(
    page.getByText(
      "Not all chocolate milk is created equal. Avalon’s glass-bottled organic chocolate milk stands alone: rich, real, and proudly Canadian.",
      { exact: true },
    ),
  ).toHaveCount(1);
  await expect(page.locator("strong").filter({ hasText: "Excerpt" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /The Chocolate Milk That Ends the Search/i })).toBeVisible();
});
