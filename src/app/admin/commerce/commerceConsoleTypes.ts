export type StoreProfileRecord = {
  id: string;
  displayName: string | null;
  description: string | null;
  logoUrl: string | null;
  heroImageUrl: string | null;
  websiteUrl: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  deliveryRadiusKm: number | null;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  notificationEmail: string | null;
  updatedAt: string;
};

export type BusinessRecord = {
  id: string;
  slug: string;
  name: string;
  status: string;
  isVerified: boolean;
  timezone: string;
  contactEmail: string | null;
  storeProfile: StoreProfileRecord | null;
  inventoryCount: number;
  offerCount: number;
};

export type ProductRecord = {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  brandName: string | null;
  reviewCount: number;
  inventoryCount: number;
  offerCount: number;
};

export type InventoryRecord = {
  id: string;
  businessId: string;
  businessName: string;
  productId: string | null;
  productSlug: string | null;
  productName: string | null;
  sku: string | null;
  name: string;
  description: string | null;
  category: string | null;
  unitLabel: string | null;
  imageUrl: string | null;
  priceCents: number;
  compareAtCents: number | null;
  quantityOnHand: number;
  lowStockThreshold: number | null;
  isActive: boolean;
  offerCount: number;
  updatedAt: string;
};

export type OfferRecord = {
  id: string;
  businessId: string;
  businessName: string;
  inventoryItemId: string | null;
  inventoryItemName: string | null;
  productId: string | null;
  productSlug: string | null;
  productName: string | null;
  title: string;
  description: string | null;
  status: string;
  badgeText: string | null;
  discountPriceCents: number | null;
  startsAt: string | null;
  endsAt: string | null;
  unitsTotal: number | null;
  ctaUrl: string | null;
  featured: boolean;
  updatedAt: string;
};

export type OverviewResponse = {
  generatedAt: string;
  scope: {
    mode: "GLOBAL" | "BUSINESS";
    managedBusinessIds: string[];
  };
  selectedBusinessId: string | null;
  activityWindow: {
    days: number;
    startsAt: string;
  };
  businesses: BusinessRecord[];
  products: ProductRecord[];
  inventoryItems: InventoryRecord[];
  offers: OfferRecord[];
  networkSummary: {
    businessCount: number;
    deliveryReadyCount: number;
    inventoryCount: number;
    productLinkedInventoryCount: number;
    liveOfferCount: number;
    productLinkedOfferCount: number;
  };
  selectedActivitySummary: {
    leadCount: number;
    openLeadCount: number;
    reservedLeadCount: number;
    fulfilledLeadCount: number;
    cancelledLeadCount: number;
    trackedDemandCents: number;
    avgLeadValueCents: number;
    leadToReserveRate: number;
    leadToFulfillmentRate: number;
    notificationOptInCount: number;
    rewardCount: number;
    rewardTotals: {
      WHEAT: number;
      STONE: number;
    };
  };
  recentLeads: Array<{
    id: string;
    status: string;
    source: string;
    requestedQty: number;
    totalCents: number | null;
    requestedAt: string;
    updatedAt: string;
    deliveryAddress: string | null;
    recipientName: string | null;
    recipientEmail: string | null;
    recipientPhone: string | null;
    inventoryItemName: string | null;
    offerTitle: string | null;
  }>;
  recentRewards: Array<{
    id: string;
    token: "WHEAT" | "STONE";
    direction: "CREDIT" | "DEBIT";
    amount: number;
    reason: string;
    createdAt: string;
    userName: string | null;
    userEmail: string | null;
  }>;
  businessPerformance: Array<{
    businessId: string;
    businessSlug: string;
    businessName: string;
    deliveryEnabled: boolean;
    activeInventoryCount: number;
    liveOfferCount: number;
    leadCount: number;
    openLeadCount: number;
    reservedLeadCount: number;
    fulfilledLeadCount: number;
    cancelledLeadCount: number;
    rewardTotals: {
      WHEAT: number;
      STONE: number;
    };
    leadToReserveRate: number;
    leadToFulfillmentRate: number;
  }>;
  selectionSummary: {
    inventoryCount: number;
    activeInventoryCount: number;
    productLinkedInventoryCount: number;
    lowStockCount: number;
    offerCount: number;
    liveOfferCount: number;
    featuredOfferCount: number;
    productLinkedOfferCount: number;
    deliveryEnabled: boolean;
    pickupEnabled: boolean;
  };
};

