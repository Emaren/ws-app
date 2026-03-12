import type { NotificationJobInput } from "@/lib/notificationCommandCenter";

type TokenTotals = {
  WHEAT: number;
  STONE: number;
};

export type BusinessPerformanceRadarBusinessInput = {
  id: string;
  slug: string;
  name: string;
  status: string;
  isVerified: boolean;
  storeProfile: {
    deliveryEnabled: boolean;
    pickupEnabled: boolean;
  } | null;
  counts: {
    notificationRecipients: number;
  };
};

export type BusinessPerformanceRadarInventoryInput = {
  businessId: string;
  productId: string | null;
  quantityOnHand: number;
  lowStockThreshold: number | null;
  isActive: boolean;
};

export type BusinessPerformanceRadarOfferInput = {
  businessId: string;
  productId: string | null;
  status: string;
  featured: boolean;
};

export type BusinessPerformanceRadarLeadInput = {
  businessId: string;
  status: string;
  totalCents: number | null;
};

export type BusinessPerformanceRadarRewardInput = {
  businessId: string | null;
  token: "WHEAT" | "STONE";
  direction: "CREDIT" | "DEBIT";
  amount: number;
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

function normalizeStatus(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function buildBusinessPerformanceRadarSnapshot(input: {
  generatedAt: string;
  windowDays: number;
  businesses: BusinessPerformanceRadarBusinessInput[];
  inventoryItems: BusinessPerformanceRadarInventoryInput[];
  offers: BusinessPerformanceRadarOfferInput[];
  leads: BusinessPerformanceRadarLeadInput[];
  rewards: BusinessPerformanceRadarRewardInput[];
  notificationJobs: NotificationJobInput[];
}) {
  const rows = new Map(
    input.businesses.map((business) => [
      business.id,
      {
        businessId: business.id,
        slug: business.slug,
        name: business.name,
        status: business.status,
        isVerified: business.isVerified,
        deliveryEnabled: Boolean(business.storeProfile?.deliveryEnabled),
        pickupEnabled: business.storeProfile?.pickupEnabled ?? true,
        notificationRecipients: business.counts.notificationRecipients,
        inventoryCount: 0,
        activeInventoryCount: 0,
        lowStockCount: 0,
        productLinkedInventoryCount: 0,
        offerCount: 0,
        liveOfferCount: 0,
        featuredOfferCount: 0,
        productLinkedOfferCount: 0,
        leadCount: 0,
        openLeadCount: 0,
        reservedLeadCount: 0,
        fulfilledLeadCount: 0,
        cancelledLeadCount: 0,
        trackedDemandCents: 0,
        notificationQueuedCount: 0,
        notificationSentCount: 0,
        notificationFailedCount: 0,
        rewardTotals: createEmptyTokenTotals(),
      },
    ]),
  );

  for (const item of input.inventoryItems) {
    const row = rows.get(item.businessId);
    if (!row) continue;

    row.inventoryCount += 1;
    if (item.isActive) {
      row.activeInventoryCount += 1;
    }
    if (item.productId) {
      row.productLinkedInventoryCount += 1;
    }
    if (
      item.lowStockThreshold !== null &&
      item.quantityOnHand <= item.lowStockThreshold
    ) {
      row.lowStockCount += 1;
    }
  }

  for (const offer of input.offers) {
    const row = rows.get(offer.businessId);
    if (!row) continue;

    row.offerCount += 1;
    if (normalizeStatus(offer.status) === "live") {
      row.liveOfferCount += 1;
    }
    if (offer.featured) {
      row.featuredOfferCount += 1;
    }
    if (offer.productId) {
      row.productLinkedOfferCount += 1;
    }
  }

  for (const lead of input.leads) {
    const row = rows.get(lead.businessId);
    if (!row) continue;

    row.leadCount += 1;
    row.trackedDemandCents += lead.totalCents ?? 0;

    const status = normalizeStatus(lead.status);
    if (status === "new" || status === "contacted" || status === "reserved") {
      row.openLeadCount += 1;
    }
    if (status === "reserved") {
      row.reservedLeadCount += 1;
    }
    if (status === "fulfilled") {
      row.fulfilledLeadCount += 1;
    }
    if (status === "cancelled" || status === "expired") {
      row.cancelledLeadCount += 1;
    }
  }

  for (const reward of input.rewards) {
    if (!reward.businessId) continue;
    const row = rows.get(reward.businessId);
    if (!row) continue;

    addRewardAmount(row.rewardTotals, reward.token, reward.amount, reward.direction);
  }

  for (const job of input.notificationJobs) {
    const row = rows.get(job.businessId);
    if (!row) continue;

    const status = normalizeStatus(job.status);
    if (status === "sent") {
      row.notificationSentCount += 1;
    } else if (status === "failed") {
      row.notificationFailedCount += 1;
    } else if (status === "queued" || status === "processing" || status === "retrying") {
      row.notificationQueuedCount += 1;
    }
  }

  const businesses = [...rows.values()].map((row) => {
    const attentionReasons: string[] = [];

    if (row.activeInventoryCount === 0) {
      attentionReasons.push("No active inventory");
    }
    if (row.liveOfferCount === 0) {
      attentionReasons.push("No live offers");
    }
    if (!row.deliveryEnabled) {
      attentionReasons.push("Delivery is off");
    }
    if (row.lowStockCount > 0) {
      attentionReasons.push(`${row.lowStockCount} low-stock item${row.lowStockCount === 1 ? "" : "s"}`);
    }
    if (row.notificationFailedCount > 0) {
      attentionReasons.push(
        `${row.notificationFailedCount} failed notification job${row.notificationFailedCount === 1 ? "" : "s"}`,
      );
    }
    if (row.openLeadCount >= Math.max(2, row.fulfilledLeadCount + 2)) {
      attentionReasons.push("Lead backlog needs review");
    }

    return {
      ...row,
      leadToFulfillmentRate: percentage(row.fulfilledLeadCount, row.leadCount),
      avgLeadValueCents:
        row.leadCount > 0 ? Math.round(row.trackedDemandCents / row.leadCount) : 0,
      needsAttention: attentionReasons.length > 0,
      attentionReasons,
    };
  });

  const summary = {
    businessCount: businesses.length,
    verifiedCount: businesses.filter((row) => row.isVerified).length,
    deliveryReadyCount: businesses.filter((row) => row.deliveryEnabled).length,
    activeInventoryCount: businesses.reduce((sum, row) => sum + row.activeInventoryCount, 0),
    lowStockCount: businesses.reduce((sum, row) => sum + row.lowStockCount, 0),
    liveOfferCount: businesses.reduce((sum, row) => sum + row.liveOfferCount, 0),
    leadCount: businesses.reduce((sum, row) => sum + row.leadCount, 0),
    openLeadCount: businesses.reduce((sum, row) => sum + row.openLeadCount, 0),
    fulfilledLeadCount: businesses.reduce((sum, row) => sum + row.fulfilledLeadCount, 0),
    trackedDemandCents: businesses.reduce((sum, row) => sum + row.trackedDemandCents, 0),
    notificationRecipients: businesses.reduce(
      (sum, row) => sum + row.notificationRecipients,
      0,
    ),
    notificationQueuedCount: businesses.reduce(
      (sum, row) => sum + row.notificationQueuedCount,
      0,
    ),
    notificationSentCount: businesses.reduce(
      (sum, row) => sum + row.notificationSentCount,
      0,
    ),
    notificationFailedCount: businesses.reduce(
      (sum, row) => sum + row.notificationFailedCount,
      0,
    ),
    rewardTotals: businesses.reduce(
      (totals, row) => {
        totals.WHEAT += row.rewardTotals.WHEAT;
        totals.STONE += row.rewardTotals.STONE;
        return totals;
      },
      createEmptyTokenTotals(),
    ),
    businessesNeedingAttention: businesses.filter((row) => row.needsAttention).length,
    businessesWithoutLiveOffers: businesses.filter((row) => row.liveOfferCount === 0).length,
    businessesWithoutActiveInventory: businesses.filter((row) => row.activeInventoryCount === 0)
      .length,
  };

  const topBusinesses = businesses
    .slice()
    .sort((left, right) => {
      if (right.leadCount !== left.leadCount) {
        return right.leadCount - left.leadCount;
      }
      if (right.liveOfferCount !== left.liveOfferCount) {
        return right.liveOfferCount - left.liveOfferCount;
      }
      return left.name.localeCompare(right.name);
    });

  const watchlist = businesses
    .filter((row) => row.needsAttention)
    .slice()
    .sort((left, right) => {
      if (right.attentionReasons.length !== left.attentionReasons.length) {
        return right.attentionReasons.length - left.attentionReasons.length;
      }
      if (right.notificationFailedCount !== left.notificationFailedCount) {
        return right.notificationFailedCount - left.notificationFailedCount;
      }
      if (right.openLeadCount !== left.openLeadCount) {
        return right.openLeadCount - left.openLeadCount;
      }
      return left.name.localeCompare(right.name);
    });

  return {
    generatedAt: input.generatedAt,
    windowDays: input.windowDays,
    summary,
    topBusinesses,
    watchlist,
  };
}
