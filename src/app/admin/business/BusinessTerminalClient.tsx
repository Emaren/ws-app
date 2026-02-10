"use client";

import { useEffect, useMemo, useState } from "react";

type BusinessRecord = {
  id: string;
  slug: string;
  name: string;
  status: string;
};

type InventoryItemRecord = {
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

type OfferRecord = {
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

type DynamicPricingSource =
  | "MANUAL_OVERRIDE"
  | "OFFER"
  | "PRICING_RULE"
  | "EXPIRY_CLEARANCE"
  | "STOCK_THRESHOLD"
  | "BASE";

type DynamicPricingAdjustment = {
  source: DynamicPricingSource;
  sourceId: string | null;
  label: string;
  unitPriceCents: number;
  selected: boolean;
};

type DynamicPricingQuote = {
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

type InventoryFormState = {
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

type OfferFormState = {
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

type PricingPreviewFormState = {
  businessId: string;
  inventoryItemId: string;
  quantity: string;
  asOf: string;
  manualOverrideCents: string;
};

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
      (payload && typeof payload.message === "string" && payload.message) ||
      `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}

function centsToDollars(cents: number | null): string {
  if (cents === null || !Number.isFinite(cents)) return "-";
  return `$${(cents / 100).toFixed(2)}`;
}

function toLocalDateTimeInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIsoDate(localValue: string, label: string): string | null {
  const trimmed = localValue.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (!Number.isFinite(parsed.getTime())) {
    throw new Error(`${label} must be a valid date/time`);
  }
  return parsed.toISOString();
}

function optionalInt(raw: string, label: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} must be an integer`);
  }
  return parsed;
}

function requiredInt(raw: string, label: string): number {
  const parsed = optionalInt(raw, label);
  if (parsed === null) {
    throw new Error(`${label} is required`);
  }
  return parsed;
}

function parseIsoMs(iso: string | null): number | null {
  if (!iso) return null;
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function formatWindow(startsAt: string | null, endsAt: string | null): string {
  if (!startsAt && !endsAt) return "No window";
  const startLabel = startsAt ? new Date(startsAt).toLocaleString() : "now";
  const endLabel = endsAt ? new Date(endsAt).toLocaleString() : "open";
  return `${startLabel} -> ${endLabel}`;
}

function remainingUnitsCount(unitsTotal: number | null, unitsClaimed: number): number | null {
  if (unitsTotal === null) return null;
  return Math.max(unitsTotal - unitsClaimed, 0);
}

function remainingUnits(unitsTotal: number | null, unitsClaimed: number): string {
  const units = remainingUnitsCount(unitsTotal, unitsClaimed);
  return units === null ? "n/a" : String(units);
}

function claimPercent(unitsTotal: number | null, unitsClaimed: number): number | null {
  if (unitsTotal === null || unitsTotal <= 0) return null;
  const bounded = Math.max(0, Math.min(unitsClaimed, unitsTotal));
  return Math.round((bounded / unitsTotal) * 100);
}

function isWithinWindow(nowMs: number, startsAt: string | null, endsAt: string | null): boolean {
  const startMs = parseIsoMs(startsAt);
  if (startMs !== null && nowMs < startMs) return false;

  const endMs = parseIsoMs(endsAt);
  if (endMs !== null && nowMs > endMs) return false;

  return true;
}

function isOfferLiveNow(offer: OfferRecord, nowMs: number): boolean {
  if (offer.status !== "LIVE") return false;
  if (!isWithinWindow(nowMs, offer.startsAt, offer.endsAt)) return false;
  if (offer.unitsTotal !== null && offer.unitsClaimed >= offer.unitsTotal) return false;
  return true;
}

function formatDuration(totalSecondsInput: number): string {
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

function countdownLabel(startsAt: string | null, endsAt: string | null, nowMs: number): string {
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

function expiryCountdown(expiresAt: string | null, nowMs: number): string {
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

function createInventoryForm(businessId: string): InventoryFormState {
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

function createOfferForm(businessId: string): OfferFormState {
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

function createPricingPreviewForm(
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

export default function BusinessTerminalClient() {
  const [businesses, setBusinesses] = useState<BusinessRecord[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItemRecord[]>([]);
  const [offers, setOffers] = useState<OfferRecord[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [pricingPreviewBusy, setPricingPreviewBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [inventoryForm, setInventoryForm] = useState<InventoryFormState>(
    createInventoryForm(""),
  );
  const [offerForm, setOfferForm] = useState<OfferFormState>(createOfferForm(""));
  const [pricingPreviewForm, setPricingPreviewForm] =
    useState<PricingPreviewFormState>(createPricingPreviewForm(""));
  const [pricingPreview, setPricingPreview] = useState<DynamicPricingQuote | null>(null);

  const inventoryById = useMemo(
    () => new Map(inventoryItems.map((item) => [item.id, item])),
    [inventoryItems],
  );

  const scopedInventory = useMemo(() => {
    if (!selectedBusinessId) return [];
    return inventoryItems.filter((item) => item.businessId === selectedBusinessId);
  }, [inventoryItems, selectedBusinessId]);

  const scopedOffers = useMemo(() => {
    if (!selectedBusinessId) return [];
    return offers.filter((offer) => offer.businessId === selectedBusinessId);
  }, [offers, selectedBusinessId]);

  const storePricingSnapshots = useMemo(() => {
    return businesses.map((business) => {
      const liveOffers = offers.filter(
        (offer) => offer.businessId === business.id && isOfferLiveNow(offer, nowMs),
      );
      const featuredLiveOffers = liveOffers.filter((offer) => offer.featured).length;

      let bestLiveOffer: OfferRecord | null = null;
      for (const offer of liveOffers) {
        if (offer.discountPriceCents === null) continue;
        if (!bestLiveOffer) {
          bestLiveOffer = offer;
          continue;
        }
        const bestPrice = bestLiveOffer.discountPriceCents;
        if (bestPrice === null || offer.discountPriceCents < bestPrice) {
          bestLiveOffer = offer;
        }
      }

      let nextEndingAt: string | null = null;
      let nextEndingTitle: string | null = null;
      for (const offer of liveOffers) {
        const endMs = parseIsoMs(offer.endsAt);
        if (endMs === null || endMs <= nowMs) continue;
        const currentNextEndMs = parseIsoMs(nextEndingAt);
        if (currentNextEndMs === null || endMs < currentNextEndMs) {
          nextEndingAt = offer.endsAt;
          nextEndingTitle = offer.title;
        }
      }

      return {
        business,
        liveOffers,
        featuredLiveOffers,
        bestLiveOffer,
        nextEndingAt,
        nextEndingTitle,
      };
    });
  }, [businesses, offers, nowMs]);

  async function loadData(preferredBusinessId?: string) {
    setLoading(true);
    setError(null);
    try {
      const [businessData, inventoryData, offerData] = await Promise.all([
        requestJson<BusinessRecord[]>("/api/ops/businesses"),
        requestJson<InventoryItemRecord[]>("/api/ops/inventory-items"),
        requestJson<OfferRecord[]>("/api/ops/offers"),
      ]);

      setBusinesses(businessData);
      setInventoryItems(inventoryData);
      setOffers(offerData);

      const nextBusinessId =
        preferredBusinessId && businessData.some((biz) => biz.id === preferredBusinessId)
          ? preferredBusinessId
          : businessData[0]?.id ?? "";

      const firstInventoryForBusiness =
        inventoryData.find((item) => item.businessId === nextBusinessId)?.id ?? "";

      setSelectedBusinessId(nextBusinessId);
      setInventoryForm((prev) =>
        prev.id ? prev : createInventoryForm(nextBusinessId),
      );
      setOfferForm((prev) => (prev.id ? prev : createOfferForm(nextBusinessId)));
      setPricingPreviewForm((prev) => {
        const sameBusiness = prev.businessId === nextBusinessId;
        const hasValidInventory =
          sameBusiness &&
          inventoryData.some(
            (item) =>
              item.businessId === nextBusinessId && item.id === prev.inventoryItemId,
          );
        if (hasValidInventory) {
          return prev;
        }
        return createPricingPreviewForm(nextBusinessId, firstInventoryForBusiness);
      });
      setPricingPreview(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!selectedBusinessId) return;

    const firstInventoryForBusiness =
      inventoryItems.find((item) => item.businessId === selectedBusinessId)?.id ?? "";

    setInventoryForm((prev) =>
      prev.id ? prev : { ...prev, businessId: selectedBusinessId },
    );
    setOfferForm((prev) =>
      prev.id ? prev : { ...prev, businessId: selectedBusinessId },
    );
    setPricingPreviewForm((prev) => {
      const hasValidInventory = inventoryItems.some(
        (item) => item.businessId === selectedBusinessId && item.id === prev.inventoryItemId,
      );
      if (prev.businessId === selectedBusinessId && hasValidInventory) {
        return prev;
      }
      return createPricingPreviewForm(selectedBusinessId, firstInventoryForBusiness);
    });
    setPricingPreview(null);
  }, [selectedBusinessId, inventoryItems]);

  async function submitInventory(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    try {
      if (!inventoryForm.businessId) {
        throw new Error("Select a business first");
      }

      const payload = {
        businessId: inventoryForm.businessId,
        sku: inventoryForm.sku.trim() || null,
        name: inventoryForm.name.trim(),
        priceCents: requiredInt(inventoryForm.priceCents, "Price (cents)"),
        compareAtCents: optionalInt(inventoryForm.compareAtCents, "Compare-at price"),
        quantityOnHand: requiredInt(
          inventoryForm.quantityOnHand,
          "Quantity on hand",
        ),
        lowStockThreshold: optionalInt(
          inventoryForm.lowStockThreshold,
          "Low stock threshold",
        ),
        expiresAt: toIsoDate(inventoryForm.expiresAt, "Expiry"),
        isActive: inventoryForm.isActive,
      };

      if (!payload.name) {
        throw new Error("Inventory name is required");
      }

      setBusyAction("inventory-submit");
      if (inventoryForm.id) {
        await requestJson(`/api/ops/inventory-items/${inventoryForm.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setNotice("Inventory item updated.");
      } else {
        await requestJson("/api/ops/inventory-items", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setNotice("Inventory item created.");
      }

      await loadData(payload.businessId);
      setInventoryForm(createInventoryForm(payload.businessId));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : String(submitError));
    } finally {
      setBusyAction(null);
    }
  }

  function editInventory(item: InventoryItemRecord) {
    setInventoryForm({
      id: item.id,
      businessId: item.businessId,
      sku: item.sku ?? "",
      name: item.name,
      priceCents: String(item.priceCents),
      compareAtCents: item.compareAtCents === null ? "" : String(item.compareAtCents),
      quantityOnHand: String(item.quantityOnHand),
      lowStockThreshold:
        item.lowStockThreshold === null ? "" : String(item.lowStockThreshold),
      expiresAt: toLocalDateTimeInput(item.expiresAt),
      isActive: item.isActive,
    });
    setSelectedBusinessId(item.businessId);
  }

  async function deleteInventory(item: InventoryItemRecord) {
    if (!confirm(`Delete inventory item "${item.name}"?`)) return;
    setError(null);
    setNotice(null);
    setBusyAction(`inventory-delete-${item.id}`);
    try {
      await requestJson(`/api/ops/inventory-items/${item.id}`, {
        method: "DELETE",
      });
      setNotice(`Deleted inventory item "${item.name}".`);
      await loadData(selectedBusinessId);
      if (inventoryForm.id === item.id) {
        setInventoryForm(createInventoryForm(selectedBusinessId));
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : String(deleteError));
    } finally {
      setBusyAction(null);
    }
  }

  async function toggleInventory(item: InventoryItemRecord) {
    setError(null);
    setNotice(null);
    setBusyAction(`inventory-toggle-${item.id}`);
    try {
      await requestJson(`/api/ops/inventory-items/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      setNotice(
        `${item.name} ${item.isActive ? "disabled" : "enabled"} successfully.`,
      );
      await loadData(selectedBusinessId);
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : String(toggleError));
    } finally {
      setBusyAction(null);
    }
  }

  async function submitOffer(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    try {
      if (!offerForm.businessId) {
        throw new Error("Select a business first");
      }
      if (!offerForm.title.trim()) {
        throw new Error("Offer title is required");
      }

      const payload = {
        businessId: offerForm.businessId,
        inventoryItemId: offerForm.inventoryItemId || null,
        title: offerForm.title.trim(),
        description: offerForm.description.trim() || null,
        status: offerForm.status,
        discountPriceCents: optionalInt(
          offerForm.discountPriceCents,
          "Discount price",
        ),
        startsAt: toIsoDate(offerForm.startsAt, "Start"),
        endsAt: toIsoDate(offerForm.endsAt, "End"),
        unitsTotal: optionalInt(offerForm.unitsTotal, "Units total"),
        unitsClaimed: requiredInt(offerForm.unitsClaimed, "Units claimed"),
        featured: offerForm.featured,
        ctaUrl: offerForm.ctaUrl.trim() || null,
      };

      setBusyAction("offer-submit");
      if (offerForm.id) {
        await requestJson(`/api/ops/offers/${offerForm.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setNotice("Offer updated.");
      } else {
        await requestJson("/api/ops/offers", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setNotice("Offer created.");
      }

      await loadData(payload.businessId);
      setOfferForm(createOfferForm(payload.businessId));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : String(submitError));
    } finally {
      setBusyAction(null);
    }
  }

  function editOffer(offer: OfferRecord) {
    setOfferForm({
      id: offer.id,
      businessId: offer.businessId,
      inventoryItemId: offer.inventoryItemId ?? "",
      title: offer.title,
      description: offer.description ?? "",
      status: (offer.status as OfferFormState["status"]) ?? "DRAFT",
      discountPriceCents:
        offer.discountPriceCents === null ? "" : String(offer.discountPriceCents),
      startsAt: toLocalDateTimeInput(offer.startsAt),
      endsAt: toLocalDateTimeInput(offer.endsAt),
      unitsTotal: offer.unitsTotal === null ? "" : String(offer.unitsTotal),
      unitsClaimed: String(offer.unitsClaimed),
      featured: offer.featured,
      ctaUrl: offer.ctaUrl ?? "",
    });
    setSelectedBusinessId(offer.businessId);
  }

  async function deleteOffer(offer: OfferRecord) {
    if (!confirm(`Delete offer "${offer.title}"?`)) return;
    setError(null);
    setNotice(null);
    setBusyAction(`offer-delete-${offer.id}`);
    try {
      await requestJson(`/api/ops/offers/${offer.id}`, {
        method: "DELETE",
      });
      setNotice(`Deleted offer "${offer.title}".`);
      await loadData(selectedBusinessId);
      if (offerForm.id === offer.id) {
        setOfferForm(createOfferForm(selectedBusinessId));
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : String(deleteError));
    } finally {
      setBusyAction(null);
    }
  }

  async function toggleOffer(offer: OfferRecord) {
    const nextStatus = offer.status === "LIVE" ? "PAUSED" : "LIVE";
    setError(null);
    setNotice(null);
    setBusyAction(`offer-toggle-${offer.id}`);
    try {
      await requestJson(`/api/ops/offers/${offer.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      setNotice(`${offer.title} is now ${nextStatus}.`);
      await loadData(selectedBusinessId);
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : String(toggleError));
    } finally {
      setBusyAction(null);
    }
  }

  async function submitPricingPreview(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    try {
      if (!pricingPreviewForm.businessId) {
        throw new Error("Select a business first");
      }
      if (!pricingPreviewForm.inventoryItemId) {
        throw new Error("Select an inventory item to preview");
      }

      const quantity = requiredInt(pricingPreviewForm.quantity, "Quantity");
      if (quantity < 1) {
        throw new Error("Quantity must be at least 1");
      }

      const asOf =
        toIsoDate(pricingPreviewForm.asOf, "As-of") ?? new Date(nowMs).toISOString();
      const manualOverrideCents = optionalInt(
        pricingPreviewForm.manualOverrideCents,
        "Manual override",
      );
      if (manualOverrideCents !== null && manualOverrideCents < 0) {
        throw new Error("Manual override must be zero or positive");
      }

      const payload: Record<string, unknown> = {
        businessId: pricingPreviewForm.businessId,
        inventoryItemId: pricingPreviewForm.inventoryItemId,
        quantity,
        asOf,
      };
      if (manualOverrideCents !== null) {
        payload.manualOverrideCents = manualOverrideCents;
      }

      setPricingPreviewBusy(true);
      const quote = await requestJson<DynamicPricingQuote>("/api/ops/pricing/quote", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setPricingPreview(quote);
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : String(previewError));
    } finally {
      setPricingPreviewBusy(false);
    }
  }

  function previewInventoryItem(item: InventoryItemRecord) {
    setSelectedBusinessId(item.businessId);
    setPricingPreviewForm((prev) => ({
      ...prev,
      businessId: item.businessId,
      inventoryItemId: item.id,
    }));
    setPricingPreview(null);
  }

  return (
    <section className="space-y-4">
      <div className="admin-card p-4 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold md:text-2xl">
              Inventory and Offer Management
            </h2>
            <p className="mt-1 text-sm opacity-75">
              Manage stock, discount windows, pricing previews, remaining units, and availability.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={selectedBusinessId}
              onChange={(event) => setSelectedBusinessId(event.target.value)}
              className="admin-surface rounded-xl px-3 py-2 text-sm"
              disabled={businesses.length === 0 || loading}
            >
              {businesses.length === 0 ? (
                <option value="">No businesses found</option>
              ) : null}
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name} ({business.status})
                </option>
              ))}
            </select>
            <button
              onClick={() => void loadData(selectedBusinessId)}
              className="rounded-xl border px-3 py-2 text-sm transition hover:bg-white/5 disabled:opacity-60"
              disabled={loading || busyAction !== null || pricingPreviewBusy}
            >
              {loading ? "Loading..." : "Reload"}
            </button>
          </div>
        </div>

        {error ? (
          <p className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="mt-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            {notice}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="admin-card space-y-3 p-4 md:p-5">
          <h3 className="text-base font-semibold">Store Pricing Snapshot</h3>
          {storePricingSnapshots.length === 0 ? (
            <p className="text-sm opacity-70">No stores found.</p>
          ) : null}
          <ul className="grid gap-3 sm:grid-cols-2">
            {storePricingSnapshots.map((snapshot) => {
              const bestLiveInventory = snapshot.bestLiveOffer?.inventoryItemId
                ? inventoryById.get(snapshot.bestLiveOffer.inventoryItemId)
                : null;
              const bestCompare =
                bestLiveInventory?.compareAtCents ?? bestLiveInventory?.priceCents ?? null;

              return (
                <li
                  key={snapshot.business.id}
                  className={`admin-surface rounded-xl p-3 ${
                    snapshot.business.id === selectedBusinessId
                      ? "ring-1 ring-amber-300/60"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{snapshot.business.name}</p>
                    <span className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] opacity-80">
                      {snapshot.business.status}
                    </span>
                  </div>

                  <p className="mt-1 text-xs opacity-70">
                    Live offers: {snapshot.liveOffers.length} · Featured: {snapshot.featuredLiveOffers}
                  </p>

                  {snapshot.bestLiveOffer ? (
                    <p className="mt-1 text-xs opacity-80">
                      Best live: {centsToDollars(snapshot.bestLiveOffer.discountPriceCents)}
                      {bestCompare !== null ? ` (base ${centsToDollars(bestCompare)})` : ""}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs opacity-60">No live discount currently.</p>
                  )}

                  {snapshot.nextEndingAt ? (
                    <p className="mt-1 text-xs opacity-80">
                      {snapshot.nextEndingTitle}: {countdownLabel(null, snapshot.nextEndingAt, nowMs)}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs opacity-60">No timed expiry currently.</p>
                  )}

                  <button
                    onClick={() => setSelectedBusinessId(snapshot.business.id)}
                    className="mt-3 w-full rounded-lg border px-2 py-1.5 text-xs transition hover:bg-white/5"
                    type="button"
                  >
                    {snapshot.business.id === selectedBusinessId ? "Selected" : "Manage"}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <form
          onSubmit={submitPricingPreview}
          className="admin-card space-y-4 p-4 md:p-5"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold">Dynamic Pricing Preview</h3>
            <button
              type="button"
              onClick={() =>
                setPricingPreviewForm((prev) => ({
                  ...prev,
                  asOf: toLocalDateTimeInput(new Date(nowMs).toISOString()),
                }))
              }
              className="rounded-xl border px-3 py-1.5 text-xs transition hover:bg-white/5"
            >
              Use Current Time
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm sm:col-span-2">
              <span>Inventory item</span>
              <select
                value={pricingPreviewForm.inventoryItemId}
                onChange={(event) =>
                  setPricingPreviewForm((prev) => ({
                    ...prev,
                    businessId: selectedBusinessId,
                    inventoryItemId: event.target.value,
                  }))
                }
                className="admin-surface w-full rounded-xl px-3 py-2"
                disabled={scopedInventory.length === 0}
              >
                {scopedInventory.length === 0 ? (
                  <option value="">No inventory available</option>
                ) : null}
                {scopedInventory.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span>Quantity</span>
              <input
                inputMode="numeric"
                value={pricingPreviewForm.quantity}
                onChange={(event) =>
                  setPricingPreviewForm((prev) => ({
                    ...prev,
                    quantity: event.target.value,
                  }))
                }
                className="admin-surface w-full rounded-xl px-3 py-2"
                placeholder="1"
                required
              />
            </label>

            <label className="space-y-1 text-sm">
              <span>Manual override (cents)</span>
              <input
                inputMode="numeric"
                value={pricingPreviewForm.manualOverrideCents}
                onChange={(event) =>
                  setPricingPreviewForm((prev) => ({
                    ...prev,
                    manualOverrideCents: event.target.value,
                  }))
                }
                className="admin-surface w-full rounded-xl px-3 py-2"
                placeholder="optional"
              />
            </label>

            <label className="space-y-1 text-sm sm:col-span-2">
              <span>As-of date/time</span>
              <input
                type="datetime-local"
                value={pricingPreviewForm.asOf}
                onChange={(event) =>
                  setPricingPreviewForm((prev) => ({
                    ...prev,
                    asOf: event.target.value,
                  }))
                }
                className="admin-surface w-full rounded-xl px-3 py-2"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={pricingPreviewBusy || loading || scopedInventory.length === 0}
            className="w-full rounded-xl border border-amber-300/40 bg-amber-200/20 px-4 py-2 text-sm font-medium transition hover:bg-amber-200/30 disabled:opacity-60"
          >
            {pricingPreviewBusy ? "Previewing..." : "Preview Dynamic Price"}
          </button>

          {pricingPreview ? (
            <div className="space-y-3 rounded-xl border border-white/15 p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    pricingPreview.purchasable
                      ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                      : "border border-red-500/40 bg-red-500/10 text-red-200"
                  }`}
                >
                  {pricingPreview.purchasable ? "Purchasable" : `Blocked: ${pricingPreview.blockedReason ?? "UNKNOWN"}`}
                </span>
                <span className="rounded-full border border-white/15 px-2 py-0.5 text-xs opacity-80">
                  Source: {pricingPreview.selectedSource ?? "-"}
                </span>
              </div>

              <p className="text-xs opacity-80">
                Base {centsToDollars(pricingPreview.baseUnitPriceCents)}
                {" -> "}
                Unit {centsToDollars(pricingPreview.finalUnitPriceCents)}
                {" -> "}
                Total {centsToDollars(pricingPreview.finalTotalCents)}
              </p>

              <p className="text-xs opacity-80">
                Available units: {pricingPreview.availableUnits} · Expiry: {" "}
                {expiryCountdown(pricingPreview.expiresAt, nowMs)}
              </p>

              <ul className="space-y-1">
                {pricingPreview.adjustments.map((adjustment, index) => (
                  <li
                    key={`${adjustment.source}-${adjustment.sourceId ?? "none"}-${index}`}
                    className={`flex items-center justify-between rounded-lg border px-2 py-1 text-xs ${
                      adjustment.selected
                        ? "border-amber-300/60 bg-amber-200/10"
                        : "border-white/10"
                    }`}
                  >
                    <span className="opacity-85">{adjustment.label}</span>
                    <span>{centsToDollars(adjustment.unitPriceCents)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs opacity-60">
              Pick an item and preview the computed unit price before you publish changes.
            </p>
          )}
        </form>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <form
          onSubmit={submitInventory}
          className="admin-card space-y-4 p-4 md:p-5"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold">Inventory CRUD</h3>
            {inventoryForm.id ? (
              <button
                type="button"
                onClick={() => setInventoryForm(createInventoryForm(selectedBusinessId))}
                className="rounded-xl border px-3 py-1.5 text-xs transition hover:bg-white/5"
              >
                Clear Edit
              </button>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span>Name</span>
              <input
                value={inventoryForm.name}
                onChange={(event) =>
                  setInventoryForm((prev) => ({ ...prev, name: event.target.value }))
                }
                className="admin-surface w-full rounded-xl px-3 py-2"
                placeholder="Avalon Chocolate Milk"
                required
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>SKU</span>
              <input
                value={inventoryForm.sku}
                onChange={(event) =>
                  setInventoryForm((prev) => ({ ...prev, sku: event.target.value }))
                }
                className="admin-surface w-full rounded-xl px-3 py-2"
                placeholder="AVALON-CHOC-1L"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>Price (cents)</span>
              <input
                inputMode="numeric"
                value={inventoryForm.priceCents}
                onChange={(event) =>
                  setInventoryForm((prev) => ({
                    ...prev,
                    priceCents: event.target.value,
                  }))
                }
                className="admin-surface w-full rounded-xl px-3 py-2"
                placeholder="799"
                required
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>Compare-at (cents)</span>
              <input
                inputMode="numeric"
                value={inventoryForm.compareAtCents}
                onChange={(event) =>
                  setInventoryForm((prev) => ({
                    ...prev,
                    compareAtCents: event.target.value,
                  }))
                }
                className="admin-surface w-full rounded-xl px-3 py-2"
                placeholder="949"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>Stock units</span>
              <input
                inputMode="numeric"
                value={inventoryForm.quantityOnHand}
                onChange={(event) =>
                  setInventoryForm((prev) => ({
                    ...prev,
                    quantityOnHand: event.target.value,
                  }))
                }
                className="admin-surface w-full rounded-xl px-3 py-2"
                placeholder="20"
                required
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>Low-stock threshold</span>
              <input
                inputMode="numeric"
                value={inventoryForm.lowStockThreshold}
                onChange={(event) =>
                  setInventoryForm((prev) => ({
                    ...prev,
                    lowStockThreshold: event.target.value,
                  }))
                }
                className="admin-surface w-full rounded-xl px-3 py-2"
                placeholder="5"
              />
            </label>
            <label className="space-y-1 text-sm sm:col-span-2">
              <span>Expiry date/time</span>
              <input
                type="datetime-local"
                value={inventoryForm.expiresAt}
                onChange={(event) =>
                  setInventoryForm((prev) => ({
                    ...prev,
                    expiresAt: event.target.value,
                  }))
                }
                className="admin-surface w-full rounded-xl px-3 py-2"
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={inventoryForm.isActive}
              onChange={(event) =>
                setInventoryForm((prev) => ({ ...prev, isActive: event.target.checked }))
              }
            />
            Inventory enabled
          </label>

          <button
            type="submit"
            disabled={busyAction !== null || loading || pricingPreviewBusy}
            className="w-full rounded-xl border border-amber-300/40 bg-amber-200/20 px-4 py-2 text-sm font-medium transition hover:bg-amber-200/30 disabled:opacity-60"
          >
            {busyAction === "inventory-submit"
              ? "Saving..."
              : inventoryForm.id
                ? "Update Inventory Item"
                : "Create Inventory Item"}
          </button>
        </form>

        <form onSubmit={submitOffer} className="admin-card space-y-4 p-4 md:p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold">Offer CRUD</h3>
            {offerForm.id ? (
              <button
                type="button"
                onClick={() => setOfferForm(createOfferForm(selectedBusinessId))}
                className="rounded-xl border px-3 py-1.5 text-xs transition hover:bg-white/5"
              >
                Clear Edit
              </button>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm sm:col-span-2">
              <span>Title</span>
              <input
                value={offerForm.title}
                onChange={(event) =>
                  setOfferForm((prev) => ({ ...prev, title: event.target.value }))
                }
                className="admin-surface w-full rounded-xl px-3 py-2"
                placeholder="Launch Deal"
                required
              />
            </label>
            <label className="space-y-1 text-sm sm:col-span-2">
              <span>Description</span>
              <textarea
                value={offerForm.description}
                onChange={(event) =>
                  setOfferForm((prev) => ({ ...prev, description: event.target.value }))
                }
                className="admin-surface min-h-[80px] w-full rounded-xl px-3 py-2"
                placeholder="Offer details for customers"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>Inventory link</span>
              <select
                value={offerForm.inventoryItemId}
                onChange={(event) =>
                  setOfferForm((prev) => ({
                    ...prev,
                    inventoryItemId: event.target.value,
                  }))
                }
                className="admin-surface w-full rounded-xl px-3 py-2"
              >
                <option value="">None</option>
                {scopedInventory.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span>Status</span>
              <select
                value={offerForm.status}
                onChange={(event) =>
                  setOfferForm((prev) => ({
                    ...prev,
                    status: event.target.value as OfferFormState["status"],
                  }))
                }
                className="admin-surface w-full rounded-xl px-3 py-2"
              >
                <option value="DRAFT">DRAFT</option>
                <option value="LIVE">LIVE</option>
                <option value="PAUSED">PAUSED</option>
                <option value="EXPIRED">EXPIRED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span>Discount (cents)</span>
              <input
                inputMode="numeric"
                value={offerForm.discountPriceCents}
                onChange={(event) =>
                  setOfferForm((prev) => ({
                    ...prev,
                    discountPriceCents: event.target.value,
                  }))
                }
                className="admin-surface w-full rounded-xl px-3 py-2"
                placeholder="699"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>Total units</span>
              <input
                inputMode="numeric"
                value={offerForm.unitsTotal}
                onChange={(event) =>
                  setOfferForm((prev) => ({ ...prev, unitsTotal: event.target.value }))
                }
                className="admin-surface w-full rounded-xl px-3 py-2"
                placeholder="120"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>Claimed units</span>
              <input
                inputMode="numeric"
                value={offerForm.unitsClaimed}
                onChange={(event) =>
                  setOfferForm((prev) => ({
                    ...prev,
                    unitsClaimed: event.target.value,
                  }))
                }
                className="admin-surface w-full rounded-xl px-3 py-2"
                placeholder="0"
                required
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>Starts</span>
              <input
                type="datetime-local"
                value={offerForm.startsAt}
                onChange={(event) =>
                  setOfferForm((prev) => ({ ...prev, startsAt: event.target.value }))
                }
                className="admin-surface w-full rounded-xl px-3 py-2"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>Ends</span>
              <input
                type="datetime-local"
                value={offerForm.endsAt}
                onChange={(event) =>
                  setOfferForm((prev) => ({ ...prev, endsAt: event.target.value }))
                }
                className="admin-surface w-full rounded-xl px-3 py-2"
              />
            </label>
            <label className="space-y-1 text-sm sm:col-span-2">
              <span>CTA URL</span>
              <input
                value={offerForm.ctaUrl}
                onChange={(event) =>
                  setOfferForm((prev) => ({ ...prev, ctaUrl: event.target.value }))
                }
                className="admin-surface w-full rounded-xl px-3 py-2"
                placeholder="https://wheatandstone.ca/articles/..."
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={offerForm.featured}
              onChange={(event) =>
                setOfferForm((prev) => ({ ...prev, featured: event.target.checked }))
              }
            />
            Featured offer
          </label>

          <button
            type="submit"
            disabled={busyAction !== null || loading || pricingPreviewBusy}
            className="w-full rounded-xl border border-amber-300/40 bg-amber-200/20 px-4 py-2 text-sm font-medium transition hover:bg-amber-200/30 disabled:opacity-60"
          >
            {busyAction === "offer-submit"
              ? "Saving..."
              : offerForm.id
                ? "Update Offer"
                : "Create Offer"}
          </button>
        </form>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="admin-card space-y-3 p-4 md:p-5">
          <h3 className="text-base font-semibold">Inventory List</h3>
          {scopedInventory.length === 0 ? (
            <p className="text-sm opacity-70">No inventory items for this business yet.</p>
          ) : null}
          <ul className="space-y-3">
            {scopedInventory.map((item) => {
              const availableUnits = Math.max(item.quantityOnHand - item.reservedQuantity, 0);
              const expiresMs = parseIsoMs(item.expiresAt);
              const isExpired = expiresMs !== null && nowMs >= expiresMs;

              return (
                <li key={item.id} className="admin-surface rounded-xl p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{item.name}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        item.isActive && !isExpired
                          ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                          : "border border-amber-500/40 bg-amber-500/10 text-amber-200"
                      }`}
                    >
                      {item.isActive && !isExpired ? "Enabled" : "Limited"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs opacity-70">
                    SKU: {item.sku ?? "-"} · Price: {centsToDollars(item.priceCents)} ·
                    Available: {availableUnits}
                  </p>
                  <p className="mt-1 text-xs opacity-70">
                    Compare-at: {centsToDollars(item.compareAtCents)} · Low-stock: {" "}
                    {item.lowStockThreshold ?? "-"} · {expiryCountdown(item.expiresAt, nowMs)}
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <button
                      onClick={() => editInventory(item)}
                      className="rounded-lg border px-2 py-1.5 text-xs transition hover:bg-white/5"
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => previewInventoryItem(item)}
                      className="rounded-lg border px-2 py-1.5 text-xs transition hover:bg-white/5"
                      type="button"
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => void toggleInventory(item)}
                      disabled={busyAction === `inventory-toggle-${item.id}`}
                      className="rounded-lg border px-2 py-1.5 text-xs transition hover:bg-white/5 disabled:opacity-60"
                      type="button"
                    >
                      {item.isActive ? "Disable" : "Enable"}
                    </button>
                    <button
                      onClick={() => void deleteInventory(item)}
                      disabled={busyAction === `inventory-delete-${item.id}`}
                      className="col-span-3 rounded-lg border border-red-500/60 px-2 py-1.5 text-xs text-red-400 transition hover:bg-red-500/10 disabled:opacity-60"
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="admin-card space-y-3 p-4 md:p-5">
          <h3 className="text-base font-semibold">Offer List</h3>
          {scopedOffers.length === 0 ? (
            <p className="text-sm opacity-70">No offers for this business yet.</p>
          ) : null}
          <ul className="space-y-3">
            {scopedOffers.map((offer) => {
              const linkedInventory = offer.inventoryItemId
                ? inventoryById.get(offer.inventoryItemId)
                : null;
              const unitsLeft = remainingUnitsCount(offer.unitsTotal, offer.unitsClaimed);
              const claimedPercent = claimPercent(offer.unitsTotal, offer.unitsClaimed);
              const timerLabel = countdownLabel(offer.startsAt, offer.endsAt, nowMs);

              return (
                <li key={offer.id} className="admin-surface rounded-xl p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{offer.title}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        isOfferLiveNow(offer, nowMs)
                          ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                          : "border border-amber-500/40 bg-amber-500/10 text-amber-200"
                      }`}
                    >
                      {offer.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs opacity-70">
                    Discount: {centsToDollars(offer.discountPriceCents)}
                    {linkedInventory
                      ? ` · Base: ${centsToDollars(linkedInventory.priceCents)}`
                      : ""} · Window: {formatWindow(offer.startsAt, offer.endsAt)}
                  </p>
                  <p className="mt-1 text-xs opacity-70">
                    Timer: {timerLabel} · Remaining units: {remainingUnits(offer.unitsTotal, offer.unitsClaimed)} ·
                    Featured: {offer.featured ? "Yes" : "No"}
                  </p>

                  {offer.unitsTotal !== null ? (
                    <div className="mt-2 space-y-1">
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full bg-amber-300/70"
                          style={{
                            width: `${Math.max(
                              0,
                              Math.min(claimedPercent ?? 0, 100),
                            )}%`,
                          }}
                        />
                      </div>
                      <p className="text-[11px] opacity-65">
                        {unitsLeft ?? 0} of {offer.unitsTotal} units left
                      </p>
                    </div>
                  ) : null}

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => editOffer(offer)}
                      className="rounded-lg border px-2 py-1.5 text-xs transition hover:bg-white/5"
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => void toggleOffer(offer)}
                      disabled={busyAction === `offer-toggle-${offer.id}`}
                      className="rounded-lg border px-2 py-1.5 text-xs transition hover:bg-white/5 disabled:opacity-60"
                      type="button"
                    >
                      {offer.status === "LIVE" ? "Disable" : "Enable"}
                    </button>
                    <button
                      onClick={() => void deleteOffer(offer)}
                      disabled={busyAction === `offer-delete-${offer.id}`}
                      className="col-span-2 rounded-lg border border-red-500/60 px-2 py-1.5 text-xs text-red-400 transition hover:bg-red-500/10 disabled:opacity-60"
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
