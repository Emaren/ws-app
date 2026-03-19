// src/app/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import type { Metadata } from "next";
import { getLatestArticle } from "@/lib/getLatestArticle";
import ArticleViewTracker from "@/components/analytics/ArticleViewTracker";
import ArticleView from "@/components/article/ArticleView";
import NativeCommentsSection from "@/components/article/NativeCommentsSection";
import AdFullWidth from "@/components/article/AdFullWidth";
import {
  HomeAtlasSurface,
  HomeGazetteSurface,
  HomeMarketplaceSurface,
} from "@/components/home/HomeExperienceSurfaces";
import ActionLinks from "@/components/site/ActionLinks";
import SocialIconsRow from "@/components/site/SocialIconsRow";
import { listPublicArticleCommentsForArticle } from "@/lib/articleComments";
import { getHomePageStories } from "@/lib/getHomePageStories";
import { getPublicPageExperience } from "@/lib/publicExperienceServer";

const container = "ws-container";

function resolveSiteOrigin(): URL {
  const fallback = "https://wheatandstone.ca";
  const raw = process.env.NEXT_PUBLIC_SITE_ORIGIN?.trim() || process.env.NEXTAUTH_URL?.trim();
  if (!raw) return new URL(fallback);
  const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(normalized);
  } catch {
    return new URL(fallback);
  }
}

function socialImageVersion(): string {
  return process.env.NEXT_PUBLIC_X_CARD_VERSION?.trim().replace(/\s+/g, "") || "20260304-1";
}

function resolveSocialImage(siteOrigin: URL, coverUrl?: string | null): string {
  const candidate = coverUrl?.trim();
  if (candidate) {
    try {
      return new URL(candidate, siteOrigin).toString();
    } catch {
      // ignore and fall back
    }
  }
  return new URL(`/og-x-card.jpg?v=${encodeURIComponent(socialImageVersion())}`, siteOrigin).toString();
}

export async function generateMetadata(): Promise<Metadata> {
  const siteOrigin = resolveSiteOrigin();
  const latestArticle = await getLatestArticle();
  const canonical = new URL("/", siteOrigin).toString();
  const description =
    latestArticle?.excerpt?.trim() ||
    "Health, Heritage, and Truth in Every Bite. The premier health site for Grande Prairie and area.";
  const title = latestArticle
    ? `${latestArticle.title} | Wheat & Stone`
    : "Wheat & Stone";
  const image = resolveSocialImage(siteOrigin, latestArticle?.coverUrl);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      title,
      description,
      siteName: "Wheat & Stone",
      locale: "en_CA",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: latestArticle?.title || "Wheat & Stone featured article",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const [article, stories, pageExperience] = await Promise.all([
    getLatestArticle(),
    getHomePageStories(),
    getPublicPageExperience({
      page: "home",
      searchParams: resolvedSearchParams,
    }),
  ]);

  if (!article) {
    return (
      <main className={container}>
        <div className="py-16 text-center opacity-70">No articles published yet.</div>
      </main>
    );
  }

  const supportingStories = stories.filter((story) => story.slug !== article.slug);

  if (pageExperience.layout === "gazette") {
    return (
      <>
        <ArticleViewTracker
          articleSlug={article.slug}
          sourceContext="home_latest_article"
        />
        <HomeGazetteSurface
          edition={pageExperience.edition}
          latestArticle={article}
          supportingStories={supportingStories}
        />
        <div className="ws-container overflow-x-clip">
          <ActionLinks />
        </div>
        <div className="ws-container overflow-x-clip">
          <SocialIconsRow
            facebookUrl="https://www.facebook.com/"
            discordUrl="https://discord.gg/"
            email="mailto:tony@wheatandstone.ca"
          />
        </div>
      </>
    );
  }

  if (pageExperience.layout === "marketplace") {
    return (
      <>
        <ArticleViewTracker
          articleSlug={article.slug}
          sourceContext="home_latest_article"
        />
        <HomeMarketplaceSurface
          edition={pageExperience.edition}
          latestArticle={article}
          supportingStories={supportingStories}
        />
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
      </>
    );
  }

  if (pageExperience.layout === "atlas") {
    return (
      <>
        <ArticleViewTracker
          articleSlug={article.slug}
          sourceContext="home_latest_article"
        />
        <HomeAtlasSurface
          edition={pageExperience.edition}
          latestArticle={article}
          supportingStories={supportingStories}
        />
        <div className="ws-container overflow-x-clip">
          <ActionLinks />
        </div>
        <div className="ws-container overflow-x-clip">
          <SocialIconsRow
            facebookUrl="https://www.facebook.com/"
            discordUrl="https://discord.gg/"
            email="mailto:tony@wheatandstone.ca"
          />
        </div>
      </>
    );
  }

  const initialComments = await listPublicArticleCommentsForArticle(article.id);

  return (
    <main className={`${container} stack stack--lg`}>
      <ArticleViewTracker
        articleSlug={article.slug}
        sourceContext="home_latest_article"
      />
      <div className="pt-[var(--section-gap-sm)]">
        <ArticleView
          article={article}
          variant="full"
          experience={pageExperience}
        />
      </div>

      <div className="ws-container overflow-x-clip mb-12 md:mb-16">
        <NativeCommentsSection
          articleSlug={article.slug}
          articleTitle={article.title}
          initialComments={initialComments}
        />
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
