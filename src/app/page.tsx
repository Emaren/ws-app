// src/app/page.tsx
import { getLatestArticle } from "@/lib/getLatestArticle";
import ArticleView from "@/components/article/ArticleView";
import Link from "next/link";

export default async function HomePage() {
  const article = await getLatestArticle();

  return (
    <main className="mx-auto max-w-screen-xl px-4">
      <div className="mx-auto max-w-3xl py-8 space-y-10">

        {/* Latest Article */}
        {article ? (
          <div className="space-y-4">
            <ArticleView article={article} variant="summary" />
            <Link
              href={`/articles/${article.slug}`}
              className="inline-block text-sm text-blue-600 underline"
            >
              Read full article →
            </Link>
          </div>
        ) : (
          <p>No articles published yet.</p>
        )}
      </div>
    </main>
  );
}
