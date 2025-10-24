// src/app/page.tsx
import { getLatestArticle } from "@/lib/getLatestArticle";
import ArticleView from "@/components/article/ArticleView";
import AdRail from "@/components/article/AdRail";
import CommentsSection from "@/components/article/CommentsSection";

export default async function HomePage() {
  const article = await getLatestArticle();

  if (!article) {
    return (
      <main className="mx-auto max-w-screen-xl px-4">
        <div className="mx-auto max-w-3xl py-16">
          <p className="opacity-70">No articles published yet.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-screen-xl px-4">
      {/* Same premium layout as the article page */}
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
