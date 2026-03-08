import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  businessScopeWhere,
  requireCommerceManagerAuth,
} from "../_shared";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const ACTIVITY_WINDOW_DAYS = 30;
const RECENT_ACTIVITY_LIMIT = 8;

type TokenTotals = {
  WHEAT: number;
  STONE: number;
};

function createEmptyTokenTotals(): TokenTotals {
  return {
    WHEAT: 0,
    STONE: 0,
  };
}

function addRewardAmount(
  totals: TokenTotals,
  token: "WHEAT" | "STONE",
  amount: number,
  direction: "CREDIT" | "DEBIT",
) {
  const signedAmount = direction === "DEBIT" ? -amount : amount;
  totals[token] += signedAmount;
}

function percentage(part: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return Number(((part / total) * 100).toFixed(1));
}

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

function activitySummary(input: {
  leads: Array<{
    status: string;
    totalCents: number | null;
  }>;
  rewards: Array<{
    token: "WHEAT" | "STONE";
    direction: "CREDIT" | "DEBIT";
    amount: string;
  }>;
  notificationOptInCount: number;
}) {
  const rewardTotals = createEmptyTokenTotals();
  for (const reward of input.rewards) {
    addRewardAmount(
      rewardTotals,
      reward.token,
      Number(reward.amount),
      reward.direction,
    );
  }

  const leadCount = input.leads.length;
  const openLeadCount = input.leads.filter(
    (lead) =>
      lead.status === "NEW" ||
      lead.status === "CONTACTED" ||
      lead.status === "RESERVED",
  ).length;
  const reservedLeadCount = input.leads.filter((lead) => lead.status === "RESERVED").length;
  const fulfilledLeadCount = input.leads.filter((lead) => lead.status === "FULFILLED").length;
  const cancelledLeadCount = input.leads.filter(
    (lead) => lead.status === "CANCELLED" || lead.status === "EXPIRED",
  ).length;
  const trackedDemandCents = input.leads.reduce(
    (sum, lead) => sum + (lead.totalCents ?? 0),
    0,
  );

  return {
    leadCount,
    openLeadCount,
    reservedLeadCount,
    fulfilledLeadCount,
    cancelledLeadCount,
    trackedDemandCents,
    avgLeadValueCents: leadCount > 0 ? Math.round(trackedDemandCents / leadCount) : 0,
    leadToReserveRate: percentage(reservedLeadCount, leadCount),
    leadToFulfillmentRate: percentage(fulfilledLeadCount, leadCount),
    notificationOptInCount: input.notificationOptInCount,
    rewardCount: input.rewards.length,
    rewardTotals,
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

  const activityWindowStartsAt = new Date(
    Date.now() - ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );

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

  const scopedLeadActivity = managedBusinessIds.length
    ? prisma.deliveryLead.findMany({
        where: {
          businessId: {
            in: managedBusinessIds,
          },
          requestedAt: {
            gte: activityWindowStartsAt,
          },
        },
        select: {
          businessId: true,
          status: true,
          totalCents: true,
        },
      })
    : Promise.resolve([]);

  const scopedRewardActivity = managedBusinessIds.length
    ? prisma.rewardLedger.findMany({
        where: {
          businessId: {
            in: managedBusinessIds,
          },
          createdAt: {
            gte: activityWindowStartsAt,
          },
        },
        select: {
          businessId: true,
          token: true,
          direction: true,
          amount: true,
        },
      })
    : Promise.resolve([]);

  const selectedRecentLeads = selectedBusinessId
    ? prisma.deliveryLead.findMany({
        where: {
          businessId: selectedBusinessId,
        },
        orderBy: [{ updatedAt: "desc" }, { requestedAt: "desc" }],
        take: RECENT_ACTIVITY_LIMIT,
        select: {
          id: true,
          status: true,
          source: true,
          requestedQty: true,
          totalCents: true,
          requestedAt: true,
          updatedAt: true,
          deliveryAddress: true,
          recipient: {
            select: {
              name: true,
              email: true,
              phone: true,
            },
          },
          inventoryItem: {
            select: {
              name: true,
            },
          },
          offer: {
            select: {
              title: true,
            },
          },
        },
      })
    : Promise.resolve([]);

  const selectedRecentRewards = selectedBusinessId
    ? prisma.rewardLedger.findMany({
        where: {
          businessId: selectedBusinessId,
        },
        orderBy: [{ createdAt: "desc" }],
        take: RECENT_ACTIVITY_LIMIT,
        select: {
          id: true,
          token: true,
          direction: true,
          amount: true,
          reason: true,
          createdAt: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      })
    : Promise.resolve([]);

  const selectedNotificationOptInCount = selectedBusinessId
    ? prisma.analyticsEvent.count({
        where: {
          businessId: selectedBusinessId,
          eventType: "NOTIFICATION_OPT_IN",
          createdAt: {
            gte: activityWindowStartsAt,
          },
        },
      })
    : Promise.resolve(0);

  const [scopedLeadEntries, scopedRewardEntries, recentLeads, recentRewards, notificationOptInCount] =
    await Promise.all([
      scopedLeadActivity,
      scopedRewardActivity,
      selectedRecentLeads,
      selectedRecentRewards,
      selectedNotificationOptInCount,
    ]);

  const selectedLeadEntries = selectedBusinessId
    ? scopedLeadEntries.filter((entry) => entry.businessId === selectedBusinessId)
    : [];
  const selectedRewardEntries = selectedBusinessId
    ? scopedRewardEntries.filter((entry) => entry.businessId === selectedBusinessId)
    : [];

  const businessPerformance = new Map(
    scopedBusinesses.map((business) => [
      business.id,
      {
        businessId: business.id,
        businessSlug: business.slug,
        businessName: business.name,
        deliveryEnabled: Boolean(business.storeProfile?.deliveryEnabled),
        activeInventoryCount: 0,
        liveOfferCount: 0,
        leadCount: 0,
        openLeadCount: 0,
        reservedLeadCount: 0,
        fulfilledLeadCount: 0,
        cancelledLeadCount: 0,
        rewardTotals: createEmptyTokenTotals(),
      },
    ]),
  );

  for (const item of inventoryItems) {
    const row = businessPerformance.get(item.businessId);
    if (!row) {
      continue;
    }

    if (item.isActive) {
      row.activeInventoryCount += 1;
    }
  }

  for (const offer of offers) {
    const row = businessPerformance.get(offer.businessId);
    if (!row) {
      continue;
    }

    if (offer.status === "LIVE") {
      row.liveOfferCount += 1;
    }
  }

  for (const lead of scopedLeadEntries) {
    const row = businessPerformance.get(lead.businessId);
    if (!row) {
      continue;
    }

    row.leadCount += 1;

    if (lead.status === "NEW" || lead.status === "CONTACTED" || lead.status === "RESERVED") {
      row.openLeadCount += 1;
    }
    if (lead.status === "RESERVED") {
      row.reservedLeadCount += 1;
    }
    if (lead.status === "FULFILLED") {
      row.fulfilledLeadCount += 1;
    }
    if (lead.status === "CANCELLED" || lead.status === "EXPIRED") {
      row.cancelledLeadCount += 1;
    }
  }

  for (const reward of scopedRewardEntries) {
    if (!reward.businessId) {
      continue;
    }

    const row = businessPerformance.get(reward.businessId);
    if (!row) {
      continue;
    }

    addRewardAmount(
      row.rewardTotals,
      reward.token,
      Number(reward.amount.toString()),
      reward.direction,
    );
  }

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
    activityWindow: {
      days: ACTIVITY_WINDOW_DAYS,
      startsAt: activityWindowStartsAt.toISOString(),
    },
    selectedActivitySummary: activitySummary({
      leads: selectedLeadEntries,
      rewards: selectedRewardEntries.map((entry) => ({
        token: entry.token,
        direction: entry.direction,
        amount: entry.amount.toString(),
      })),
      notificationOptInCount,
    }),
    recentLeads: recentLeads.map((lead) => ({
      id: lead.id,
      status: lead.status,
      source: lead.source,
      requestedQty: lead.requestedQty,
      totalCents: lead.totalCents,
      requestedAt: lead.requestedAt,
      updatedAt: lead.updatedAt,
      deliveryAddress: lead.deliveryAddress,
      recipientName: lead.recipient?.name ?? null,
      recipientEmail: lead.recipient?.email ?? null,
      recipientPhone: lead.recipient?.phone ?? null,
      inventoryItemName: lead.inventoryItem?.name ?? null,
      offerTitle: lead.offer?.title ?? null,
    })),
    recentRewards: recentRewards.map((entry) => ({
      id: entry.id,
      token: entry.token,
      direction: entry.direction,
      amount: Number(entry.amount.toString()),
      reason: entry.reason,
      createdAt: entry.createdAt,
      userName: entry.user?.name ?? null,
      userEmail: entry.user?.email ?? null,
    })),
    businessPerformance: [...businessPerformance.values()]
      .map((row) => ({
        ...row,
        leadToReserveRate: percentage(row.reservedLeadCount, row.leadCount),
        leadToFulfillmentRate: percentage(row.fulfilledLeadCount, row.leadCount),
      }))
      .sort((left, right) => {
        if (right.leadCount !== left.leadCount) {
          return right.leadCount - left.leadCount;
        }
        if (right.liveOfferCount !== left.liveOfferCount) {
          return right.liveOfferCount - left.liveOfferCount;
        }
        return left.businessName.localeCompare(right.businessName);
      }),
    selectionSummary: selectionSummary({
      storeProfile: selectedBusiness?.storeProfile,
      inventoryItems,
      offers,
    }),
  });
}
