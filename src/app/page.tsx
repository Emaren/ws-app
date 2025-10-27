// src/app/page.tsx
export const dynamic = "force-dynamic";

import { unstable_noStore as noStore } from "next/cache";
import { getLatestArticle } from "@/lib/getLatestArticle";
import ArticleView from "@/components/article/ArticleView";
import { CommentsSectionCSR, AdFullWidthCSR } from "./ClientOnly";

const container = "ws-container";

export default async function HomePage() {
  noStore();
  const article = await getLatestArticle();

  if (!article) {
    return (
      <main className={container}>
        <div className="py-16 text-center opacity-70">No articles published yet.</div>
      </main>
    );
  }

  return (
    // Vertical rhythm between sections
    <main className={`${container} stack stack--lg`}>
      {/* gentle breathing room under the header divider */}
      <div className="pt-[var(--section-gap-sm)]">
        <ArticleView article={article} variant="full" />
      </div>

      <CommentsSectionCSR article={article} />
      <AdFullWidthCSR label="TokenTap.ca" />
    </main>
  );
}
