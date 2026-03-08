import { prisma } from "@/lib/prisma";

export async function listSavedProductIdsForUser(userId: string): Promise<Set<string>> {
  const rows = await prisma.savedProduct.findMany({
    where: { userId },
    select: { productId: true },
  });

  return new Set(rows.map((row) => row.productId));
}

export async function listSavedOfferIdsForUser(userId: string): Promise<Set<string>> {
  const rows = await prisma.savedOffer.findMany({
    where: { userId },
    select: { offerId: true },
  });

  return new Set(rows.map((row) => row.offerId));
}

export async function countSavedProductsByProductId(productIds: string[]) {
  if (productIds.length === 0) {
    return new Map<string, number>();
  }

  const rows = await prisma.savedProduct.groupBy({
    by: ["productId"],
    where: {
      productId: {
        in: productIds,
      },
    },
    _count: {
      productId: true,
    },
  });

  return new Map(rows.map((row) => [row.productId, row._count.productId]));
}

export async function countSavedOffersByOfferId(offerIds: string[]) {
  if (offerIds.length === 0) {
    return new Map<string, number>();
  }

  const rows = await prisma.savedOffer.groupBy({
    by: ["offerId"],
    where: {
      offerId: {
        in: offerIds,
      },
    },
    _count: {
      offerId: true,
    },
  });

  return new Map(rows.map((row) => [row.offerId, row._count.offerId]));
}

export async function getSavedCollectionsForUser(userId: string) {
  const [savedProducts, savedOffers] = await Promise.all([
    prisma.savedProduct.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }],
      include: {
        product: {
          include: {
            brand: true,
            _count: {
              select: {
                savedProducts: true,
              },
            },
          },
        },
      },
      take: 8,
    }),
    prisma.savedOffer.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }],
      include: {
        offer: {
          include: {
            business: {
              select: {
                name: true,
                slug: true,
              },
            },
            product: {
              select: {
                id: true,
                slug: true,
                name: true,
              },
            },
            inventoryItem: {
              select: {
                product: {
                  select: {
                    id: true,
                    slug: true,
                    name: true,
                  },
                },
              },
            },
            _count: {
              select: {
                savedOffers: true,
              },
            },
          },
        },
      },
      take: 8,
    }),
  ]);

  return {
    savedProducts,
    savedOffers,
  };
}
