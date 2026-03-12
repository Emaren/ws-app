"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { BusinessTerminalEditorPanels } from "./BusinessTerminalEditorPanels";
import { BusinessTerminalLedgerPanels } from "./BusinessTerminalLedgerPanels";
import { BusinessTerminalOverviewPanels } from "./BusinessTerminalOverviewPanels";
import {
  createInventoryForm,
  createOfferForm,
  createPricingPreviewForm,
  isOfferLiveNow,
  optionalInt,
  parseIsoMs,
  requestJson,
  requiredInt,
  toIsoDate,
  toLocalDateTimeInput,
  type BusinessRecord,
  type DynamicPricingQuote,
  type InventoryFormState,
  type InventoryItemRecord,
  type OfferFormState,
  type OfferRecord,
  type PricingPreviewFormState,
  type StorePricingSnapshot,
} from "./businessTerminalSupport";

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
  const [inventoryForm, setInventoryForm] = useState<InventoryFormState>(createInventoryForm(""));
  const [offerForm, setOfferForm] = useState<OfferFormState>(createOfferForm(""));
  const [pricingPreviewForm, setPricingPreviewForm] = useState<PricingPreviewFormState>(
    createPricingPreviewForm(""),
  );
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

  const storePricingSnapshots = useMemo<StorePricingSnapshot[]>(() => {
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
      setInventoryForm((prev) => (prev.id ? prev : createInventoryForm(nextBusinessId)));
      setOfferForm((prev) => (prev.id ? prev : createOfferForm(nextBusinessId)));
      setPricingPreviewForm((prev) => {
        const sameBusiness = prev.businessId === nextBusinessId;
        const hasValidInventory =
          sameBusiness &&
          inventoryData.some(
            (item) => item.businessId === nextBusinessId && item.id === prev.inventoryItemId,
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

    setInventoryForm((prev) => (prev.id ? prev : { ...prev, businessId: selectedBusinessId }));
    setOfferForm((prev) => (prev.id ? prev : { ...prev, businessId: selectedBusinessId }));
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

  async function submitInventory(event: FormEvent<HTMLFormElement>) {
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
        quantityOnHand: requiredInt(inventoryForm.quantityOnHand, "Quantity on hand"),
        lowStockThreshold: optionalInt(inventoryForm.lowStockThreshold, "Low stock threshold"),
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
      lowStockThreshold: item.lowStockThreshold === null ? "" : String(item.lowStockThreshold),
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
      setNotice(`${item.name} ${item.isActive ? "disabled" : "enabled"} successfully.`);
      await loadData(selectedBusinessId);
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : String(toggleError));
    } finally {
      setBusyAction(null);
    }
  }

  async function submitOffer(event: FormEvent<HTMLFormElement>) {
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
        discountPriceCents: optionalInt(offerForm.discountPriceCents, "Discount price"),
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
      discountPriceCents: offer.discountPriceCents === null ? "" : String(offer.discountPriceCents),
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

  async function submitPricingPreview(event: FormEvent<HTMLFormElement>) {
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

      const asOf = toIsoDate(pricingPreviewForm.asOf, "As-of") ?? new Date(nowMs).toISOString();
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
      <BusinessTerminalOverviewPanels
        businesses={businesses}
        selectedBusinessId={selectedBusinessId}
        onSelectBusiness={setSelectedBusinessId}
        loading={loading}
        busyAction={busyAction}
        pricingPreviewBusy={pricingPreviewBusy}
        error={error}
        notice={notice}
        onReload={() => loadData(selectedBusinessId)}
        storePricingSnapshots={storePricingSnapshots}
        nowMs={nowMs}
        inventoryById={inventoryById}
        onSubmitPricingPreview={submitPricingPreview}
        pricingPreviewForm={pricingPreviewForm}
        setPricingPreviewForm={setPricingPreviewForm}
        scopedInventory={scopedInventory}
        pricingPreview={pricingPreview}
        onPreviewInventoryItem={previewInventoryItem}
      />

      <BusinessTerminalEditorPanels
        selectedBusinessId={selectedBusinessId}
        inventoryForm={inventoryForm}
        setInventoryForm={setInventoryForm}
        offerForm={offerForm}
        setOfferForm={setOfferForm}
        scopedInventory={scopedInventory}
        busyAction={busyAction}
        loading={loading}
        pricingPreviewBusy={pricingPreviewBusy}
        onSubmitInventory={submitInventory}
        onSubmitOffer={submitOffer}
        onClearInventoryEdit={() => setInventoryForm(createInventoryForm(selectedBusinessId))}
        onClearOfferEdit={() => setOfferForm(createOfferForm(selectedBusinessId))}
      />

      <BusinessTerminalLedgerPanels
        scopedInventory={scopedInventory}
        scopedOffers={scopedOffers}
        inventoryById={inventoryById}
        nowMs={nowMs}
        busyAction={busyAction}
        onEditInventory={editInventory}
        onPreviewInventoryItem={previewInventoryItem}
        onToggleInventory={toggleInventory}
        onDeleteInventory={deleteInventory}
        onEditOffer={editOffer}
        onToggleOffer={toggleOffer}
        onDeleteOffer={deleteOffer}
      />
    </section>
  );
}
