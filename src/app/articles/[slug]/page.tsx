// src/app/articles/[slug]/page.tsx
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { isPubliclyVisibleArticle, normalizeArticleStatus } from "@/lib/articleLifecycle";
import ArticleViewTracker from "@/components/analytics/ArticleViewTracker";
import ArticleView from "@/components/article/ArticleView";
import CommentsSection from "@/components/article/CommentsSection";
import AdFullWidth from "@/components/article/AdFullWidth";
import DeliveryCheckoutNotice from "@/components/commerce/DeliveryCheckoutNotice";
import ActionLinks from "@/components/site/ActionLinks";
import SocialIconsRow from "@/components/site/SocialIconsRow";
import { getPublicPageExperience } from "@/lib/publicExperienceServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const mountainFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Edmonton",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZoneName: "shortGeneric",
});

function formatMountainTime(dt?: Date | string | null): string | undefined {
  if (!dt) return undefined;
  const value = typeof dt === "string" ? new Date(dt) : dt;
  const parts = mountainFormatter.formatToParts(value);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const dayPeriod = (lookup.dayPeriod ?? "").replace(/\./g, "").toLowerCase();
  return `${lookup.year}-${lookup.month}-${lookup.day} ${lookup.hour}:${lookup.minute}${dayPeriod} ${lookup.timeZoneName ?? "MT"}`;
}

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

function resolveSocialImage(siteOrigin: URL, coverUrl?: string | null): string {
  const candidate = coverUrl?.trim();
  if (candidate) {
    try {
      return new URL(candidate, siteOrigin).toString();
    } catch {
      // ignore and use fallback
    }
  }
  const version = process.env.NEXT_PUBLIC_X_CARD_VERSION?.trim().replace(/\s+/g, "") || "20260304-1";
  return new URL(`/og-x-card.jpg?v=${encodeURIComponent(version)}`, siteOrigin).toString();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await prisma.article.findUnique({
    where: { slug },
    select: {
      slug: true,
      title: true,
      excerpt: true,
      coverUrl: true,
      status: true,
      publishedAt: true,
    },
  });
  const siteOrigin = resolveSiteOrigin();
  const canonical = new URL(`/articles/${encodeURIComponent(slug)}`, siteOrigin).toString();

  if (!article) {
    return {
      title: "Article not found | Wheat & Stone",
      alternates: { canonical },
      robots: { index: false, follow: false },
    };
  }

  const status = normalizeArticleStatus(article.status);
  const isVisible = Boolean(status && isPubliclyVisibleArticle(status, article.publishedAt));
  const title = `${article.title} | Wheat & Stone`;
  const description =
    article.excerpt?.trim() ||
    "Read trusted local-first food reviews from Wheat & Stone.";
  const image = resolveSocialImage(siteOrigin, article.coverUrl);

  return {
    title,
    description,
    alternates: { canonical },
    robots: isVisible
      ? { index: true, follow: true }
      : { index: false, follow: false },
    openGraph: {
      type: "article",
      url: canonical,
      title,
      description,
      siteName: "Wheat & Stone",
      locale: "en_CA",
      publishedTime: article.publishedAt?.toISOString(),
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: article.title,
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

export default async function ArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const [article, pageExperience] = await Promise.all([
    prisma.article.findUnique({
    where: { slug },
    include: {
      author: {
        select: {
          id: true,
          name: true,
        },
      },
      reviewProfile: {
        include: {
          product: {
            include: {
              brand: true,
            },
          },
        },
      },
      commerceModules: {
        where: { isEnabled: true },
        orderBy: [{ placement: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          business: {
            include: {
              storeProfile: true,
            },
          },
          offer: true,
          inventoryItem: true,
        },
      },
    },
    }),
    getPublicPageExperience({
      page: "article",
      searchParams: resolvedSearchParams,
    }),
  ]);
  const status = normalizeArticleStatus(article?.status);

  if (!article || !status || !isPubliclyVisibleArticle(status, article.publishedAt)) {
    return (
      <main className="ws-container">
        <div className="py-16 text-center opacity-70">Article not found.</div>
      </main>
    );
  }

  // Build stable server-side timestamps to avoid hydration diffs
  const publishedAtISOString =
    article.publishedAt ? new Date(article.publishedAt).toISOString() : undefined;
  const publishedAtLabel = formatMountainTime(article.publishedAt);
  const facebookAppId =
    process.env.NEXT_PUBLIC_FACEBOOK_APP_ID?.trim() ||
    process.env.FACEBOOK_CLIENT_ID?.trim() ||
    null;

  return (
    <>
      <ArticleViewTracker
        articleSlug={article.slug}
        sourceContext="article_page"
      />
      <div className="ws-container mb-6">
        <DeliveryCheckoutNotice />
      </div>
      <ArticleView
        article={article}
        variant="full"
        publishedAtLabel={publishedAtLabel}
        publishedAtISOString={publishedAtISOString}
        experience={pageExperience}
      />

      {/* Page-frame sections (containerized + clipped) */}
      <div className="ws-container overflow-x-clip mb-12 md:mb-16">
        <CommentsSection article={article} facebookAppId={facebookAppId} />
      </div>

      <div className="ws-container overflow-x-clip">
        <ActionLinks />
      </div>

      <div className="ws-container overflow-x-clip">
        <AdFullWidth
          label=""
          ctaLabel="Visit TokenTap.ca"
          articleSlug={article.slug}
          sourceContext="article_bottom_ad"
        />
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