export type StoreProfileDraft = {
  displayName: string;
  description: string;
  logoUrl: string;
  heroImageUrl: string;
  websiteUrl: string;
  city: string;
  region: string;
  country: string;
  deliveryRadiusKm: string;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  notificationEmail: string;
};

export type InventoryDraft = {
  id: string | null;
  businessId: string;
  productId: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  unitLabel: string;
  imageUrl: string;
  priceCents: string;
  compareAtCents: string;
  quantityOnHand: string;
  lowStockThreshold: string;
  isActive: boolean;
};

export type OfferDraft = {
  id: string | null;
  businessId: string;
  productId: string;
  inventoryItemId: string;
  title: string;
  description: string;
  badgeText: string;
  discountPriceCents: string;
  startsAt: string;
  endsAt: string;
  unitsTotal: string;
  ctaUrl: string;
  status: "DRAFT" | "LIVE" | "PAUSED" | "EXPIRED" | "ARCHIVED";
  featured: boolean;
};

export const OFFER_STATUSES = ["DRAFT", "LIVE", "PAUSED", "EXPIRED", "ARCHIVED"] as const;

export function toDateTimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const parsed = new Date(iso);
  if (!Number.isFinite(parsed.getTime())) return "";
  const offsetMs = parsed.getTimezoneOffset() * 60_000;
  return new Date(parsed.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function createStoreProfileDraft(profile?: StoreProfileRecord | null): StoreProfileDraft {
  return {
    displayName: profile?.displayName ?? "",
    description: profile?.description ?? "",
    logoUrl: profile?.logoUrl ?? "",
    heroImageUrl: profile?.heroImageUrl ?? "",
    websiteUrl: profile?.websiteUrl ?? "",
    city: profile?.city ?? "",
    region: profile?.region ?? "",
    country: profile?.country ?? "Canada",
    deliveryRadiusKm:
      profile?.deliveryRadiusKm !== null && profile?.deliveryRadiusKm !== undefined
        ? String(profile.deliveryRadiusKm)
        : "",
    deliveryEnabled: profile?.deliveryEnabled ?? false,
    pickupEnabled: profile?.pickupEnabled ?? true,
    notificationEmail: profile?.notificationEmail ?? "",
  };
}

export function createInventoryDraft(businessId: string): InventoryDraft {
  return {
    id: null,
    businessId,
    productId: "",
    sku: "",
    name: "",
    description: "",
    category: "",
    unitLabel: "",
    imageUrl: "",
    priceCents: "",
    compareAtCents: "",
    quantityOnHand: "0",
    lowStockThreshold: "",
    isActive: true,
  };
}

export function inventoryDraftFromRecord(record: InventoryRecord): InventoryDraft {
  return {
    id: record.id,
    businessId: record.businessId,
    productId: record.productId ?? "",
    sku: record.sku ?? "",
    name: record.name,
    description: record.description ?? "",
    category: record.category ?? "",
    unitLabel: record.unitLabel ?? "",
    imageUrl: record.imageUrl ?? "",
    priceCents: String(record.priceCents),
    compareAtCents: record.compareAtCents !== null ? String(record.compareAtCents) : "",
    quantityOnHand: String(record.quantityOnHand),
    lowStockThreshold:
      record.lowStockThreshold !== null ? String(record.lowStockThreshold) : "",
    isActive: record.isActive,
  };
}

export function createOfferDraft(businessId: string): OfferDraft {
  return {
    id: null,
    businessId,
    productId: "",
    inventoryItemId: "",
    title: "",
    description: "",
    badgeText: "Fresh Offer",
    discountPriceCents: "",
    startsAt: "",
    endsAt: "",
    unitsTotal: "",
    ctaUrl: "",
    status: "LIVE",
    featured: false,
  };
}

export function offerDraftFromRecord(record: OfferRecord): OfferDraft {
  return {
    id: record.id,
    businessId: record.businessId,
    productId: record.productId ?? "",
    inventoryItemId: record.inventoryItemId ?? "",
    title: record.title,
    description: record.description ?? "",
    badgeText: record.badgeText ?? "",
    discountPriceCents:
      record.discountPriceCents !== null ? String(record.discountPriceCents) : "",
    startsAt: toDateTimeLocalValue(record.startsAt),
    endsAt: toDateTimeLocalValue(record.endsAt),
    unitsTotal: record.unitsTotal !== null ? String(record.unitsTotal) : "",
    ctaUrl: record.ctaUrl ?? "",
    status: OFFER_STATUSES.includes(record.status as OfferDraft["status"])
      ? (record.status as OfferDraft["status"])
      : "LIVE",
    featured: record.featured,
  };
}
