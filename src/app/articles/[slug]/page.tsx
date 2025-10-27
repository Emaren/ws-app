// src/app/articles/[slug]/page.tsx
import { prisma } from "@/lib/prisma";
import ArticleView from "@/components/article/ArticleView";
import CommentsSection from "@/components/article/CommentsSection";
import AdFullWidth from "@/components/article/AdFullWidth";

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

  return (
    <>
      {/* ArticleView internally handles:
          - header in .ws-container
          - hero in .ws-container.bleed
          - body in .ws-article (centered reader strip) */}
      <ArticleView article={article} variant="full" />

      {/* Comments + full-width ad live in the page frame */}
      <div className="ws-container mb-12 md:mb-16">
        <CommentsSection article={article} />
      </div>

      <div className="ws-container">
        <AdFullWidth label="TokenTap.ca" />
      </div>
    </>
  );
}
