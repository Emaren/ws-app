import { notFound } from "next/navigation";
import { ArticleStatus } from "@prisma/client";
import ArticleBody from "@/components/article/ArticleBody";

type RegressionArticle = Parameters<typeof ArticleBody>[0]["article"];

const articleFixture: RegressionArticle = {
  id: "e2e-article-regression",
  createdAt: new Date("2026-03-12T00:00:00.000Z"),
  updatedAt: new Date("2026-03-12T00:00:00.000Z"),
  slug: "avalon-organic-chocolate-milk-the-gold-standard-in-a-glass-bottle",
  title: "Avalon Organic Chocolate Milk: The Gold Standard in a Glass Bottle",
  coverUrl: null,
  content: `
    <div><p><strong>Excerpt</strong>:<br />Not all chocolate milk is created equal. Avalon’s glass-bottled organic chocolate milk stands alone — rich, real, and proudly Canadian.</p>
    <hr />
    </div>
    <div><h3><strong>The Chocolate Milk That Ends the Search</strong></h3></div>
    <p>The fixture keeps the authored body intact while proving the duplicate excerpt block is stripped.</p>
  `,
  publishedAt: new Date("2026-03-12T00:00:00.000Z"),
  status: ArticleStatus.PUBLISHED,
  authorId: null,
  excerpt:
    "Not all chocolate milk is created equal. Avalon’s glass-bottled organic chocolate milk stands alone: rich, real, and proudly Canadian.",
  likeCount: 0,
  wowCount: 0,
  hmmCount: 0,
  commerceModules: [],
};

export const dynamic = "force-dynamic";

export default function ArticleRegressionPage() {
  if (process.env.WS_E2E_SMOKE_AUTH !== "enabled") {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.22em] opacity-60">E2E Article Regression</p>
        <h1 className="mt-2 text-2xl font-semibold">Article excerpt regression fixture</h1>
      </div>
      <ArticleBody article={articleFixture} />
    </main>
  );
}
