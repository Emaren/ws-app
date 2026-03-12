export type BusinessRecord = {
  id: string;
  slug: string;
  name: string;
  status: string;
};

export type InventoryItemRecord = {
  id: string;
  businessId: string;
  sku: string | null;
  name: string;
  priceCents: number;
  compareAtCents: number | null;
  quantityOnHand: number;
  reservedQuantity: number;
  lowStockThreshold: number | null;
  expiresAt: string | null;
  isActive: boolean;
  updatedAt: string;
};

export type OfferRecord = {
  id: string;
  businessId: string;
  inventoryItemId: string | null;
  title: string;
  description: string | null;
  status: string;
  discountPriceCents: number | null;
  startsAt: string | null;
  endsAt: string | null;
  unitsTotal: number | null;
  unitsClaimed: number;
  featured: boolean;
  ctaUrl: string | null;
  updatedAt: string;
};

export type DynamicPricingSource =
  | "MANUAL_OVERRIDE"
  | "OFFER"
  | "PRICING_RULE"
  | "EXPIRY_CLEARANCE"
  | "STOCK_THRESHOLD"
  | "BASE";

export type DynamicPricingAdjustment = {
  source: DynamicPricingSource;
  sourceId: string | null;
  label: string;
  unitPriceCents: number;
  selected: boolean;
};

export type DynamicPricingQuote = {
  businessId: string;
  inventoryItemId: string;
  asOf: string;
  quantity: number;
  availableUnits: number;
  purchasable: boolean;
  blockedReason: string | null;
  expiresAt: string | null;
  baseUnitPriceCents: number;
  finalUnitPriceCents: number | null;
  finalTotalCents: number | null;
  selectedSource: DynamicPricingSource | null;
  selectedSourceId: string | null;
  adjustments: DynamicPricingAdjustment[];
};

export type InventoryFormState = {
  id: string | null;
  businessId: string;
  sku: string;
  name: string;
  priceCents: string;
  compareAtCents: string;
  quantityOnHand: string;
  lowStockThreshold: string;
  expiresAt: string;
  isActive: boolean;
};

export type OfferFormState = {
  id: string | null;
  businessId: string;
  inventoryItemId: string;
  title: string;
  description: string;
  status: "DRAFT" | "LIVE" | "PAUSED" | "EXPIRED" | "ARCHIVED";
  discountPriceCents: string;
  startsAt: string;
  endsAt: string;
  unitsTotal: string;
  unitsClaimed: string;
  featured: boolean;
  ctaUrl: string;
};

export type PricingPreviewFormState = {
  businessId: string;
  inventoryItemId: string;
  quantity: string;
  asOf: string;
  manualOverrideCents: string;
};

export type StorePricingSnapshot = {
  business: BusinessRecord;
  liveOffers: OfferRecord[];
  featuredLiveOffers: number;
  bestLiveOffer: OfferRecord | null;
  nextEndingAt: string | null;
  nextEndingTitle: string | null;
};

export async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      (payload && typeof payload.message === "string" && payload.message) ||
      `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}

export function centsToDollars(cents: number | null): string {
  if (cents === null || !Number.isFinite(cents)) return "-";
  return `$${(cents / 100).toFixed(2)}`;
}

export function toLocalDateTimeInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export function toIsoDate(localValue: string, label: string): string | null {
  const trimmed = localValue.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (!Number.isFinite(parsed.getTime())) {
    throw new Error(`${label} must be a valid date/time`);
  }
  return parsed.toISOString();
}

export function optionalInt(raw: string, label: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} must be an integer`);
  }
  return parsed;
}

export function requiredInt(raw: string, label: string): number {
  const parsed = optionalInt(raw, label);
  if (parsed === null) {
    throw new Error(`${label} is required`);
  }
  return parsed;
}

