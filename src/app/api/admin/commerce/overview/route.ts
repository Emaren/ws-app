import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  businessScopeWhere,
  requireCommerceManagerAuth,
} from "../_shared";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function selectionSummary(input: {
  storeProfile:
    | {
        deliveryEnabled: boolean;
        pickupEnabled: boolean;
      }
    | null
    | undefined;
  inventoryItems: Array<{
    productId: string | null;
    quantityOnHand: number;
    lowStockThreshold: number | null;
    isActive: boolean;
  }>;
  offers: Array<{
    productId: string | null;
    status: string;
    featured: boolean;
  }>;
}) {
  return {
    inventoryCount: input.inventoryItems.length,
    activeInventoryCount: input.inventoryItems.filter((item) => item.isActive).length,
    productLinkedInventoryCount: input.inventoryItems.filter((item) => item.productId).length,
    lowStockCount: input.inventoryItems.filter(
      (item) =>
        item.lowStockThreshold !== null &&
        item.quantityOnHand <= item.lowStockThreshold,
    ).length,
    offerCount: input.offers.length,
    liveOfferCount: input.offers.filter((offer) => offer.status === "LIVE").length,
    featuredOfferCount: input.offers.filter((offer) => offer.featured).length,
    productLinkedOfferCount: input.offers.filter((offer) => offer.productId).length,
    deliveryEnabled: Boolean(input.storeProfile?.deliveryEnabled),
    pickupEnabled: input.storeProfile?.pickupEnabled ?? true,
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireCommerceManagerAuth(req);
  if (auth instanceof NextResponse) {
    return auth;
  }

  const requestedBusinessId = req.nextUrl.searchParams.get("businessId")?.trim() ?? "";
  const scopeWhere = businessScopeWhere(auth);

  const scopedBusinesses = await prisma.business.findMany({
    where: scopeWhere,
    orderBy: [{ isVerified: "desc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
      isVerified: true,
      timezone: true,
      contactEmail: true,
      storeProfile: {
        select: {
          id: true,
          displayName: true,
          description: true,
          logoUrl: true,
          heroImageUrl: true,
          websiteUrl: true,
          city: true,
          region: true,
          country: true,
          deliveryRadiusKm: true,
          deliveryEnabled: true,
          pickupEnabled: true,
          notificationEmail: true,
          updatedAt: true,
        },
      },
      _count: {
        select: {
          inventoryItems: true,
          offers: true,
        },
      },
    },
  });

  const managedBusinessIds = scopedBusinesses.map((business) => business.id);

  if (requestedBusinessId && !managedBusinessIds.includes(requestedBusinessId)) {
    return NextResponse.json(
      { message: "Business not found in your commerce scope" },
      { status: 404 },
    );
  }

  const selectedBusinessId = requestedBusinessId || scopedBusinesses[0]?.id || null;
  const selectedBusiness = selectedBusinessId
    ? scopedBusinesses.find((business) => business.id === selectedBusinessId) ?? null
    : null;

  const [products, inventoryItems, offers, deliveryReadyCount, inventoryCount, productLinkedInventoryCount, liveOffersCount, productLinkedOfferCount] =
    await Promise.all([
      prisma.product.findMany({
        orderBy: [{ name: "asc" }],
        select: {
          id: true,
          slug: true,
          name: true,
          category: true,
          brand: {
            select: {
              name: true,
            },
          },
          _count: {
            select: {
              reviewProfiles: true,
              inventoryItems: true,
              offers: true,
            },
          },
        },
      }),
      prisma.inventoryItem.findMany({
        where: selectedBusinessId
          ? {
              businessId: selectedBusinessId,
              business: scopeWhere,
            }
          : {
              business: scopeWhere,
            },
        orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
        select: {
          id: true,
          businessId: true,
          productId: true,
          sku: true,
          name: true,
          description: true,
          category: true,
          unitLabel: true,
          imageUrl: true,
          priceCents: true,
          compareAtCents: true,
          quantityOnHand: true,
          lowStockThreshold: true,
          isActive: true,
          updatedAt: true,
          business: {
            select: {
              name: true,
            },
          },
          product: {
            select: {
              id: true,
              slug: true,
              name: true,
            },
          },
          _count: {
            select: {
              offers: true,
            },
          },
        },
      }),
      prisma.offer.findMany({
        where: selectedBusinessId
          ? {
              businessId: selectedBusinessId,
              business: scopeWhere,
            }
          : {
              business: scopeWhere,
            },
        orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
        select: {
          id: true,
          businessId: true,
          inventoryItemId: true,
          productId: true,
          title: true,
          description: true,
          status: true,
          badgeText: true,
          discountPriceCents: true,
          startsAt: true,
          endsAt: true,
          unitsTotal: true,
          ctaUrl: true,
          featured: true,
          updatedAt: true,
          business: {
            select: {
              name: true,
            },
          },
          inventoryItem: {
            select: {
              id: true,
              name: true,
            },
          },
          product: {
            select: {
              id: true,
              slug: true,
              name: true,
            },
          },
        },
      }),
      prisma.storeProfile.count({
        where: {
          business: scopeWhere,
          deliveryEnabled: true,
        },
      }),
      prisma.inventoryItem.count({
        where: {
          business: scopeWhere,
        },
      }),
      prisma.inventoryItem.count({
        where: {
          business: scopeWhere,
          productId: {
            not: null,
          },
        },
      }),
      prisma.offer.count({
        where: {
          business: scopeWhere,
          status: "LIVE",
        },
      }),
      prisma.offer.count({
        where: {
          business: scopeWhere,
          productId: {
            not: null,
          },
        },
      }),
    ]);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    scope: {
      mode: auth.isOwnerAdmin ? "GLOBAL" : "BUSINESS",
      managedBusinessIds,
    },
    selectedBusinessId,
    businesses: scopedBusinesses.map((business) => ({
      ...business,
      inventoryCount: business._count.inventoryItems,
      offerCount: business._count.offers,
    })),
    products: products.map((product) => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category,
      brandName: product.brand?.name ?? null,
      reviewCount: product._count.reviewProfiles,
      inventoryCount: product._count.inventoryItems,
      offerCount: product._count.offers,
    })),
    inventoryItems: inventoryItems.map((item) => ({
      id: item.id,
      businessId: item.businessId,
      businessName: item.business.name,
      productId: item.product?.id ?? null,
      productSlug: item.product?.slug ?? null,
      productName: item.product?.name ?? null,
      sku: item.sku,
      name: item.name,
      description: item.description,
      category: item.category,
      unitLabel: item.unitLabel,
      imageUrl: item.imageUrl,
      priceCents: item.priceCents,
      compareAtCents: item.compareAtCents,
      quantityOnHand: item.quantityOnHand,
      lowStockThreshold: item.lowStockThreshold,
      isActive: item.isActive,
      offerCount: item._count.offers,
      updatedAt: item.updatedAt,
    })),
    offers: offers.map((offer) => ({
      id: offer.id,
      businessId: offer.businessId,
      businessName: offer.business.name,
      inventoryItemId: offer.inventoryItemId,
      inventoryItemName: offer.inventoryItem?.name ?? null,
      productId: offer.product?.id ?? offer.productId ?? null,
      productSlug: offer.product?.slug ?? null,
      productName: offer.product?.name ?? null,
      title: offer.title,
      description: offer.description,
      status: offer.status,
      badgeText: offer.badgeText,
      discountPriceCents: offer.discountPriceCents,
      startsAt: offer.startsAt,
      endsAt: offer.endsAt,
      unitsTotal: offer.unitsTotal,
      ctaUrl: offer.ctaUrl,
      featured: offer.featured,
      updatedAt: offer.updatedAt,
    })),
    networkSummary: {
      businessCount: scopedBusinesses.length,
      deliveryReadyCount,
      inventoryCount,
      productLinkedInventoryCount,
      liveOfferCount: liveOffersCount,
      productLinkedOfferCount,
    },
    selectionSummary: selectionSummary({
      storeProfile: selectedBusiness?.storeProfile,
      inventoryItems,
      offers,
    }),
  });
}
