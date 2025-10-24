// src/app/articles/[slug]/page.tsx
import { prisma } from "@/lib/prisma";
import ArticleView from "@/components/article/ArticleView";
import CommentsSection from "@/components/article/CommentsSection";
import AdFullWidth from "@/components/article/AdFullWidth";

type PageProps = {
  params: Promise<{ slug: string }>;
};

// keep dynamic so DB status changes reflect immediately
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;

  const article = await prisma.article.findUnique({
    where: { slug },
  });

  if (!article || article.status !== "PUBLISHED") {
    return (
      <main className="mx-auto max-w-6xl px-6 md:px-8">
        <div className="py-16 text-center opacity-70">Article not found.</div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 md:px-8">
      <ArticleView article={article} variant="full" />
      <CommentsSection article={article} />
      <AdFullWidth label="TokenTap.ca" />
    </main>
  );
}
