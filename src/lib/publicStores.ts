import { prisma } from "@/lib/prisma";

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

function resolveOfferProduct(offer: {
  product: { slug: string; name: string } | null;
  inventoryItem: { product: { slug: string; name: string } | null } | null;
}) {
  return offer.product ?? offer.inventoryItem?.product ?? null;
}

export async function listPublicStores(limit?: number) {
  const businesses = await prisma.business.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        {
          offers: {
            some: {
              status: "LIVE",
            },
          },
        },
        {
          inventoryItems: {
            some: {
              isActive: true,
            },
          },
        },
      ],
    },
    include: {
      storeProfile: true,
      offers: {
        include: {
          product: {
            select: {
              slug: true,
              name: true,
            },
          },
          inventoryItem: {
            select: {
              id: true,
              product: {
                select: {
                  slug: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      inventoryItems: {
        where: {
          isActive: true,
        },
        include: {
          product: {
            select: {
              slug: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: [{ isVerified: "desc" }, { updatedAt: "desc" }],
  });

  const rows = businesses
    .map((business) => {
      const liveOffers = business.offers.filter(isLiveOfferNow);
      const activeInventory = business.inventoryItems.filter((item) => item.isActive);

      if (liveOffers.length === 0 && activeInventory.length === 0) {
        return null;
      }

      const productMap = new Map<string, { slug: string; name: string }>();
      for (const offer of liveOffers) {
        const product = resolveOfferProduct(offer);
        if (product) {
          productMap.set(product.slug, product);
        }
      }
      for (const item of activeInventory) {
        if (item.product) {
          productMap.set(item.product.slug, item.product);
        }
      }

      const featuredProducts = [...productMap.values()].slice(0, 4);
      const locationLabel = buildLocationLabel(business.storeProfile);

      return {
        slug: business.slug,
        name: business.name,
        displayName: business.storeProfile?.displayName || business.name,
        description: business.storeProfile?.description || null,
        logoUrl: business.storeProfile?.logoUrl || null,
        heroImageUrl:
          business.storeProfile?.heroImageUrl ||
          activeInventory[0]?.imageUrl ||
          null,
        locationLabel,
        deliveryEnabled: business.storeProfile?.deliveryEnabled ?? false,
        pickupEnabled: business.storeProfile?.pickupEnabled ?? false,
        deliveryRadiusKm: business.storeProfile?.deliveryRadiusKm ?? null,
        inventoryCount: activeInventory.length,
        liveOfferCount: liveOffers.length,
        liveProductCount: productMap.size,
        featuredProducts,
        featuredOffer:
          liveOffers[0]
            ? {
                title: liveOffers[0].title,
                badgeText: liveOffers[0].badgeText || null,
                description: liveOffers[0].description || null,
              }
            : null,
      };
    })
    .filter(Boolean) as Array<{
    slug: string;
    name: string;
    displayName: string;
    description: string | null;
    logoUrl: string | null;
    heroImageUrl: string | null;
    locationLabel: string | null;
    deliveryEnabled: boolean;
    pickupEnabled: boolean;
    deliveryRadiusKm: number | null;
    inventoryCount: number;
    liveOfferCount: number;
    liveProductCount: number;
    featuredProducts: Array<{ slug: string; name: string }>;
    featuredOffer: {
      title: string;
      badgeText: string | null;
      description: string | null;
    } | null;
  }>;

  return typeof limit === "number" ? rows.slice(0, limit) : rows;
}

export async function getPublicStoreBySlug(slug: string) {
  const business = await prisma.business.findUnique({
    where: {
      slug,
    },
    include: {
      storeProfile: true,
      offers: {
        include: {
          product: {
            select: {
              slug: true,
              name: true,
            },
          },
          inventoryItem: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
              priceCents: true,
              compareAtCents: true,
              quantityOnHand: true,
              reservedQuantity: true,
              product: {
                select: {
                  slug: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      inventoryItems: {
        where: {
          isActive: true,
        },
        include: {
          product: {
            select: {
              slug: true,
              name: true,
            },
          },
        },
        orderBy: [{ updatedAt: "desc" }],
      },
    },
  });

  if (!business || business.status !== "ACTIVE") {
    return null;
  }

  const liveOffers = business.offers
    .filter(isLiveOfferNow)
    .map((offer) => {
      const product = resolveOfferProduct(offer);
      return {
        id: offer.id,
        title: offer.title,
        description: offer.description,
        badgeText: offer.badgeText,
        discountPriceCents: offer.discountPriceCents,
        ctaUrl: offer.ctaUrl,
        startsAt: offer.startsAt,
        endsAt: offer.endsAt,
        featured: offer.featured,
        product,
        inventoryItem: offer.inventoryItem
          ? {
              id: offer.inventoryItem.id,
              name: offer.inventoryItem.name,
              imageUrl: offer.inventoryItem.imageUrl,
              priceCents: offer.inventoryItem.priceCents,
              compareAtCents: offer.inventoryItem.compareAtCents,
              availableUnits: availableInventoryUnits(offer.inventoryItem),
            }
          : null,
      };
    });

  const activeInventory = business.inventoryItems.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    imageUrl: item.imageUrl,
    priceCents: item.priceCents,
    compareAtCents: item.compareAtCents,
    availableUnits: availableInventoryUnits(item),
    product: item.product,
  }));

  if (liveOffers.length === 0 && activeInventory.length === 0) {
    return null;
  }

  const productMap = new Map<string, { slug: string; name: string }>();
  for (const offer of liveOffers) {
    if (offer.product) {
      productMap.set(offer.product.slug, offer.product);
    }
  }
  for (const item of activeInventory) {
    if (item.product) {
      productMap.set(item.product.slug, item.product);
    }
  }

  return {
    slug: business.slug,
    name: business.name,
    displayName: business.storeProfile?.displayName || business.name,
    description:
      business.storeProfile?.description ||
      "This public store page connects live offers, active inventory, and product links in one place.",
    logoUrl: business.storeProfile?.logoUrl || null,
    heroImageUrl:
      business.storeProfile?.heroImageUrl || activeInventory[0]?.imageUrl || null,
    websiteUrl: business.storeProfile?.websiteUrl || null,
    locationLabel: buildLocationLabel(business.storeProfile),
    deliveryEnabled: business.storeProfile?.deliveryEnabled ?? false,
    pickupEnabled: business.storeProfile?.pickupEnabled ?? false,
    deliveryRadiusKm: business.storeProfile?.deliveryRadiusKm ?? null,
    inventoryCount: activeInventory.length,
    liveOfferCount: liveOffers.length,
    liveProductCount: productMap.size,
    featuredProducts: [...productMap.values()].slice(0, 6),
    liveOffers,
    activeInventory,
  };
}
