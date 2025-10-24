// src/app/page.tsx
import { getLatestArticle } from "@/lib/getLatestArticle";
import ArticleView from "@/components/article/ArticleView";
import CommentsSection from "@/components/article/CommentsSection";
import AdFullWidth from "@/components/article/AdFullWidth";

export default async function HomePage() {
  const article = await getLatestArticle();

  if (!article) {
    return (
      <main className="mx-auto max-w-6xl px-6 md:px-8">
        <div className="py-16 text-center opacity-70">
          No articles published yet.
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 md:px-8">
      {/* Article (renders the right-rail with the first two ads) */}
      <ArticleView article={article} variant="full" />

      {/* Comments */}
      <CommentsSection article={article} />

      {/* Full-width third ad under the comments */}
      <AdFullWidth label="TokenTap.ca" />
    </main>
  );
}
