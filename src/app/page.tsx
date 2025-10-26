// src/app/page.tsx
// Make the home page dynamic so new/published articles appear without a rebuild.
// (Alternatively, use `export const revalidate = 60;` for ISR.)
export const dynamic = "force-dynamic";

import { unstable_noStore as noStore } from "next/cache";
import { getLatestArticle } from "@/lib/getLatestArticle";
import ArticleView from "@/components/article/ArticleView";
import CommentsSection from "@/components/article/CommentsSection";
import AdFullWidth from "@/components/article/AdFullWidth";

export default async function HomePage() {
  // Extra guard to disable all caching for this render.
  noStore();

  const article = await getLatestArticle();

  if (!article) {
    return (
      <main className="mx-auto max-w-6xl px-6 md:px-8">
        <div className="py-16 text-center opacity-70">No articles published yet.</div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 md:px-8">
      {/* Article (renders the right-rail with the first two ads) */}
      <ArticleView article={article} variant="full" />

      {/* Comments */}
      <CommentsSection article={article} />

      {/* Full-width ad under the comments (no z-index wrapper) */}
      <div className="mt-12 md:mt-16 lg:mt-20">
        <AdFullWidth label="TokenTap.ca" />
      </div>
    </main>
  );
}
