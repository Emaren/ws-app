import { prisma } from "@/lib/prisma";
import { isPubliclyVisibleArticle, normalizeArticleStatus } from "@/lib/articleLifecycle";

function isVisibleArticle(article: { status: string; publishedAt: Date | null }): boolean {
  const status = normalizeArticleStatus(article.status);
  return Boolean(status && isPubliclyVisibleArticle(status, article.publishedAt));
}

function isLiveOfferNow(offer: {
  status: string;
  startsAt: Date | null;
  endsAt: Date | null;
}): boolean {
  if (offer.status !== "LIVE") return false;

  const nowMs = Date.now();
  const startMs = offer.startsAt?.getTime() ?? null;
  const endMs = offer.endsAt?.getTime() ?? null;

  if (startMs !== null && nowMs < startMs) return false;
  if (endMs !== null && nowMs > endMs) return false;

  return true;
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

function buildLocationLabel(storeProfile: {
  city: string | null;
  region: string | null;
} | null): string | null {
  if (!storeProfile?.city && !storeProfile?.region) {
    return null;
  }

  return [storeProfile.city, storeProfile.region].filter(Boolean).join(", ");
}

function availableInventoryUnits(item: {
  quantityOnHand: number;
  reservedQuantity: number;
}): number {
  return Math.max(item.quantityOnHand - item.reservedQuantity, 0);
}

type ProductBuyOption = {
  key: string;
  source: "offer" | "inventory";
  articleSlug: string;
  compareAtCents: number | null;
  availableUnits: number | null;
  locationLabel: string | null;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  module: {
    id: string;
    businessId: string | null;
    businessSlug: string | null;
    businessName: string | null;
    offerId: string | null;
    offerTitle: string | null;
    inventoryItemId: string | null;
    inventoryItemName: string | null;
    title: string | null;
    badgeText: string | null;
    body: string | null;
    imageSrc: string | null;
    imageAlt: string | null;
    caption: string | null;
    side: "LEFT" | "RIGHT";
    sizePreset: "FEATURE" | "COMPACT";
    business: {
      slug: string | null;
      name: string | null;
      storeProfile: {
        displayName: string | null;
        logoUrl: string | null;
        heroImageUrl: string | null;
        city: string | null;
        region: string | null;
        deliveryEnabled: boolean | null;
      } | null;
    } | null;
    offer: {
      id: string | null;
      title: string | null;
      discountPriceCents: number | null;
    } | null;
    inventoryItem: {
      id: string | null;
      name: string | null;
      priceCents: number | null;
      imageUrl: string | null;
    } | null;
  };
};

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

  const latestArticleSlug = publicReviews[0].article.slug;
  const [offerRows, inventoryRows] = await Promise.all([
    prisma.offer.findMany({
      where: {
        OR: [
          { productId: product.id },
          { inventoryItem: { is: { productId: product.id } } },
        ],
        business: { is: { status: "ACTIVE" } },
      },
      orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
      include: {
        business: {
          include: {
            storeProfile: true,
          },
        },
        product: true,
        inventoryItem: true,
      },
    }),
    prisma.inventoryItem.findMany({
      where: {
        productId: product.id,
        isActive: true,
        business: { is: { status: "ACTIVE" } },
      },
      orderBy: [{ updatedAt: "desc" }],
      include: {
        business: {
          include: {
            storeProfile: true,
          },
        },
      },
    }),
  ]);

  const buyOptions: ProductBuyOption[] = [];
  const buyOptionKeys = new Set<string>();
  const liveInventoryOfferIds = new Set<string>();

  for (const offer of offerRows) {
    if (!isLiveOfferNow(offer)) {
      continue;
    }

    const locationLabel = buildLocationLabel(offer.business.storeProfile);
    const availableUnits = offer.inventoryItem
      ? availableInventoryUnits(offer.inventoryItem)
      : null;
    const key = `offer:${offer.id}`;

    if (buyOptionKeys.has(key)) {
      continue;
    }

    if (offer.inventoryItemId) {
      liveInventoryOfferIds.add(offer.inventoryItemId);
    }

    buyOptionKeys.add(key);
    buyOptions.push({
      key,
      source: "offer",
      articleSlug: latestArticleSlug,
      compareAtCents: offer.inventoryItem?.compareAtCents ?? null,
      availableUnits,
      locationLabel,
      deliveryEnabled: offer.business.storeProfile?.deliveryEnabled ?? false,
      pickupEnabled: offer.business.storeProfile?.pickupEnabled ?? false,
      module: {
        id: `product-offer-${offer.id}`,
        businessId: offer.business.id,
        businessSlug: offer.business.slug,
        businessName: offer.business.name,
        offerId: offer.id,
        offerTitle: offer.title,
        inventoryItemId: offer.inventoryItem?.id ?? null,
        inventoryItemName: offer.inventoryItem?.name ?? product.name,
        title: offer.title,
        badgeText:
          offer.badgeText || (offer.featured ? "Featured local offer" : "Live local offer"),
        body:
          offer.description ||
          [
            `${offer.business.storeProfile?.displayName || offer.business.name} is currently carrying ${product.name}.`,
            locationLabel ? `Location: ${locationLabel}.` : null,
            offer.business.storeProfile?.deliveryEnabled ? "Delivery is enabled." : "Pickup route available.",
          ]
            .filter(Boolean)
            .join(" "),
        imageSrc:
          offer.inventoryItem?.imageUrl ||
          offer.business.storeProfile?.heroImageUrl ||
          offer.business.storeProfile?.logoUrl ||
          product.heroImageUrl,
        imageAlt: offer.title,
        caption: offer.business.storeProfile?.deliveryEnabled ? "Reserve delivery" : "Reserve pickup",
        side: "RIGHT",
        sizePreset: "FEATURE",
        business: {
          slug: offer.business.slug,
          name: offer.business.name,
          storeProfile: offer.business.storeProfile
            ? {
                displayName: offer.business.storeProfile.displayName,
                logoUrl: offer.business.storeProfile.logoUrl,
                heroImageUrl: offer.business.storeProfile.heroImageUrl,
                city: offer.business.storeProfile.city,
                region: offer.business.storeProfile.region,
                deliveryEnabled: offer.business.storeProfile.deliveryEnabled,
              }
            : null,
        },
        offer: {
          id: offer.id,
          title: offer.title,
          discountPriceCents: offer.discountPriceCents,
        },
        inventoryItem: offer.inventoryItem
          ? {
              id: offer.inventoryItem.id,
              name: offer.inventoryItem.name,
              priceCents: offer.inventoryItem.priceCents,
              imageUrl: offer.inventoryItem.imageUrl,
            }
          : null,
      },
    });
  }

  for (const item of inventoryRows) {
    if (liveInventoryOfferIds.has(item.id)) {
      continue;
    }

    const locationLabel = buildLocationLabel(item.business.storeProfile);
    const availableUnits = availableInventoryUnits(item);
    const key = `inventory:${item.id}`;

    if (buyOptionKeys.has(key)) {
      continue;
    }

    buyOptionKeys.add(key);
    buyOptions.push({
      key,
      source: "inventory",
      articleSlug: latestArticleSlug,
      compareAtCents: item.compareAtCents,
      availableUnits,
      locationLabel,
      deliveryEnabled: item.business.storeProfile?.deliveryEnabled ?? false,
      pickupEnabled: item.business.storeProfile?.pickupEnabled ?? false,
      module: {
        id: `product-inventory-${item.id}`,
        businessId: item.business.id,
        businessSlug: item.business.slug,
        businessName: item.business.name,
        offerId: null,
        offerTitle: null,
        inventoryItemId: item.id,
        inventoryItemName: item.name,
        title: `${item.name} at ${item.business.storeProfile?.displayName || item.business.name}`,
        badgeText: item.business.storeProfile?.deliveryEnabled ? "Local delivery" : "Local pickup",
        body:
          item.description ||
          [
            `${item.business.storeProfile?.displayName || item.business.name} currently carries ${product.name}.`,
            locationLabel ? `Location: ${locationLabel}.` : null,
            availableUnits > 0 ? `${availableUnits} unit(s) currently available.` : "Availability is limited right now.",
          ]
            .filter(Boolean)
            .join(" "),
        imageSrc:
          item.imageUrl ||
          item.business.storeProfile?.heroImageUrl ||
          item.business.storeProfile?.logoUrl ||
          product.heroImageUrl,
        imageAlt: item.name,
        caption: item.business.storeProfile?.deliveryEnabled ? "Request delivery" : "Request pickup",
        side: "RIGHT",
        sizePreset: "FEATURE",
        business: {
          slug: item.business.slug,
          name: item.business.name,
          storeProfile: item.business.storeProfile
            ? {
                displayName: item.business.storeProfile.displayName,
                logoUrl: item.business.storeProfile.logoUrl,
                heroImageUrl: item.business.storeProfile.heroImageUrl,
                city: item.business.storeProfile.city,
                region: item.business.storeProfile.region,
                deliveryEnabled: item.business.storeProfile.deliveryEnabled,
              }
            : null,
        },
        offer: null,
        inventoryItem: {
          id: item.id,
          name: item.name,
          priceCents: item.priceCents,
          imageUrl: item.imageUrl,
        },
      },
    });
  }

  const spotlightMap = new Map<
    string,
    {
      articleSlug: string;
      module: (typeof publicReviews)[number]["commerceModules"][number];
    }
  >();

  for (const review of publicReviews) {
    for (const module of review.commerceModules) {
      const key =
        module.offerId
          ? `offer:${module.offerId}`
          : module.inventoryItemId
            ? `inventory:${module.inventoryItemId}`
            : module.businessId
              ? `business:${module.businessId}`
              : module.businessSlug
                ? `slug:${module.businessSlug}`
                : module.title || module.id;

      if (!spotlightMap.has(key)) {
        spotlightMap.set(key, {
          articleSlug: review.article.slug,
          module,
        });
      }
    }
  }

  const editorialSpotlights = [...spotlightMap.entries()]
    .filter(([key]) => !buyOptionKeys.has(key))
    .map(([, spotlight]) => spotlight);

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
    buyOptions,
    editorialSpotlights,
  };
}
