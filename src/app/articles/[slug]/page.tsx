// src/app/articles/[slug]/page.tsx
import { prisma } from "@/lib/prisma";
import ArticleView from "@/components/article/ArticleView";
import CommentsSection from "@/components/article/CommentsSection";
import AdFullWidth from "@/components/article/AdFullWidth";

// keep dynamic so DB status changes reflect immediately
export const dynamic = "force-dynamic";
export const revalidate = 0;

const railGrid =
  "site-shell--wide md:grid md:grid-cols-[1fr_minmax(0,800px)_1fr]";

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params; // Next 15: params is a Promise

  const article = await prisma.article.findUnique({ where: { slug } });

  if (!article || article.status !== "PUBLISHED") {
    return (
      <div className={railGrid}>
        <div className="md:col-start-2 py-16 text-center opacity-70">
          Article not found.
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Middle column layout is handled inside ArticleView */}
      <ArticleView article={article} variant="full" />

      {/* Center the comments and give them bottom margin before the ad */}
      <div className={railGrid}>
        <div className="md:col-start-2 mb-12 md:mb-16">
          <CommentsSection article={article} />
        </div>
      </div>

      {/* Full-width ad under the comments */}
      <div className={railGrid}>
        <div className="md:col-start-2">
          <AdFullWidth label="TokenTap.ca" />
        </div>
      </div>
    </>
  );
}
