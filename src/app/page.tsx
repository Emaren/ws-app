// src/app/page.tsx
export const dynamic = "force-dynamic";

import { unstable_noStore as noStore } from "next/cache";
import { getLatestArticle } from "@/lib/getLatestArticle";
import ArticleViewTracker from "@/components/analytics/ArticleViewTracker";
import ArticleView from "@/components/article/ArticleView";
import CommentsSection from "@/components/article/CommentsSection";
import AdFullWidth from "@/components/article/AdFullWidth";
import ActionLinks from "@/components/site/ActionLinks";
import SocialIconsRow from "@/components/site/SocialIconsRow";

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
    <main className={`${container} stack stack--lg`}>
      <ArticleViewTracker
        articleSlug={article.slug}
        sourceContext="home_latest_article"
      />
      <div className="pt-[var(--section-gap-sm)]">
        <ArticleView article={article} variant="full" />
      </div>

      <div className="ws-container overflow-x-clip mb-12 md:mb-16">
        <CommentsSection article={article} />
      </div>

      <div className="ws-container overflow-x-clip">
        <ActionLinks />
      </div>

      <div className="ws-container overflow-x-clip">
        <AdFullWidth
          label="TokenTap.ca"
          articleSlug={article.slug}
          sourceContext="home_bottom_ad"
        />
      </div>

      <div className="ws-container overflow-x-clip">
        <SocialIconsRow
          facebookUrl="https://www.facebook.com/"
          discordUrl="https://discord.gg/"
          email="mailto:tony@wheatandstone.ca"
        />
      </div>
    </main>
  );
}
