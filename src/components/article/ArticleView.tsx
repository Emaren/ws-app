// src/components/article/ArticleView.tsx
"use client";

import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  resolveContributorDisplayName,
  resolveContributorPublicSlug,
} from "@/lib/contributorIdentity";
import {
  buildAffiliatePairFromReviewProfile,
  type ReviewComparisonPair,
} from "@/lib/reviewProfile";
import ArticleBody from "./ArticleBody";
import ReactionsBar from "./ReactionsBar";
import AffiliatePair from "./AffiliatePair";
import ArticleHeaderArt from "./ArticleHeaderArt";
import ReviewScorecard from "./ReviewScorecard";
import {
  readEditionFromDocument,
  readExperienceFromClientStorage,
  readExperiencePreviewOverrideFromUrl,
  readLayoutFromDocument,
} from "@/lib/experiencePreferences";
import {
  resolveArticleDisplayExperience,
  sameArticleExperience,
} from "@/lib/articleExperienceClient";
import {
  getEditionLabel,
  getLayoutLabel,
  type SiteEdition,
  type SiteLayout,
} from "@/lib/experienceSystem";

type ArticleWithReviewProfile = Prisma.ArticleGetPayload<{
  include: {
    reviewProfile: {
      include: {
        product: {
          include: {
            brand: true;
          };
        };
      };
    };
    author: {
      select: {
        id: true;
        name: true;
      };
    };
    commerceModules: {
      include: {
        business: {
          include: {
            storeProfile: true;
          };
        };
        offer: true;
        inventoryItem: true;
      };
    };
  };
}>;

type Props = {
  article?: ArticleWithReviewProfile | null;
  variant: "summary" | "full";
  publishedAtLabel?: string;
  publishedAtISOString?: string;
  experience?: {
    edition: SiteEdition;
    layout: SiteLayout;
  };
};

const mountainFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Edmonton",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZoneName: "shortGeneric",
});

