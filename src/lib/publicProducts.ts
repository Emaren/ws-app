import { prisma } from "@/lib/prisma";
import { isPubliclyVisibleArticle, normalizeArticleStatus } from "@/lib/articleLifecycle";

function isVisibleArticle(article: { status: string; publishedAt: Date | null }): boolean {
  const status = normalizeArticleStatus(article.status);
  return Boolean(status && isPubliclyVisibleArticle(status, article.publishedAt));
}

function sortByPublishedAtDesc<T extends { article: { publishedAt: Date | null; updatedAt: Date } }>(
  left: T,
  right: T,
): number {
  const leftTime = left.article.publishedAt?.getTime() ?? left.article.updatedAt.getTime();
  const rightTime = right.article.publishedAt?.getTime() ?? right.article.updatedAt.getTime();
  return rightTime - leftTime;
}

function buildProductSummary(item: {
  summary: string | null;
  reviewProfiles: Array<{ verdict: string | null; article: { excerpt: string | null } }>;
}): string | null {
  return (
    item.summary ||
    item.reviewProfiles.find((review) => review.verdict)?.verdict ||
    item.reviewProfiles.find((review) => review.article.excerpt)?.article.excerpt ||
    null
  );
}

export async function listPublicProducts(limit?: number) {
  const products = await prisma.product.findMany({
    include: {
      brand: true,
      reviewProfiles: {
        include: {
          article: {
            select: {
              slug: true,
              title: true,
              excerpt: true,
              status: true,
              publishedAt: true,
              updatedAt: true,
              coverUrl: true,
            },
          },
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  const items = products
    .map((product) => {
      const publicReviews = product.reviewProfiles
        .filter((review) => isVisibleArticle(review.article))
        .sort(sortByPublishedAtDesc);

      if (publicReviews.length === 0) {
        return null;
      }

      const featuredReview = publicReviews[0];

      return {
        slug: product.slug,
        name: product.name,
        brandName: product.brand?.name ?? null,
        category: product.category,
        organicStatus: product.organicStatus,
        summary: buildProductSummary({ summary: product.summary, reviewProfiles: publicReviews }),
        heroImageUrl: product.heroImageUrl || featuredReview.article.coverUrl || null,
        reviewCount: publicReviews.length,
        featuredReview: {
          articleSlug: featuredReview.article.slug,
          articleTitle: featuredReview.article.title,
          excerpt: featuredReview.article.excerpt,
          publishedAt: featuredReview.article.publishedAt,
          score: featuredReview.reviewScore,
          verdict: featuredReview.verdict,
        },
      };
    })
    .filter(Boolean) as Array<{
    slug: string;
    name: string;
    brandName: string | null;
    category: string | null;
    organicStatus: string | null;
    summary: string | null;
    heroImageUrl: string | null;
    reviewCount: number;
    featuredReview: {
      articleSlug: string;
      articleTitle: string;
      excerpt: string | null;
      publishedAt: Date | null;
      score: number | null;
      verdict: string | null;
    };
  }>;

  return typeof limit === "number" ? items.slice(0, limit) : items;
}

export async function getPublicProductBySlug(slug: string) {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      brand: true,
      reviewProfiles: {
        include: {
          article: {
            include: {
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
          },
        },
      },
    },
  });

  if (!product) {
    return null;
  }

  const publicReviews = product.reviewProfiles
    .filter((review) => isVisibleArticle(review.article))
    .sort(sortByPublishedAtDesc)
    .map((review) => ({
      id: review.id,
      score: review.reviewScore,
      verdict: review.verdict,
      recommendedFor: review.recommendedFor,
      avoidFor: review.avoidFor,
      localAvailability: review.localAvailability,
      article: {
        slug: review.article.slug,
        title: review.article.title,
        excerpt: review.article.excerpt,
        publishedAt: review.article.publishedAt,
        updatedAt: review.article.updatedAt,
        coverUrl: review.article.coverUrl,
      },
      commerceModules: review.article.commerceModules,
    }));

  if (publicReviews.length === 0) {
    return null;
  }

  const spotlightMap = new Map<string, { articleSlug: string; module: (typeof publicReviews)[number]["commerceModules"][number] }>();

  for (const review of publicReviews) {
    for (const module of review.commerceModules) {
      const key =
        module.offerId ||
        module.inventoryItemId ||
        module.businessId ||
        module.businessSlug ||
        module.title ||
        module.id;

      if (!spotlightMap.has(key)) {
        spotlightMap.set(key, {
          articleSlug: review.article.slug,
          module,
        });
      }
    }
  }

  return {
    slug: product.slug,
    name: product.name,
    brandName: product.brand?.name ?? null,
    category: product.category,
    organicStatus: product.organicStatus,
    summary: buildProductSummary({ summary: product.summary, reviewProfiles: publicReviews }),
    heroImageUrl: product.heroImageUrl || publicReviews[0]?.article.coverUrl || null,
    reviewCount: publicReviews.length,
    latestReview: publicReviews[0],
    reviews: publicReviews,
    spotlights: [...spotlightMap.values()],
  };
}