export function parseIsoMs(iso: string | null): number | null {
  if (!iso) return null;
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

export function formatWindow(startsAt: string | null, endsAt: string | null): string {
  if (!startsAt && !endsAt) return "No window";
  const startLabel = startsAt ? new Date(startsAt).toLocaleString() : "now";
  const endLabel = endsAt ? new Date(endsAt).toLocaleString() : "open";
  return `${startLabel} -> ${endLabel}`;
}

export function remainingUnitsCount(
  unitsTotal: number | null,
  unitsClaimed: number,
): number | null {
  if (unitsTotal === null) return null;
  return Math.max(unitsTotal - unitsClaimed, 0);
}

export function remainingUnits(unitsTotal: number | null, unitsClaimed: number): string {
  const units = remainingUnitsCount(unitsTotal, unitsClaimed);
  return units === null ? "n/a" : String(units);
}

export function claimPercent(unitsTotal: number | null, unitsClaimed: number): number | null {
  if (unitsTotal === null || unitsTotal <= 0) return null;
  const bounded = Math.max(0, Math.min(unitsClaimed, unitsTotal));
  return Math.round((bounded / unitsTotal) * 100);
}

export function isWithinWindow(
  nowMs: number,
  startsAt: string | null,
  endsAt: string | null,
): boolean {
  const startMs = parseIsoMs(startsAt);
  if (startMs !== null && nowMs < startMs) return false;

  const endMs = parseIsoMs(endsAt);
  if (endMs !== null && nowMs > endMs) return false;

  return true;
}

export function isOfferLiveNow(offer: OfferRecord, nowMs: number): boolean {
  if (offer.status !== "LIVE") return false;
  if (!isWithinWindow(nowMs, offer.startsAt, offer.endsAt)) return false;
  if (offer.unitsTotal !== null && offer.unitsClaimed >= offer.unitsTotal) return false;
  return true;
}

export function formatDuration(totalSecondsInput: number): string {
  const totalSeconds = Math.max(0, Math.trunc(totalSecondsInput));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

export function countdownLabel(
  startsAt: string | null,
  endsAt: string | null,
  nowMs: number,
): string {
  const startMs = parseIsoMs(startsAt);
  const endMs = parseIsoMs(endsAt);

  if (startMs !== null && nowMs < startMs) {
    const seconds = Math.ceil((startMs - nowMs) / 1_000);
    return `Starts in ${formatDuration(seconds)}`;
  }

  if (endMs !== null) {
    if (nowMs > endMs) {
      return "Expired";
    }
    const seconds = Math.ceil((endMs - nowMs) / 1_000);
    return `Ends in ${formatDuration(seconds)}`;
  }

  return "Open-ended";
}

export function expiryCountdown(expiresAt: string | null, nowMs: number): string {
  const expiresMs = parseIsoMs(expiresAt);
  if (expiresMs === null) {
    return "No expiry";
  }
  if (nowMs >= expiresMs) {
    return "Expired";
  }

  const seconds = Math.ceil((expiresMs - nowMs) / 1_000);
  return `Expires in ${formatDuration(seconds)}`;
}

export function createInventoryForm(businessId: string): InventoryFormState {
  return {
    id: null,
    businessId,
    sku: "",
    name: "",
    priceCents: "",
    compareAtCents: "",
    quantityOnHand: "0",
    lowStockThreshold: "",
    expiresAt: "",
    isActive: true,
  };
}

export function createOfferForm(businessId: string): OfferFormState {
  return {
    id: null,
    businessId,
    inventoryItemId: "",
    title: "",
    description: "",
    status: "DRAFT",
    discountPriceCents: "",
    startsAt: "",
    endsAt: "",
    unitsTotal: "",
    unitsClaimed: "0",
    featured: false,
    ctaUrl: "",
  };
}

export function createPricingPreviewForm(
  businessId: string,
  inventoryItemId = "",
): PricingPreviewFormState {
  return {
    businessId,
    inventoryItemId,
    quantity: "1",
    asOf: "",
    manualOverrideCents: "",
  };
}
