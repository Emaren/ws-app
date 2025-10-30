// src/app/articles/[slug]/page.tsx
import { prisma } from "@/lib/prisma";
import ArticleView from "@/components/article/ArticleView";
import CommentsSection from "@/components/article/CommentsSection";
import AdFullWidth from "@/components/article/AdFullWidth";
import ActionLinks from "@/components/site/ActionLinks";
import SocialIconsRow from "@/components/site/SocialIconsRow";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await prisma.article.findUnique({ where: { slug } });

  if (!article || article.status !== "PUBLISHED") {
    return (
      <main className="ws-container">
        <div className="py-16 text-center opacity-70">Article not found.</div>
      </main>
    );
  }

  // Build stable server-side timestamps to avoid hydration diffs
  const publishedAtISOString =
    article.publishedAt ? new Date(article.publishedAt).toISOString() : undefined;

  const publishedAtUTC =
    article.publishedAt
      ? (() => {
          const iso = new Date(article.publishedAt).toISOString();
          const [d, t] = iso.split("T");
          return `${d} ${t.slice(0, 5)} UTC`;
        })()
      : undefined;

  return (
    <>
      <ArticleView
        article={article}
        variant="full"
        publishedAtUTC={publishedAtUTC}
        publishedAtISOString={publishedAtISOString}
      />

      {/* Page-frame sections (containerized + clipped) */}
      <div className="ws-container overflow-x-clip mb-12 md:mb-16">
        <CommentsSection article={article} />
      </div>

      <div className="ws-container overflow-x-clip">
        <ActionLinks />
      </div>

      <div className="ws-container overflow-x-clip">
        <AdFullWidth label="TokenTap.ca" />
      </div>

      <div className="ws-container overflow-x-clip">
        <SocialIconsRow
          facebookUrl="https://www.facebook.com/"
          discordUrl="https://discord.gg/"
          email="mailto:tony@wheatandstone.ca"
        />
      </div>
    </>
  );
}
