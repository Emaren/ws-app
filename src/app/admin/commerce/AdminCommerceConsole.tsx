"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { describeDeliveryLeadSource, describeRewardReason } from "@/lib/rewardPresentation";

type StoreProfileRecord = {
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

type BusinessRecord = {
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

type ProductRecord = {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  brandName: string | null;
  reviewCount: number;
  inventoryCount: number;
  offerCount: number;
};

type InventoryRecord = {
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

type OfferRecord = {
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

type OverviewResponse = {
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

type StoreProfileDraft = {
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

type InventoryDraft = {
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

type OfferDraft = {
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

const OFFER_STATUSES = ["DRAFT", "LIVE", "PAUSED", "EXPIRED", "ARCHIVED"] as const;

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
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
      (payload &&
        typeof payload === "object" &&
        "message" in payload &&
        typeof payload.message === "string" &&
        payload.message) ||
      `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}

function money(cents: number | null): string {
  if (cents === null || !Number.isFinite(cents)) {
    return "-";
  }
  return `$${(cents / 100).toFixed(2)}`;
}

function localDate(iso: string | null): string {
  if (!iso) return "-";
  const parsed = new Date(iso);
  if (!Number.isFinite(parsed.getTime())) return "-";
  return parsed.toLocaleString();
}

function formatTokenAmount(value: number): string {
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

function leadStatusClassName(status: string): string {
  switch (status) {
    case "FULFILLED":
      return "border-emerald-500/35 bg-emerald-500/10 text-emerald-100";
    case "RESERVED":
      return "border-sky-500/35 bg-sky-500/10 text-sky-100";
    case "CONTACTED":
      return "border-amber-500/35 bg-amber-500/10 text-amber-100";
    case "CANCELLED":
    case "EXPIRED":
      return "border-rose-500/35 bg-rose-500/10 text-rose-100";
    default:
      return "border-white/10 bg-white/5 text-white/80";
  }
}

function toDateTimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const parsed = new Date(iso);
  if (!Number.isFinite(parsed.getTime())) return "";
  const offsetMs = parsed.getTimezoneOffset() * 60_000;
  return new Date(parsed.getTime() - offsetMs).toISOString().slice(0, 16);
}

function createStoreProfileDraft(profile?: StoreProfileRecord | null): StoreProfileDraft {
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

function createInventoryDraft(businessId: string): InventoryDraft {
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

function inventoryDraftFromRecord(record: InventoryRecord): InventoryDraft {
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

function createOfferDraft(businessId: string): OfferDraft {
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

function offerDraftFromRecord(record: OfferRecord): OfferDraft {
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

export default function AdminCommerceConsole() {
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [selectedBusinessId, setSelectedBusinessId] = useState("");
  const [storeDraft, setStoreDraft] = useState<StoreProfileDraft>(() =>
    createStoreProfileDraft(),
  );
  const [inventoryDraft, setInventoryDraft] = useState<InventoryDraft>(() =>
    createInventoryDraft(""),
  );
  const [offerDraft, setOfferDraft] = useState<OfferDraft>(() =>
    createOfferDraft(""),
  );
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const businesses = overview?.businesses ?? [];
  const products = overview?.products ?? [];
  const inventoryItems = overview?.inventoryItems ?? [];
  const offers = overview?.offers ?? [];

  const selectedBusiness = useMemo(
    () => businesses.find((business) => business.id === selectedBusinessId) ?? null,
    [businesses, selectedBusinessId],
  );

  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const inventoryOptions = useMemo(
    () => inventoryItems.filter((item) => item.isActive || item.id === offerDraft.inventoryItemId),
    [inventoryItems, offerDraft.inventoryItemId],
  );

  async function loadOverview(nextBusinessId = selectedBusinessId) {
    setLoading(true);
    setError(null);

    try {
      const query = new URLSearchParams();
      if (nextBusinessId) {
        query.set("businessId", nextBusinessId);
      }
      const suffix = query.toString();
      const data = await requestJson<OverviewResponse>(
        `/api/admin/commerce/overview${suffix ? `?${suffix}` : ""}`,
      );

      const resolvedBusinessId = data.selectedBusinessId ?? "";
      const resolvedBusiness =
        data.businesses.find((business) => business.id === resolvedBusinessId) ?? null;

      setOverview(data);
      setSelectedBusinessId(resolvedBusinessId);
      setStoreDraft(createStoreProfileDraft(resolvedBusiness?.storeProfile));
      setInventoryDraft((prev) =>
        prev.id || prev.businessId === resolvedBusinessId
          ? prev
          : createInventoryDraft(resolvedBusinessId),
      );
      setOfferDraft((prev) =>
        prev.id || prev.businessId === resolvedBusinessId
          ? prev
          : createOfferDraft(resolvedBusinessId),
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOverview("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleBusinessChange(nextBusinessId: string) {
    setSelectedBusinessId(nextBusinessId);
    setInventoryDraft(createInventoryDraft(nextBusinessId));
    setOfferDraft(createOfferDraft(nextBusinessId));
    setNotice(null);
    setError(null);
    await loadOverview(nextBusinessId);
  }

  async function saveStoreProfile(event: FormEvent) {
    event.preventDefault();
    if (!selectedBusinessId) {
      setError("Select a business first.");
      return;
    }

    setBusyAction("save-store");
    setError(null);
    setNotice(null);

    try {
      await requestJson<{ ok: true }>("/api/admin/commerce/store-profile", {
        method: "POST",
        body: JSON.stringify({
          businessId: selectedBusinessId,
          ...storeDraft,
        }),
      });
      setNotice("Store profile updated.");
      await loadOverview(selectedBusinessId);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setBusyAction(null);
    }
  }

  async function saveInventory(event: FormEvent) {
    event.preventDefault();
    if (!selectedBusinessId) {
      setError("Select a business first.");
      return;
    }

    if (!inventoryDraft.name.trim()) {
      setError("Inventory name is required.");
      return;
    }

    setBusyAction("save-inventory");
    setError(null);
    setNotice(null);

    try {
      await requestJson<{ ok: true }>(
        inventoryDraft.id
          ? `/api/admin/commerce/inventory/${inventoryDraft.id}`
          : "/api/admin/commerce/inventory",
        {
          method: inventoryDraft.id ? "PATCH" : "POST",
          body: JSON.stringify({
            businessId: selectedBusinessId,
            productId: inventoryDraft.productId || null,
            sku: inventoryDraft.sku,
            name: inventoryDraft.name.trim(),
            description: inventoryDraft.description,
            category: inventoryDraft.category,
            unitLabel: inventoryDraft.unitLabel,
            imageUrl: inventoryDraft.imageUrl,
            priceCents: inventoryDraft.priceCents,
            compareAtCents: inventoryDraft.compareAtCents,
            quantityOnHand: inventoryDraft.quantityOnHand,
            lowStockThreshold: inventoryDraft.lowStockThreshold,
            isActive: inventoryDraft.isActive,
          }),
        },
      );

      setNotice(inventoryDraft.id ? "Inventory item updated." : "Inventory item created.");
      setInventoryDraft(createInventoryDraft(selectedBusinessId));
      await loadOverview(selectedBusinessId);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setBusyAction(null);
    }
  }

  async function saveOffer(event: FormEvent) {
    event.preventDefault();
    if (!selectedBusinessId) {
      setError("Select a business first.");
      return;
    }

    if (!offerDraft.title.trim()) {
      setError("Offer title is required.");
      return;
    }

    setBusyAction("save-offer");
    setError(null);
    setNotice(null);

    try {
      await requestJson<{ ok: true }>(
        offerDraft.id
          ? `/api/admin/commerce/offers/${offerDraft.id}`
          : "/api/admin/commerce/offers",
        {
          method: offerDraft.id ? "PATCH" : "POST",
          body: JSON.stringify({
            businessId: selectedBusinessId,
            productId: offerDraft.productId || null,
            inventoryItemId: offerDraft.inventoryItemId || null,
            title: offerDraft.title.trim(),
            description: offerDraft.description,
            badgeText: offerDraft.badgeText,
            discountPriceCents: offerDraft.discountPriceCents,
            startsAt: offerDraft.startsAt,
            endsAt: offerDraft.endsAt,
            unitsTotal: offerDraft.unitsTotal,
            ctaUrl: offerDraft.ctaUrl,
            status: offerDraft.status,
            featured: offerDraft.featured,
          }),
        },
      );

      setNotice(offerDraft.id ? "Offer updated." : "Offer created.");
      setOfferDraft(createOfferDraft(selectedBusinessId));
      await loadOverview(selectedBusinessId);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setBusyAction(null);
    }
  }

  async function deleteInventory(item: InventoryRecord) {
    if (!window.confirm(`Delete inventory item "${item.name}"?`)) {
      return;
    }

    setBusyAction(`delete-inventory-${item.id}`);
    setError(null);
    setNotice(null);

    try {
      await requestJson<{ ok: true }>(`/api/admin/commerce/inventory/${item.id}`, {
        method: "DELETE",
      });
      if (inventoryDraft.id === item.id) {
        setInventoryDraft(createInventoryDraft(selectedBusinessId));
      }
      setNotice(`Deleted inventory item "${item.name}".`);
      await loadOverview(selectedBusinessId);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : String(deleteError));
    } finally {
      setBusyAction(null);
    }
  }

  async function toggleInventory(item: InventoryRecord) {
    setBusyAction(`toggle-inventory-${item.id}`);
    setError(null);
    setNotice(null);

    try {
      await requestJson<{ ok: true }>(`/api/admin/commerce/inventory/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: item.name,
          productId: item.productId,
          sku: item.sku,
          description: item.description,
          category: item.category,
          unitLabel: item.unitLabel,
          imageUrl: item.imageUrl,
          priceCents: item.priceCents,
          compareAtCents: item.compareAtCents,
          quantityOnHand: item.quantityOnHand,
          lowStockThreshold: item.lowStockThreshold,
          isActive: !item.isActive,
        }),
      });
      setNotice(
        `${item.name} is now ${item.isActive ? "inactive" : "active"} in the local buy network.`,
      );
      await loadOverview(selectedBusinessId);
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : String(toggleError));
    } finally {
      setBusyAction(null);
    }
  }

  async function deleteOffer(offer: OfferRecord) {
    if (!window.confirm(`Delete offer "${offer.title}"?`)) {
      return;
    }

    setBusyAction(`delete-offer-${offer.id}`);
    setError(null);
    setNotice(null);

    try {
      await requestJson<{ ok: true }>(`/api/admin/commerce/offers/${offer.id}`, {
        method: "DELETE",
      });
      if (offerDraft.id === offer.id) {
        setOfferDraft(createOfferDraft(selectedBusinessId));
      }
      setNotice(`Deleted offer "${offer.title}".`);
      await loadOverview(selectedBusinessId);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : String(deleteError));
    } finally {
      setBusyAction(null);
    }
  }

  async function toggleOfferStatus(offer: OfferRecord) {
    const nextStatus = offer.status === "LIVE" ? "PAUSED" : "LIVE";
    setBusyAction(`toggle-offer-${offer.id}`);
    setError(null);
    setNotice(null);

    try {
      await requestJson<{ ok: true }>(`/api/admin/commerce/offers/${offer.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          productId: offer.productId,
          inventoryItemId: offer.inventoryItemId,
          title: offer.title,
          description: offer.description,
          badgeText: offer.badgeText,
          discountPriceCents: offer.discountPriceCents,
          startsAt: toDateTimeLocalValue(offer.startsAt),
          endsAt: toDateTimeLocalValue(offer.endsAt),
          unitsTotal: offer.unitsTotal,
          ctaUrl: offer.ctaUrl,
          status: nextStatus,
          featured: offer.featured,
        }),
      });
      setNotice(`Offer "${offer.title}" is now ${nextStatus.toLowerCase()}.`);
      await loadOverview(selectedBusinessId);
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : String(toggleError));
    } finally {
      setBusyAction(null);
    }
  }

  const networkSummary = overview?.networkSummary;
  const activityWindow = overview?.activityWindow;
  const selectedActivitySummary = overview?.selectedActivitySummary;
  const recentLeads = overview?.recentLeads ?? [];
  const recentRewards = overview?.recentRewards ?? [];
  const businessPerformance = overview?.businessPerformance ?? [];
  const selectionSummary = overview?.selectionSummary;

  return (
    <div className="space-y-4">
      <div className="admin-card p-4 md:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl space-y-3">
            <p className="text-xs uppercase tracking-[0.24em] opacity-70">
              Commerce Console
            </p>
            <h2 className="text-2xl font-semibold md:text-3xl">
              Product-linked local buying, delivery, and offer authoring
            </h2>
            <p className="max-w-2xl text-sm opacity-80 md:text-base">
              This is the local control plane for Wheat &amp; Stone commerce. It turns
              businesses into store profiles, products into inventory, and inventory into
              live offers that show up across product pages and delivery paths.
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1">
                Scope: {overview?.scope.mode === "BUSINESS" ? "Business-scoped" : "Global"}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Generated {localDate(overview?.generatedAt ?? null)}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Businesses originate in Company Dashboards
              </span>
            </div>
          </div>

          <div className="grid gap-2 text-sm md:min-w-[320px]">
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-wide opacity-70">
                Selected business
              </span>
              <select
                value={selectedBusinessId}
                onChange={(event) => void handleBusinessChange(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                disabled={loading || businesses.length === 0}
              >
                {businesses.length === 0 ? <option value="">No businesses in scope</option> : null}
                {businesses.map((business) => (
                  <option key={business.id} value={business.id}>
                    {business.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/products"
                className="rounded-xl border border-emerald-400/35 bg-emerald-500/10 px-3 py-2 text-center font-medium transition hover:bg-emerald-500/20"
              >
                Open Products
              </Link>
              <Link
                href="/offers"
                className="rounded-xl border border-sky-400/35 bg-sky-500/10 px-3 py-2 text-center font-medium transition hover:bg-sky-500/20"
              >
                Open Offers
              </Link>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="mt-4 rounded-xl border border-emerald-400/35 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
            {notice}
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <article className="admin-card rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide opacity-70">Businesses</p>
          <p className="mt-1 text-2xl font-semibold">{networkSummary?.businessCount ?? 0}</p>
        </article>
        <article className="admin-card rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide opacity-70">Delivery-ready</p>
          <p className="mt-1 text-2xl font-semibold">
            {networkSummary?.deliveryReadyCount ?? 0}
          </p>
        </article>
        <article className="admin-card rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide opacity-70">Inventory</p>
          <p className="mt-1 text-2xl font-semibold">{networkSummary?.inventoryCount ?? 0}</p>
        </article>
        <article className="admin-card rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide opacity-70">Product-linked items</p>
          <p className="mt-1 text-2xl font-semibold">
            {networkSummary?.productLinkedInventoryCount ?? 0}
          </p>
        </article>
        <article className="admin-card rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide opacity-70">Live offers</p>
          <p className="mt-1 text-2xl font-semibold">{networkSummary?.liveOfferCount ?? 0}</p>
        </article>
        <article className="admin-card rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide opacity-70">Product-linked offers</p>
          <p className="mt-1 text-2xl font-semibold">
            {networkSummary?.productLinkedOfferCount ?? 0}
          </p>
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="admin-card space-y-4 p-4 md:p-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] opacity-70">
                Selected Store Activity
              </p>
              <h3 className="mt-1 text-xl font-semibold">
                {selectedBusiness?.name || "No business selected"}
              </h3>
              <p className="mt-1 text-sm opacity-75">
                Last {activityWindow?.days ?? 30} days of delivery conversion and reward movement.
              </p>
            </div>
            <div className="text-sm opacity-70">
              Tracked demand{" "}
              <span className="font-medium text-white">
                {money(selectedActivitySummary?.trackedDemandCents ?? null)}
              </span>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <div className="admin-surface rounded-xl p-3">
              <p className="text-xs uppercase tracking-wide opacity-70">Delivery leads</p>
              <p className="mt-1 text-xl font-semibold">
                {selectedActivitySummary?.leadCount ?? 0}
              </p>
            </div>
            <div className="admin-surface rounded-xl p-3">
              <p className="text-xs uppercase tracking-wide opacity-70">Open pipeline</p>
              <p className="mt-1 text-xl font-semibold">
                {selectedActivitySummary?.openLeadCount ?? 0}
              </p>
            </div>
            <div className="admin-surface rounded-xl p-3">
              <p className="text-xs uppercase tracking-wide opacity-70">Reserved</p>
              <p className="mt-1 text-xl font-semibold">
                {selectedActivitySummary?.reservedLeadCount ?? 0}
              </p>
            </div>
            <div className="admin-surface rounded-xl p-3">
              <p className="text-xs uppercase tracking-wide opacity-70">Fulfilled</p>
              <p className="mt-1 text-xl font-semibold">
                {selectedActivitySummary?.fulfilledLeadCount ?? 0}
              </p>
            </div>
            <div className="admin-surface rounded-xl p-3">
              <p className="text-xs uppercase tracking-wide opacity-70">Opt-ins</p>
              <p className="mt-1 text-xl font-semibold">
                {selectedActivitySummary?.notificationOptInCount ?? 0}
              </p>
            </div>
            <div className="admin-surface rounded-xl p-3">
              <p className="text-xs uppercase tracking-wide opacity-70">Reward entries</p>
              <p className="mt-1 text-xl font-semibold">
                {selectedActivitySummary?.rewardCount ?? 0}
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/80">
                Buyer rewards
              </p>
              <p className="mt-1 text-lg font-semibold text-emerald-50">
                $STONE {formatTokenAmount(selectedActivitySummary?.rewardTotals.STONE ?? 0)}
              </p>
            </div>
            <div className="rounded-xl border border-amber-300/20 bg-amber-400/5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-amber-100/80">
                Contributor rewards
              </p>
              <p className="mt-1 text-lg font-semibold text-amber-50">
                $WHEAT {formatTokenAmount(selectedActivitySummary?.rewardTotals.WHEAT ?? 0)}
              </p>
            </div>
          </div>

          <div className="grid gap-2 text-sm opacity-80 md:grid-cols-3">
            <p>
              Reserve conversion{" "}
              <span className="font-medium">
                {selectedActivitySummary?.leadToReserveRate ?? 0}%
              </span>
            </p>
            <p>
              Fulfillment conversion{" "}
              <span className="font-medium">
                {selectedActivitySummary?.leadToFulfillmentRate ?? 0}%
              </span>
            </p>
            <p>
              Average request value{" "}
              <span className="font-medium">
                {money(selectedActivitySummary?.avgLeadValueCents ?? null)}
              </span>
            </p>
          </div>
        </div>

        <div className="admin-card space-y-3 p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] opacity-70">Store Performance</p>
              <h3 className="mt-1 text-lg font-semibold">Network leaderboard</h3>
            </div>
            <span className="text-xs opacity-65">
              {activityWindow?.days ?? 30}-day activity
            </span>
          </div>

          {businessPerformance.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-sm opacity-70">
              No managed businesses in scope yet.
            </p>
          ) : (
            <div className="space-y-2">
              {businessPerformance.slice(0, 6).map((row) => (
                <article key={row.businessId} className="admin-surface rounded-xl px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{row.businessName}</p>
                      <p className="mt-1 text-xs opacity-70">
                        {row.deliveryEnabled ? "Delivery enabled" : "Delivery off"} ·{" "}
                        {row.activeInventoryCount} active items · {row.liveOfferCount} live offers
                      </p>
                    </div>
                    <div className="text-right text-xs opacity-75">
                      <p>{row.leadCount} leads</p>
                      <p>{row.fulfilledLeadCount} fulfilled</p>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs opacity-80 md:grid-cols-2">
                    <p>
                      Reserve {row.leadToReserveRate}% · Fulfillment {row.leadToFulfillmentRate}%
                    </p>
                    <p>
                      $STONE {formatTokenAmount(row.rewardTotals.STONE)} · $WHEAT{" "}
                      {formatTokenAmount(row.rewardTotals.WHEAT)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="admin-card space-y-3 p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] opacity-70">Recent Leads</p>
              <h3 className="mt-1 text-lg font-semibold">Delivery pipeline</h3>
            </div>
            <span className="text-xs opacity-65">
              {selectedBusiness?.name || "Selected business"}
            </span>
          </div>

          {recentLeads.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-sm opacity-70">
              No delivery lead activity yet for this store.
            </p>
          ) : (
            <div className="space-y-2">
              {recentLeads.map((lead) => (
                <article key={lead.id} className="admin-surface rounded-xl px-3 py-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-medium">
                        {lead.inventoryItemName || lead.offerTitle || "Delivery request"}
                      </p>
                      <p className="mt-1 text-sm opacity-75">
                        {lead.recipientName || lead.recipientEmail || lead.recipientPhone || "Unknown contact"}
                      </p>
                    </div>
                    <span
                      className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-[11px] font-medium ${leadStatusClassName(lead.status)}`}
                    >
                      {lead.status}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-70">
                    <span>{describeDeliveryLeadSource(lead.source)}</span>
                    <span>Qty {lead.requestedQty}</span>
                    <span>{money(lead.totalCents)}</span>
                    <span>{localDate(lead.updatedAt)}</span>
                  </div>

                  <p className="mt-2 text-xs opacity-60">
                    {lead.deliveryAddress || "Delivery address not supplied"}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="admin-card space-y-3 p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] opacity-70">Recent Rewards</p>
              <h3 className="mt-1 text-lg font-semibold">Token movement</h3>
            </div>
            <Link
              href="/admin/rewards"
              className="text-xs font-medium opacity-75 transition hover:opacity-100"
            >
              Open rewards ops
            </Link>
          </div>

          {recentRewards.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-sm opacity-70">
              No reward entries yet for this store.
            </p>
          ) : (
            <div className="space-y-2">
              {recentRewards.map((reward) => {
                const signedAmount =
                  reward.direction === "DEBIT" ? -reward.amount : reward.amount;

                return (
                  <article key={reward.id} className="admin-surface rounded-xl px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{describeRewardReason(reward.reason)}</p>
                        <p className="mt-1 text-sm opacity-75">
                          {reward.userName || reward.userEmail || "Unknown user"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          {signedAmount >= 0 ? "+" : ""}
                          {formatTokenAmount(signedAmount)} {reward.token}
                        </p>
                        <p className="mt-1 text-xs opacity-70">{localDate(reward.createdAt)}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
        <div className="admin-card space-y-4 p-4 md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.2em] opacity-70">Selected Store</p>
              <h3 className="text-xl font-semibold">
                {selectedBusiness?.storeProfile?.displayName || selectedBusiness?.name || "No business selected"}
              </h3>
              <p className="text-sm opacity-75">
                {selectedBusiness?.storeProfile?.city || "City not set"}
                {selectedBusiness?.storeProfile?.region
                  ? `, ${selectedBusiness.storeProfile.region}`
                  : ""}
                {selectedBusiness?.storeProfile?.country
                  ? `, ${selectedBusiness.storeProfile.country}`
                  : ""}
              </p>
            </div>

            {selectedBusiness ? (
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  {selectedBusiness.isVerified ? "Verified business" : "Verification pending"}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  {selectionSummary?.deliveryEnabled ? "Delivery enabled" : "Delivery off"}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  {selectionSummary?.pickupEnabled ? "Pickup enabled" : "Pickup off"}
                </span>
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="admin-surface rounded-xl p-3">
              <p className="text-xs uppercase tracking-wide opacity-70">Active items</p>
              <p className="mt-1 text-xl font-semibold">
                {selectionSummary?.activeInventoryCount ?? 0}
              </p>
            </div>
            <div className="admin-surface rounded-xl p-3">
              <p className="text-xs uppercase tracking-wide opacity-70">Low stock</p>
              <p className="mt-1 text-xl font-semibold">{selectionSummary?.lowStockCount ?? 0}</p>
            </div>
            <div className="admin-surface rounded-xl p-3">
              <p className="text-xs uppercase tracking-wide opacity-70">Live offers</p>
              <p className="mt-1 text-xl font-semibold">
                {selectionSummary?.liveOfferCount ?? 0}
              </p>
            </div>
            <div className="admin-surface rounded-xl p-3">
              <p className="text-xs uppercase tracking-wide opacity-70">Featured offers</p>
              <p className="mt-1 text-xl font-semibold">
                {selectionSummary?.featuredOfferCount ?? 0}
              </p>
            </div>
          </div>

          <form onSubmit={saveStoreProfile} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-sm font-medium">Display name</span>
                <input
                  value={storeDraft.displayName}
                  onChange={(event) =>
                    setStoreDraft((prev) => ({ ...prev, displayName: event.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                  placeholder="Wheat & Stone Marketplace"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium">Website URL</span>
                <input
                  value={storeDraft.websiteUrl}
                  onChange={(event) =>
                    setStoreDraft((prev) => ({ ...prev, websiteUrl: event.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                  placeholder="https://example.com"
                />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-sm font-medium">Store description</span>
                <textarea
                  value={storeDraft.description}
                  onChange={(event) =>
                    setStoreDraft((prev) => ({ ...prev, description: event.target.value }))
                  }
                  className="min-h-[110px] w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                  placeholder="What makes this local specialty store worth using?"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium">City</span>
                <input
                  value={storeDraft.city}
                  onChange={(event) =>
                    setStoreDraft((prev) => ({ ...prev, city: event.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium">Region / Province</span>
                <input
                  value={storeDraft.region}
                  onChange={(event) =>
                    setStoreDraft((prev) => ({ ...prev, region: event.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium">Country</span>
                <input
                  value={storeDraft.country}
                  onChange={(event) =>
                    setStoreDraft((prev) => ({ ...prev, country: event.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium">Delivery radius (km)</span>
                <input
                  value={storeDraft.deliveryRadiusKm}
                  onChange={(event) =>
                    setStoreDraft((prev) => ({
                      ...prev,
                      deliveryRadiusKm: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                  inputMode="numeric"
                  placeholder="25"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium">Notification email</span>
                <input
                  value={storeDraft.notificationEmail}
                  onChange={(event) =>
                    setStoreDraft((prev) => ({
                      ...prev,
                      notificationEmail: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                  placeholder="ops@example.com"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium">Logo URL</span>
                <input
                  value={storeDraft.logoUrl}
                  onChange={(event) =>
                    setStoreDraft((prev) => ({ ...prev, logoUrl: event.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium">Hero image URL</span>
                <input
                  value={storeDraft.heroImageUrl}
                  onChange={(event) =>
                    setStoreDraft((prev) => ({ ...prev, heroImageUrl: event.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={storeDraft.deliveryEnabled}
                  onChange={(event) =>
                    setStoreDraft((prev) => ({
                      ...prev,
                      deliveryEnabled: event.target.checked,
                    }))
                  }
                />
                Delivery enabled
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={storeDraft.pickupEnabled}
                  onChange={(event) =>
                    setStoreDraft((prev) => ({
                      ...prev,
                      pickupEnabled: event.target.checked,
                    }))
                  }
                />
                Pickup enabled
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="rounded-xl border border-amber-300/40 bg-amber-200/20 px-3 py-2 text-sm font-medium transition hover:bg-amber-200/30"
                disabled={busyAction === "save-store" || !selectedBusinessId}
              >
                {busyAction === "save-store" ? "Saving..." : "Save Store Profile"}
              </button>
              <button
                type="button"
                onClick={() => setStoreDraft(createStoreProfileDraft(selectedBusiness?.storeProfile))}
                className="rounded-xl border border-white/10 px-3 py-2 text-sm transition hover:bg-white/5"
                disabled={!selectedBusinessId}
              >
                Reset
              </button>
            </div>
          </form>
        </div>

        <div className="grid gap-4">
          <form onSubmit={saveInventory} className="admin-card space-y-4 p-4 md:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] opacity-70">
                  Inventory Studio
                </p>
                <h3 className="text-lg font-semibold">
                  {inventoryDraft.id ? "Edit inventory item" : "Create inventory item"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInventoryDraft(createInventoryDraft(selectedBusinessId))}
                className="rounded-xl border border-white/10 px-3 py-2 text-sm transition hover:bg-white/5"
              >
                New item
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 md:col-span-2">
                <span className="text-sm font-medium">Canonical product</span>
                <select
                  value={inventoryDraft.productId}
                  onChange={(event) => {
                    const nextProductId = event.target.value;
                    const product = nextProductId ? productById.get(nextProductId) : null;
                    setInventoryDraft((prev) => ({
                      ...prev,
                      productId: nextProductId,
                      name: prev.name || product?.name || "",
                      category: prev.category || product?.category || "",
                    }));
                  }}
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                >
                  <option value="">No canonical product linked</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                      {product.brandName ? ` - ${product.brandName}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-sm font-medium">Inventory name</span>
                <input
                  value={inventoryDraft.name}
                  onChange={(event) =>
                    setInventoryDraft((prev) => ({ ...prev, name: event.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                  placeholder="Avalon Organic Chocolate Milk Marketplace Delivery"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium">SKU</span>
                <input
                  value={inventoryDraft.sku}
                  onChange={(event) =>
                    setInventoryDraft((prev) => ({ ...prev, sku: event.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                  placeholder="avalon-organic-milk-1l"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium">Unit label</span>
                <input
                  value={inventoryDraft.unitLabel}
                  onChange={(event) =>
                    setInventoryDraft((prev) => ({ ...prev, unitLabel: event.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                  placeholder="1L carton"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium">Category</span>
                <input
                  value={inventoryDraft.category}
                  onChange={(event) =>
                    setInventoryDraft((prev) => ({ ...prev, category: event.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                  placeholder="Dairy"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium">Image URL</span>
                <input
                  value={inventoryDraft.imageUrl}
                  onChange={(event) =>
                    setInventoryDraft((prev) => ({ ...prev, imageUrl: event.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium">Price (cents)</span>
                <input
                  value={inventoryDraft.priceCents}
                  onChange={(event) =>
                    setInventoryDraft((prev) => ({ ...prev, priceCents: event.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                  inputMode="numeric"
                  placeholder="799"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium">Compare-at (cents)</span>
                <input
                  value={inventoryDraft.compareAtCents}
                  onChange={(event) =>
                    setInventoryDraft((prev) => ({
                      ...prev,
                      compareAtCents: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                  inputMode="numeric"
                  placeholder="999"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium">On hand</span>
                <input
                  value={inventoryDraft.quantityOnHand}
                  onChange={(event) =>
                    setInventoryDraft((prev) => ({
                      ...prev,
                      quantityOnHand: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                  inputMode="numeric"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium">Low stock threshold</span>
                <input
                  value={inventoryDraft.lowStockThreshold}
                  onChange={(event) =>
                    setInventoryDraft((prev) => ({
                      ...prev,
                      lowStockThreshold: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                  inputMode="numeric"
                />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-sm font-medium">Description</span>
                <textarea
                  value={inventoryDraft.description}
                  onChange={(event) =>
                    setInventoryDraft((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  className="min-h-[100px] w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                  placeholder="Operational notes for this local buy route."
                />
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={inventoryDraft.isActive}
                onChange={(event) =>
                  setInventoryDraft((prev) => ({ ...prev, isActive: event.target.checked }))
                }
              />
              Active in local buy network
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="rounded-xl border border-amber-300/40 bg-amber-200/20 px-3 py-2 text-sm font-medium transition hover:bg-amber-200/30"
                disabled={busyAction === "save-inventory" || !selectedBusinessId}
              >
                {busyAction === "save-inventory"
                  ? "Saving..."
                  : inventoryDraft.id
                    ? "Update Inventory"
                    : "Create Inventory"}
              </button>
              <button
                type="button"
                onClick={() => setInventoryDraft(createInventoryDraft(selectedBusinessId))}
                className="rounded-xl border border-white/10 px-3 py-2 text-sm transition hover:bg-white/5"
              >
                Reset
              </button>
            </div>
          </form>

          <form onSubmit={saveOffer} className="admin-card space-y-4 p-4 md:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] opacity-70">Offer Studio</p>
                <h3 className="text-lg font-semibold">
                  {offerDraft.id ? "Edit live offer" : "Create live offer"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOfferDraft(createOfferDraft(selectedBusinessId))}
                className="rounded-xl border border-white/10 px-3 py-2 text-sm transition hover:bg-white/5"
              >
                New offer
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 md:col-span-2">
                <span className="text-sm font-medium">Canonical product</span>
                <select
                  value={offerDraft.productId}
                  onChange={(event) => {
                    const nextProductId = event.target.value;
                    const product = nextProductId ? productById.get(nextProductId) : null;
                    setOfferDraft((prev) => ({
                      ...prev,
                      productId: nextProductId,
                      title: prev.title || (product ? `${product.name} Spotlight` : ""),
                    }));
                  }}
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                >
                  <option value="">No canonical product linked</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                      {product.brandName ? ` - ${product.brandName}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-sm font-medium">Inventory route</span>
                <select
                  value={offerDraft.inventoryItemId}
                  onChange={(event) => {
                    const nextInventoryItemId = event.target.value;
                    const inventory = inventoryOptions.find(
                      (item) => item.id === nextInventoryItemId,
                    );
                    setOfferDraft((prev) => ({
                      ...prev,
                      inventoryItemId: nextInventoryItemId,
                      productId: prev.productId || inventory?.productId || "",
                    }));
                  }}
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                >
                  <option value="">No inventory item linked</option>
                  {inventoryOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                      {item.productName ? ` - ${item.productName}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-sm font-medium">Offer title</span>
                <input
                  value={offerDraft.title}
                  onChange={(event) =>
                    setOfferDraft((prev) => ({ ...prev, title: event.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                  placeholder="Avalon Organic Chocolate Milk Delivery Pilot"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium">Badge text</span>
                <input
                  value={offerDraft.badgeText}
                  onChange={(event) =>
                    setOfferDraft((prev) => ({ ...prev, badgeText: event.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                  placeholder="Marketplace pilot"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium">Discount price (cents)</span>
                <input
                  value={offerDraft.discountPriceCents}
                  onChange={(event) =>
                    setOfferDraft((prev) => ({
                      ...prev,
                      discountPriceCents: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                  inputMode="numeric"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium">Units total</span>
                <input
                  value={offerDraft.unitsTotal}
                  onChange={(event) =>
                    setOfferDraft((prev) => ({ ...prev, unitsTotal: event.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                  inputMode="numeric"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium">Status</span>
                <select
                  value={offerDraft.status}
                  onChange={(event) =>
                    setOfferDraft((prev) => ({
                      ...prev,
                      status: event.target.value as OfferDraft["status"],
                    }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                >
                  {OFFER_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium">Starts at</span>
                <input
                  type="datetime-local"
                  value={offerDraft.startsAt}
                  onChange={(event) =>
                    setOfferDraft((prev) => ({ ...prev, startsAt: event.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium">Ends at</span>
                <input
                  type="datetime-local"
                  value={offerDraft.endsAt}
                  onChange={(event) =>
                    setOfferDraft((prev) => ({ ...prev, endsAt: event.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium">CTA URL</span>
                <input
                  value={offerDraft.ctaUrl}
                  onChange={(event) =>
                    setOfferDraft((prev) => ({ ...prev, ctaUrl: event.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                  placeholder="https://..."
                />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-sm font-medium">Description</span>
                <textarea
                  value={offerDraft.description}
                  onChange={(event) =>
                    setOfferDraft((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  className="min-h-[100px] w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                  placeholder="What should a shopper know before clicking?"
                />
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={offerDraft.featured}
                onChange={(event) =>
                  setOfferDraft((prev) => ({ ...prev, featured: event.target.checked }))
                }
              />
              Feature this offer in surfaced buying modules
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="rounded-xl border border-amber-300/40 bg-amber-200/20 px-3 py-2 text-sm font-medium transition hover:bg-amber-200/30"
                disabled={busyAction === "save-offer" || !selectedBusinessId}
              >
                {busyAction === "save-offer"
                  ? "Saving..."
                  : offerDraft.id
                    ? "Update Offer"
                    : "Create Offer"}
              </button>
              <button
                type="button"
                onClick={() => setOfferDraft(createOfferDraft(selectedBusinessId))}
                className="rounded-xl border border-white/10 px-3 py-2 text-sm transition hover:bg-white/5"
              >
                Reset
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="admin-card space-y-3 p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] opacity-70">Inventory Ledger</p>
              <h3 className="text-lg font-semibold">Active and draft local buy routes</h3>
            </div>
            <p className="text-sm opacity-70">{inventoryItems.length} items</p>
          </div>

          {loading ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm opacity-75">
              Loading commerce inventory...
            </div>
          ) : inventoryItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 p-4 text-sm opacity-75">
              No inventory exists for this business yet.
            </div>
          ) : (
            inventoryItems.map((item) => {
              const isLowStock =
                item.lowStockThreshold !== null &&
                item.quantityOnHand <= item.lowStockThreshold;

              return (
                <article key={item.id} className="admin-surface rounded-xl p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                          {item.isActive ? "Active" : "Inactive"}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                          {money(item.priceCents)}
                        </span>
                        {item.offerCount > 0 ? (
                          <span className="rounded-full border border-sky-400/30 bg-sky-500/10 px-2 py-1">
                            {item.offerCount} linked offer{item.offerCount === 1 ? "" : "s"}
                          </span>
                        ) : null}
                        {isLowStock ? (
                          <span className="rounded-full border border-rose-400/30 bg-rose-500/10 px-2 py-1">
                            Low stock
                          </span>
                        ) : null}
                      </div>
                      <h4 className="text-base font-semibold">{item.name}</h4>
                      <p className="text-sm opacity-75">
                        {item.productSlug ? (
                          <Link
                            href={`/products/${item.productSlug}`}
                            className="underline decoration-white/20 underline-offset-4 hover:decoration-white/60"
                          >
                            {item.productName}
                          </Link>
                        ) : (
                          item.productName || "No canonical product linked"
                        )}
                        {item.unitLabel ? ` · ${item.unitLabel}` : ""}
                        {item.category ? ` · ${item.category}` : ""}
                      </p>
                    </div>

                    <div className="grid gap-2 text-sm md:text-right">
                      <div>
                        <p className="opacity-70">On hand</p>
                        <p className="font-medium">{item.quantityOnHand}</p>
                      </div>
                      <div>
                        <p className="opacity-70">Updated</p>
                        <p className="font-medium">{localDate(item.updatedAt)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setInventoryDraft(inventoryDraftFromRecord(item))}
                      className="rounded-xl border border-white/10 px-3 py-2 text-sm transition hover:bg-white/5"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleInventory(item)}
                      className="rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm transition hover:bg-amber-300/20"
                      disabled={busyAction === `toggle-inventory-${item.id}`}
                    >
                      {item.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteInventory(item)}
                      className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-sm transition hover:bg-rose-500/20"
                      disabled={busyAction === `delete-inventory-${item.id}`}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>

        <div className="admin-card space-y-3 p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] opacity-70">Offer Ledger</p>
              <h3 className="text-lg font-semibold">Live conversion surfaces for shoppers</h3>
            </div>
            <p className="text-sm opacity-70">{offers.length} offers</p>
          </div>

          {loading ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm opacity-75">
              Loading offer surfaces...
            </div>
          ) : offers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 p-4 text-sm opacity-75">
              No offers exist for this business yet.
            </div>
          ) : (
            offers.map((offer) => (
              <article key={offer.id} className="admin-surface rounded-xl p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                        {offer.status}
                      </span>
                      {offer.featured ? (
                        <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-1">
                          Featured
                        </span>
                      ) : null}
                      {offer.badgeText ? (
                        <span className="rounded-full border border-sky-400/30 bg-sky-500/10 px-2 py-1">
                          {offer.badgeText}
                        </span>
                      ) : null}
                    </div>
                    <h4 className="text-base font-semibold">{offer.title}</h4>
                    <p className="text-sm opacity-75">
                      {offer.productSlug ? (
                        <Link
                          href={`/products/${offer.productSlug}`}
                          className="underline decoration-white/20 underline-offset-4 hover:decoration-white/60"
                        >
                          {offer.productName}
                        </Link>
                      ) : (
                        offer.productName || "No canonical product linked"
                      )}
                      {offer.inventoryItemName ? ` · ${offer.inventoryItemName}` : ""}
                    </p>
                  </div>

                  <div className="grid gap-2 text-sm md:text-right">
                    <div>
                      <p className="opacity-70">Offer price</p>
                      <p className="font-medium">{money(offer.discountPriceCents)}</p>
                    </div>
                    <div>
                      <p className="opacity-70">Window</p>
                      <p className="font-medium">
                        {offer.startsAt ? localDate(offer.startsAt) : "Now"} to{" "}
                        {offer.endsAt ? localDate(offer.endsAt) : "Open"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setOfferDraft(offerDraftFromRecord(offer))}
                    className="rounded-xl border border-white/10 px-3 py-2 text-sm transition hover:bg-white/5"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggleOfferStatus(offer)}
                    className="rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm transition hover:bg-amber-300/20"
                    disabled={busyAction === `toggle-offer-${offer.id}`}
                  >
                    {offer.status === "LIVE" ? "Pause" : "Set Live"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteOffer(offer)}
                    className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-sm transition hover:bg-rose-500/20"
                    disabled={busyAction === `delete-offer-${offer.id}`}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
