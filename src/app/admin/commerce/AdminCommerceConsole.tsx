"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { buildCommerceActivationRail } from "@/lib/commerceActivationRail";
import { CommerceConsoleControlTower } from "./CommerceConsoleControlTower";
import { CommerceLedgerPanels } from "./CommerceLedgerPanels";
import { CommerceRecentActivityPanels } from "./CommerceRecentActivityPanels";
import { CommerceStudioPanels } from "./CommerceStudioPanels";
import {
  buildCommerceActivationActionLinks,
  buildCommerceNetworkStats,
  buildCommerceSelectedStoreStats,
  formatTokenAmount,
  money,
} from "./commerceConsolePresentation";
import {
  createInventoryDraft,
  createOfferDraft,
  createStoreProfileDraft,
  inventoryDraftFromRecord,
  offerDraftFromRecord,
  toDateTimeLocalValue,
  type InventoryDraft,
  type InventoryRecord,
  type OfferDraft,
  type OfferRecord,
  type OverviewResponse,
  type StoreProfileDraft,
} from "./commerceConsoleTypes";

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
  const activationRail = useMemo(
    () =>
      buildCommerceActivationRail({
        businessName: selectedBusiness?.name ?? null,
        storeProfile: selectedBusiness?.storeProfile,
        selectionSummary,
        selectedActivitySummary,
    }),
    [selectedActivitySummary, selectedBusiness?.name, selectedBusiness?.storeProfile, selectionSummary],
  );
  const activationActionLinks = buildCommerceActivationActionLinks(activationRail);
  const networkStats = buildCommerceNetworkStats(networkSummary);
  const selectedStoreStats = buildCommerceSelectedStoreStats(selectedActivitySummary);

  return (
    <div className="space-y-4">
      <CommerceConsoleControlTower
        scopeMode={overview?.scope.mode ?? "GLOBAL"}
        generatedAt={overview?.generatedAt ?? null}
        selectedBusinessId={selectedBusinessId}
        businesses={businesses.map((business) => ({ id: business.id, name: business.name }))}
        loading={loading}
        onBusinessChange={(businessId) => void handleBusinessChange(businessId)}
        error={error}
        notice={notice}
        networkStats={networkStats}
        selectedBusinessName={selectedBusiness?.name || "No business selected"}
        activityWindowDays={activityWindow?.days ?? 30}
        trackedDemandLabel={money(selectedActivitySummary?.trackedDemandCents ?? null)}
        selectedStoreStats={selectedStoreStats}
        buyerRewardsLabel={`$STONE ${formatTokenAmount(selectedActivitySummary?.rewardTotals.STONE ?? 0)}`}
        contributorRewardsLabel={`$WHEAT ${formatTokenAmount(selectedActivitySummary?.rewardTotals.WHEAT ?? 0)}`}
        reserveConversionRate={selectedActivitySummary?.leadToReserveRate ?? 0}
        fulfillmentConversionRate={selectedActivitySummary?.leadToFulfillmentRate ?? 0}
        avgLeadValueLabel={money(selectedActivitySummary?.avgLeadValueCents ?? null)}
        businessPerformance={businessPerformance}
        activationRail={activationRail}
        activationActionLinks={activationActionLinks}
      />

      <CommerceRecentActivityPanels
        selectedBusinessName={selectedBusiness?.name ?? null}
        recentLeads={recentLeads}
        recentRewards={recentRewards}
      />

      <CommerceStudioPanels
        selectedBusinessId={selectedBusinessId}
        selectedBusiness={selectedBusiness}
        selectionSummary={selectionSummary}
        storeDraft={storeDraft}
        setStoreDraft={setStoreDraft}
        onSaveStoreProfile={saveStoreProfile}
        onResetStoreProfile={() => setStoreDraft(createStoreProfileDraft(selectedBusiness?.storeProfile))}
        inventoryDraft={inventoryDraft}
        setInventoryDraft={setInventoryDraft}
        onSaveInventory={saveInventory}
        onResetInventory={() => setInventoryDraft(createInventoryDraft(selectedBusinessId))}
        offerDraft={offerDraft}
        setOfferDraft={setOfferDraft}
        onSaveOffer={saveOffer}
        onResetOffer={() => setOfferDraft(createOfferDraft(selectedBusinessId))}
        busyAction={busyAction}
        products={products}
        productById={productById}
        inventoryOptions={inventoryOptions}
      />

      <CommerceLedgerPanels
        loading={loading}
        inventoryItems={inventoryItems}
        offers={offers}
        busyAction={busyAction}
        onEditInventory={(item) => setInventoryDraft(inventoryDraftFromRecord(item))}
        onToggleInventory={(item) => void toggleInventory(item)}
        onDeleteInventory={(item) => void deleteInventory(item)}
        onEditOffer={(offer) => setOfferDraft(offerDraftFromRecord(offer))}
        onToggleOfferStatus={(offer) => void toggleOfferStatus(offer)}
        onDeleteOffer={(offer) => void deleteOffer(offer)}
      />
    </div>
  );
}
