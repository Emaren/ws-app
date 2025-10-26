// src/app/page.tsx
export const dynamic = "force-dynamic";

import { unstable_noStore as noStore } from "next/cache";
import { getLatestArticle } from "@/lib/getLatestArticle";
import ArticleView from "@/components/article/ArticleView";
import CommentsSection from "@/components/article/CommentsSection";
import AdFullWidth from "@/components/article/AdFullWidth";

export default async function HomePage() {
  noStore();

  const article = await getLatestArticle();

  if (!article) {
    return (
      <main className="mx-auto w-full max-w-7xl px-6 md:px-8">
        <div className="py-16 text-center opacity-70">No articles published yet.</div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-6 md:px-8">
      <ArticleView article={article} variant="full" />
      <CommentsSection article={article} />
      <div className="mt-12 md:mt-16 lg:mt-20">
        <AdFullWidth label="TokenTap.ca" />
      </div>
    </main>
  );
}
