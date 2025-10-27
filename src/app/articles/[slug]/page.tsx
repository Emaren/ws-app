// src/app/articles/[slug]/page.tsx
import { prisma } from "@/lib/prisma";
import ArticleView from "@/components/article/ArticleView";
import CommentsSection from "@/components/article/CommentsSection";
import AdFullWidth from "@/components/article/AdFullWidth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const railGrid =
  "site-shell--wide md:grid md:grid-cols-[1fr_minmax(0,800px)_1fr]";

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await prisma.article.findUnique({ where: { slug } });

  if (!article || article.status !== "PUBLISHED") {
    return (
      <div className={`${container} py-16 text-center opacity-70`}>
        Article not found.
      </div>
    );
  }

  return (
    <>
      <ArticleView article={article} variant="full" />

      <div className={`${container} mb-12 md:mb-16`}>
        <CommentsSection article={article} />
      </div>

      <div className={container}>
        <AdFullWidth label="TokenTap.ca" />
      </div>
    </>
  );
}
