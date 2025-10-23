// src/app/articles/[slug]/page.tsx
import { prisma } from "@/lib/prisma";
import ArticleView from "@/components/article/ArticleView";
import AdRail from "@/components/article/AdRail";
import CommentsSection from "@/components/article/CommentsSection";

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const article = await prisma.article.findUnique({ where: { slug: params.slug } });
  if (!article || article.status !== "PUBLISHED") {
    return <div className="mx-auto max-w-3xl p-8">Not found.</div>;
  }

  return (
    <main className="mx-auto max-w-screen-xl px-4">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,720px)_300px_1fr] gap-6">
        <div className="hidden lg:block" />
        <div className="py-8">
          <ArticleView article={article} variant="full" />
          <CommentsSection article={article} />
        </div>
        <aside className="py-8">
          <AdRail />
        </aside>
        <div className="hidden lg:block" />
      </div>
    </main>
  );
}