const formatMountainTime = (dt?: Date | string | null) => {
  if (!dt) return "";
  const value = typeof dt === "string" ? new Date(dt) : dt;
  const parts = mountainFormatter.formatToParts(value);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day} ${lookup.hour}:${lookup.minute} ${lookup.timeZoneName ?? "MT"}`;
};

function legacyAffiliatePair(article: ArticleWithReviewProfile): ReviewComparisonPair | null {
  const fingerprint = `${article.slug} ${article.title}`.toLowerCase();
  if (
    !fingerprint.includes("avalon") ||
    !fingerprint.includes("chocolate") ||
    !fingerprint.includes("milk")
  ) {
    return null;
  }

  // Transitional fallback so the original flagship review keeps its comparison module
  // until the structured fields are filled in from the editor.
  return {
    left: {
      title: "NESQUICK CHOCOLATE POWDER 44.9OZ (2.81LBS)",
      href: "https://www.amazon.ca/dp/B09FTPGQ3B?tag=wheatandstone-20",
      imageSrc: "/NQ.png",
      badge: "Beast System",
      priceHint: "From $34.60",
    },
    right: {
      title: "Avalon Organic Chocolate Milk",
      href: "mailto:tony@wheatandstone.ca?subject=Chocolate Milk Order&body=Hi%20Tony,%20I’d%20like%20to%20order%20Avalon%20Organic%20Chocolate%20Milk.%20Please%20send%20me%20the%20details.",
      imageSrc: "/AV.png",
      badge: "Health Pick",
      priceHint: "From $5.79",
    },
  };
}

function articleSurfaceWidthClass(layout: SiteLayout): string {
  if (layout === "gazette") return "mx-auto w-full max-w-[1040px]";
  if (layout === "marketplace") return "mx-auto w-full max-w-[1120px]";
  if (layout === "atlas") return "mx-auto w-full max-w-[1160px]";
  return "ws-article";
}

function editionShellToneClass(edition: SiteEdition): string {
  if (edition === "rustic") {
    return "border-amber-300/20 bg-[linear-gradient(135deg,rgba(194,149,74,0.14),rgba(17,12,8,0.92))]";
  }
  if (edition === "modern") {
    return "border-cyan-300/15 bg-[linear-gradient(135deg,rgba(14,35,63,0.96),rgba(10,10,10,0.92))]";
  }
  if (edition === "operator") {
    return "border-sky-400/20 bg-[linear-gradient(135deg,rgba(8,24,44,0.98),rgba(5,8,12,0.96))]";
  }
  return "border-white/12 bg-white/[0.03]";
}

function editionBadgeToneClass(edition: SiteEdition): string {
  if (edition === "rustic") return "border-amber-300/25 bg-amber-200/10 text-amber-50";
  if (edition === "modern") return "border-cyan-300/25 bg-cyan-400/10 text-cyan-50";
  if (edition === "operator") return "border-sky-400/25 bg-sky-500/10 text-sky-50";
  return "border-white/15 bg-white/5 text-white/90";
}

function titleScaleClass(layout: SiteLayout, edition: SiteEdition): string {
  if (layout === "marketplace" || edition === "modern") {
    return "text-4xl md:text-6xl";
  }
  if (layout === "gazette" || edition === "rustic") {
    return "text-4xl md:text-5xl";
  }
  if (edition === "operator") {
    return "text-3xl md:text-[3.4rem]";
  }
  return "text-3xl md:text-4xl";
}

function metaToneClass(edition: SiteEdition): string {
  if (edition === "operator") return "text-[13px] uppercase tracking-[0.16em] opacity-68";
  return "text-sm opacity-75";
}

function ExperienceSignalCard({
  label,
  value,
  edition,
}: {
  label: string;
  value?: string | null;
  edition: SiteEdition;
}) {
  if (!value) return null;

  return (
    <div className={`rounded-[1.35rem] border p-4 ${editionShellToneClass(edition)}`}>
      <div className="text-[11px] uppercase tracking-[0.25em] opacity-60">{label}</div>
      <div className="mt-2 text-base font-medium leading-snug">{value}</div>
    </div>
  );
}

function resolveClientArticleExperience(fallback: {
  edition: SiteEdition;
  layout: SiteLayout;
}) {
  if (typeof window === "undefined") {
    return fallback;
  }

  const preview = readExperiencePreviewOverrideFromUrl();
  if (preview) {
    return {
      edition: preview.edition,
      layout: preview.layout,
    };
  }

  const stored = readExperienceFromClientStorage();
  const documentLayout = readLayoutFromDocument();
  const documentEdition = readEditionFromDocument();

  return resolveArticleDisplayExperience({
    server: fallback,
    preview,
    storage: stored,
    document: {
      edition: documentEdition ?? undefined,
      layout: documentLayout ?? undefined,
    },
  });
}

export default function ArticleView({
  article,
  variant,
  publishedAtLabel,
  publishedAtISOString,
  experience,
}: Props) {
  const [activeExperience, setActiveExperience] = useState(() => ({
    edition: experience?.edition ?? "classic",
    layout: experience?.layout ?? "editorial",
  }));

  useEffect(() => {
    const syncFromDocument = () => {
      const nextExperience = resolveClientArticleExperience({
        edition: experience?.edition ?? "classic",
        layout: experience?.layout ?? "editorial",
      });
      setActiveExperience((current) =>
        sameArticleExperience(current, nextExperience) ? current : nextExperience,
      );
    };

    syncFromDocument();

    if (typeof document === "undefined") {
      return;
    }

    const observer = new MutationObserver((entries) => {
      if (
        entries.some((entry) =>
          ["data-layout", "data-edition", "data-preset"].includes(entry.attributeName ?? ""),
        )
      ) {
        syncFromDocument();
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-layout", "data-edition", "data-preset"],
    });

    window.addEventListener("focus", syncFromDocument);

    return () => {
      observer.disconnect();
      window.removeEventListener("focus", syncFromDocument);
    };
  }, [experience?.edition, experience?.layout]);

  if (!article) {
    return (
      <div className="ws-container">
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 text-sm opacity-70">
          No article content available.
        </div>
      </div>
    );
  }

  const comparisonPair =
    buildAffiliatePairFromReviewProfile(article.reviewProfile) || legacyAffiliatePair(article);
  const contributorName = resolveContributorDisplayName(article.author?.name);
  const contributorSlug = resolveContributorPublicSlug(article.author);
  const edition = activeExperience.edition;
  const layout = activeExperience.layout;
  const shouldShowReviewSnapshot =
    edition === "modern" || edition === "operator" || layout === "marketplace";
  const showExperienceBadge = !(layout === "editorial" && edition === "classic");
  const surfaceWidthClass = articleSurfaceWidthClass(layout);
  const titleTextClass = titleScaleClass(layout, edition);
  const leadSummary =
    article.excerpt?.trim() ||
    article.reviewProfile?.verdict?.trim() ||
    "Wheat & Stone review composition now responds to your saved reading mode.";
  const scoreLabel =
    typeof article.reviewProfile?.reviewScore === "number"
      ? `${article.reviewProfile.reviewScore}/100`
      : null;
  const categoryLabel = article.reviewProfile?.category?.trim() || "Long-form review";
  const heroSignalCards = [
    { label: "Layout", value: getLayoutLabel(layout) },
    { label: "Edition", value: getEditionLabel(edition) },
    { label: "Category", value: categoryLabel },
    { label: "Score", value: scoreLabel },
  ].filter((card) => Boolean(card.value));

  if (variant === "summary") {
    return (
      <article className="border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
        {article.coverUrl && (
          <img
            src={article.coverUrl}
            alt=""
            width={1200}
            height={320}
            sizes="(min-width: 1024px) 600px, 100vw"
            className="w-full h-56 object-cover"
            loading="lazy"
            decoding="async"
          />
        )}
        <div className="p-5 space-y-3">
          <Link
            href={`/articles/${article.slug}`}
            className="text-xl font-semibold hover:underline underline-offset-4"
          >
            {article.title ?? "Untitled"}
          </Link>
          {(article.reviewProfile?.productName ||
            article.reviewProfile?.category ||
            typeof article.reviewProfile?.reviewScore === "number") && (
            <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.16em] opacity-70">
              {typeof article.reviewProfile?.reviewScore === "number" && (
                <span className="rounded-full border border-amber-300/30 px-2.5 py-1 text-amber-100">
                  {article.reviewProfile.reviewScore}/100
                </span>
              )}
              {article.reviewProfile?.category && (
                <span className="rounded-full border border-neutral-700 px-2.5 py-1">
                  {article.reviewProfile.category}
                </span>
              )}
              {article.reviewProfile?.product?.slug ? (
                <Link
                  href={`/products/${article.reviewProfile.product.slug}`}
                  className="rounded-full border border-neutral-700 px-2.5 py-1 transition hover:bg-black/20"
                >
                  {article.reviewProfile.productName}
                </Link>
              ) : article.reviewProfile?.productName ? (
                <span className="rounded-full border border-neutral-700 px-2.5 py-1">
                  {article.reviewProfile.productName}
                </span>
              ) : null}
            </div>
          )}
          {article.excerpt && (
            <p className="opacity-80 leading-relaxed">{article.excerpt}</p>
          )}
          <div className="text-sm opacity-60">
            {article.publishedAt
              ? publishedAtLabel ?? formatMountainTime(article.publishedAt)
              : "Unpublished"}
          </div>
          <div className="text-sm opacity-60">
            By{" "}
            <Link
              href={`/community/contributors/${contributorSlug}`}
              className="underline-offset-4 hover:underline"
            >
              {contributorName}
            </Link>
          </div>
        </div>
      </article>
    );
  }

  return (
    <>
      {/* Title/byline */}
      <div className="ws-container">
        <div className={surfaceWidthClass}>
          <header
            className={`mb-6 md:mb-8 ${
              layout === "editorial"
                ? ""
                : `rounded-[2rem] border p-6 md:p-8 ${editionShellToneClass(edition)}`
            }`}
          >
            <div
              className={
                layout === "editorial"
                  ? "space-y-4"
                  : "grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start"
              }
            >
              <div>
                {showExperienceBadge ? (
                  <div
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.28em] ${editionBadgeToneClass(edition)}`}
                  >
                    {getLayoutLabel(layout)} Layout · {getEditionLabel(edition)} Edition
                  </div>
                ) : null}

                <h1
                  className={`${showExperienceBadge ? "mt-4" : ""} font-semibold tracking-tight text-balance ${titleTextClass}`}
                >
                  {article.title ?? "Untitled"}
                </h1>

                {layout === "editorial" ? null : (
                  <p className="mt-4 max-w-3xl text-base leading-7 opacity-85 md:text-lg">
                    {leadSummary}
                  </p>
                )}

                <div className={`mt-4 ${metaToneClass(edition)}`}>
                  <div className="opacity-75">
                    Author:{" "}
                    <Link
                      href={`/community/contributors/${contributorSlug}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {contributorName}
                    </Link>
                  </div>
                  <div className="opacity-60">
                    {article.publishedAt ? (
                      <time dateTime={publishedAtISOString} suppressHydrationWarning>
                        {publishedAtLabel ?? formatMountainTime(article.publishedAt)}
                      </time>
                    ) : (
                      "Unpublished"
                    )}
                  </div>
                </div>
              </div>

              {layout === "editorial" ? null : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  {heroSignalCards.map((card) => (
                    <ExperienceSignalCard
                      key={card.label}
                      label={card.label}
                      value={card.value}
                      edition={edition}
                    />
                  ))}
                </div>
              )}
            </div>
          </header>
        </div>
      </div>

      {/* Hero */}
      <div className="ws-container">
        <div className={`${surfaceWidthClass} overflow-x-clip`}>
          {layout === "marketplace" ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(320px,0.88fr)_minmax(0,1fr)] lg:items-start">
              {shouldShowReviewSnapshot ? (
                <ReviewScorecard profile={article.reviewProfile} />
              ) : (
                <div className={`rounded-[2rem] border p-6 md:p-8 ${editionShellToneClass(edition)}`}>
                  <div className="text-xs uppercase tracking-[0.3em] opacity-60">
                    Buying Lens
                  </div>
                  <p className="mt-4 text-lg leading-8 opacity-88">
                    {leadSummary}
                  </p>
                </div>
              )}
              <ArticleHeaderArt
                title={article.title}
                slug={article.slug}
                coverUrl={article.coverUrl}
                headerImageUrl={(article as any).headerImageUrl}
                contentHtml={article.content}
              />
            </div>
          ) : layout === "atlas" ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
              <ArticleHeaderArt
                title={article.title}
                slug={article.slug}
                coverUrl={article.coverUrl}
                headerImageUrl={(article as any).headerImageUrl}
                contentHtml={article.content}
              />
              <aside className={`rounded-[2rem] border p-5 md:p-6 ${editionShellToneClass(edition)}`}>
                <div className="text-xs uppercase tracking-[0.3em] opacity-60">Reading Mode</div>
                <div className="mt-4 space-y-3">
                  {heroSignalCards.map((card) => (
                    <ExperienceSignalCard
                      key={`atlas-${card.label}`}
                      label={card.label}
                      value={card.value}
                      edition={edition}
                    />
                  ))}
                </div>
              </aside>
            </div>
          ) : (
            <>
              {shouldShowReviewSnapshot ? <ReviewScorecard profile={article.reviewProfile} /> : null}
              <ArticleHeaderArt
                title={article.title}
                slug={article.slug}
                coverUrl={article.coverUrl}
                headerImageUrl={(article as any).headerImageUrl}
                contentHtml={article.content}
              />
            </>
          )}
        </div>
      </div>

      {/* Body (hard clamp any horizontal overflow) */}
      <div className="ws-container">
        <div className={`${surfaceWidthClass} overflow-x-clip`}>
          <ArticleBody article={article} experience={{ edition, layout }} />
        </div>
      </div>

      {/* Divider */}
      <div className="ws-container">
        <div className={`${surfaceWidthClass} overflow-x-clip`}>
          <hr className="adbay-rule my-8 md:my-10" />
        </div>
      </div>

      {/* Reactions */}
      <div className="ws-container">
        <div className={`${surfaceWidthClass} overflow-x-clip`}>
          <div className="mt-6 md:mt-8 mb-8 md:mb-10 flex items-center justify-between">
            <ReactionsBar
              slug={article.slug}
              likeCount={article.likeCount}
              wowCount={article.wowCount}
              hmmCount={article.hmmCount}
            />
          </div>
        </div>
      </div>

      {comparisonPair && (
        <>
          <div className="ws-container">
            <div className={`${surfaceWidthClass} overflow-x-clip`}>
              <hr className="adbay-rule my-6 md:my-8" />
            </div>
          </div>

          <div className="ws-container">
            <div className={`${surfaceWidthClass} overflow-x-clip`}>
              <AffiliatePair
                articleSlug={article.slug}
                left={comparisonPair.left}
                right={comparisonPair.right}
              />
            </div>
          </div>

          <div className="ws-container">
            <div className={`${surfaceWidthClass} overflow-x-clip`}>
              <hr className="adbay-rule" />
            </div>
          </div>
        </>
      )}
    </>
  );
}
