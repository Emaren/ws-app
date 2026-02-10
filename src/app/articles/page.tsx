// src/app/articles/page.tsx
import type { ArticleStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

type ArticlePricingBadge = {
  offerTitle: string;
  businessName: string;
  discountPriceCents: number;
  basePriceCents: number | null;
  unitsLeft: number | null;
  endsAt: Date | null;
};

function centsToDollars(cents: number | null): string {
  if (cents === null || !Number.isFinite(cents)) return "-";
  return `$${(cents / 100).toFixed(2)}`;
}

function extractArticleSlugFromCtaUrl(ctaUrl: string | null): string | null {
  if (!ctaUrl) return null;

  try {
    const parsed = new URL(ctaUrl, "https://wheatandstone.ca");
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length >= 2 && segments[0] === "articles") {
      return segments[1]?.toLowerCase() ?? null;
    }
  } catch {
    return null;
  }

  return null;
}

function isBetterBadgeCandidate(
  candidate: ArticlePricingBadge,
  current: ArticlePricingBadge,
): boolean {
  if (candidate.discountPriceCents !== current.discountPriceCents) {
    return candidate.discountPriceCents < current.discountPriceCents;
  }

  const candidateEnd = candidate.endsAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const currentEnd = current.endsAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
  if (candidateEnd !== currentEnd) {
    return candidateEnd < currentEnd;
  }

  return candidate.offerTitle.localeCompare(current.offerTitle) < 0;
}

export default async function ArticlesPage(
  { searchParams }: { searchParams: Promise<{ page?: string }> },
) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1));
  const take = 10;
  const skip = (page - 1) * take;

  const legacyVisibleStatuses: ArticleStatus[] = ["DRAFT", "REVIEW"];
  const publicVisibilityWhere: Prisma.ArticleWhereInput = {
    OR: [
      { status: "PUBLISHED" },
      {
        AND: [
          { status: { in: legacyVisibleStatuses } },
          { publishedAt: { not: null } },
        ],
      },
    ],
  };

  const now = new Date();

  const [items, total, liveOffers] = await Promise.all([
    prisma.article.findMany({
      where: publicVisibilityWhere,
      orderBy: { publishedAt: "desc" },
      select: { slug: true, title: true, excerpt: true, publishedAt: true },
      skip,
      take,
    }),
    prisma.article.count({
      where: publicVisibilityWhere,
    }),
    prisma.offer.findMany({
      where: {
        status: "LIVE",
        discountPriceCents: { not: null },
        AND: [
          {
            OR: [{ startsAt: null }, { startsAt: { lte: now } }],
          },
          {
            OR: [{ endsAt: null }, { endsAt: { gt: now } }],
          },
        ],
      },
      select: {
        title: true,
        ctaUrl: true,
        discountPriceCents: true,
        unitsTotal: true,
        unitsClaimed: true,
        endsAt: true,
        business: {
          select: {
            name: true,
          },
        },
        inventoryItem: {
          select: {
            priceCents: true,
            compareAtCents: true,
            isActive: true,
          },
        },
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 200,
    }),
  ]);

  const pricingByArticleSlug = new Map<string, ArticlePricingBadge>();
  for (const offer of liveOffers) {
    if (offer.discountPriceCents === null) continue;
    if (offer.inventoryItem && !offer.inventoryItem.isActive) continue;

    const unitsLeft =
      offer.unitsTotal === null
        ? null
        : Math.max(offer.unitsTotal - offer.unitsClaimed, 0);
    if (unitsLeft !== null && unitsLeft <= 0) continue;

    const slug = extractArticleSlugFromCtaUrl(offer.ctaUrl);
    if (!slug) continue;

    const badge: ArticlePricingBadge = {
      offerTitle: offer.title,
      businessName: offer.business.name,
      discountPriceCents: offer.discountPriceCents,
      basePriceCents:
        offer.inventoryItem?.compareAtCents ?? offer.inventoryItem?.priceCents ?? null,
      unitsLeft,
      endsAt: offer.endsAt,
    };

    const current = pricingByArticleSlug.get(slug);
    if (!current || isBetterBadgeCandidate(badge, current)) {
      pricingByArticleSlug.set(slug, badge);
    }
  }

  return (
    <main className="mx-auto max-w-screen-xl px-4">
      <div className="mx-auto max-w-3xl py-8 space-y-6">
        <h1 className="text-2xl font-semibold">Articles</h1>

        {items.map((a) => {
          const pricingBadge = pricingByArticleSlug.get(a.slug.toLowerCase());

          return (
            <article key={a.slug} className="border rounded-2xl p-5">
              <Link
                href={`/articles/${a.slug}`}
                className="text-xl font-medium hover:underline"
              >
                {a.title}
              </Link>
              {a.excerpt && <p className="mt-2 opacity-80">{a.excerpt}</p>}

              {pricingBadge ? (
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-emerald-500/50 bg-emerald-500/10 px-2 py-1 text-emerald-300">
                    {pricingBadge.businessName} offer
                  </span>
                  <span className="rounded-full border border-amber-400/50 bg-amber-400/10 px-2 py-1 text-amber-200">
                    Now {centsToDollars(pricingBadge.discountPriceCents)}
                  </span>
                  {pricingBadge.basePriceCents !== null ? (
                    <span className="rounded-full border border-white/20 px-2 py-1 opacity-80">
                      Base {centsToDollars(pricingBadge.basePriceCents)}
                    </span>
                  ) : null}
                  <span className="rounded-full border border-white/20 px-2 py-1 opacity-80">
                    {pricingBadge.unitsLeft === null
                      ? "Units: open"
                      : `${pricingBadge.unitsLeft} units left`}
                  </span>
                  {pricingBadge.endsAt ? (
                    <span className="rounded-full border border-white/20 px-2 py-1 opacity-80">
                      Ends {pricingBadge.endsAt.toLocaleString()}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}

        <div className="flex items-center justify-between pt-6">
          <Link
            href={`/articles?page=${Math.max(1, page - 1)}`}
            className={`underline ${page === 1 ? "pointer-events-none opacity-40" : ""}`}
          >
            Newer
          </Link>
          <span className="opacity-60">
            Page {page} / {Math.max(1, Math.ceil(total / take))}
          </span>
          <Link
            href={`/articles?page=${page + 1}`}
            className={`underline ${skip + take >= total ? "pointer-events-none opacity-40" : ""}`}
          >
            Older
          </Link>
        </div>
      </div>
    </main>
  );
}
