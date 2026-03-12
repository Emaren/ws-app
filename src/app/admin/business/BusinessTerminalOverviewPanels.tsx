"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import {
  centsToDollars,
  countdownLabel,
  expiryCountdown,
  type BusinessRecord,
  type DynamicPricingQuote,
  type InventoryItemRecord,
  type PricingPreviewFormState,
  type StorePricingSnapshot,
  toLocalDateTimeInput,
} from "./businessTerminalSupport";

type BusinessTerminalOverviewPanelsProps = {
  businesses: BusinessRecord[];
  selectedBusinessId: string;
  onSelectBusiness: (businessId: string) => void;
  loading: boolean;
  busyAction: string | null;
  pricingPreviewBusy: boolean;
  error: string | null;
  notice: string | null;
  onReload: () => void | Promise<void>;
  storePricingSnapshots: StorePricingSnapshot[];
  nowMs: number;
  inventoryById: Map<string, InventoryItemRecord>;
  onSubmitPricingPreview: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  pricingPreviewForm: PricingPreviewFormState;
  setPricingPreviewForm: Dispatch<SetStateAction<PricingPreviewFormState>>;
  scopedInventory: InventoryItemRecord[];
  pricingPreview: DynamicPricingQuote | null;
  onPreviewInventoryItem: (item: InventoryItemRecord) => void;
};

export function BusinessTerminalOverviewPanels({
  businesses,
  selectedBusinessId,
  onSelectBusiness,
  loading,
  busyAction,
  pricingPreviewBusy,
  error,
  notice,
  onReload,
  storePricingSnapshots,
  nowMs,
  inventoryById,
  onSubmitPricingPreview,
  pricingPreviewForm,
  setPricingPreviewForm,
  scopedInventory,
  pricingPreview,
  onPreviewInventoryItem,
}: BusinessTerminalOverviewPanelsProps) {
  return (
    <>
      <div className="admin-card p-4 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold md:text-2xl">Inventory and Offer Management</h2>
            <p className="mt-1 text-sm opacity-75">
              Manage stock, discount windows, pricing previews, remaining units, and availability.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={selectedBusinessId}
              onChange={(event) => onSelectBusiness(event.target.value)}
              className="admin-surface rounded-xl px-3 py-2 text-sm"
              disabled={businesses.length === 0 || loading}
            >
              {businesses.length === 0 ? <option value="">No businesses found</option> : null}
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name} ({business.status})
                </option>
              ))}
            </select>
            <button
              onClick={() => void onReload()}
              className="rounded-xl border px-3 py-2 text-sm transition hover:bg-white/5 disabled:opacity-60"
              disabled={loading || busyAction !== null || pricingPreviewBusy}
              type="button"
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
          {storePricingSnapshots.length === 0 ? <p className="text-sm opacity-70">No stores found.</p> : null}
          <ul className="grid gap-3 sm:grid-cols-2">
            {storePricingSnapshots.map((snapshot) => {
              const bestLiveInventory = snapshot.bestLiveOffer?.inventoryItemId
                ? inventoryById.get(snapshot.bestLiveOffer.inventoryItemId)
                : null;
              const bestCompare = bestLiveInventory?.compareAtCents ?? bestLiveInventory?.priceCents ?? null;

              return (
                <li
                  key={snapshot.business.id}
                  className={`admin-surface rounded-xl p-3 ${
                    snapshot.business.id === selectedBusinessId ? "ring-1 ring-amber-300/60" : ""
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
                    onClick={() => onSelectBusiness(snapshot.business.id)}
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

        <form onSubmit={onSubmitPricingPreview} className="admin-card space-y-4 p-4 md:p-5">
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
                {scopedInventory.length === 0 ? <option value="">No inventory available</option> : null}
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
                  {pricingPreview.purchasable
                    ? "Purchasable"
                    : `Blocked: ${pricingPreview.blockedReason ?? "UNKNOWN"}`}
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
                Available units: {pricingPreview.availableUnits} · Expiry:{" "}
                {expiryCountdown(pricingPreview.expiresAt, nowMs)}
              </p>

              <ul className="space-y-1">
                {pricingPreview.adjustments.map((adjustment, index) => (
                  <li
                    key={`${adjustment.source}-${adjustment.sourceId ?? "none"}-${index}`}
                    className={`flex items-center justify-between rounded-lg border px-2 py-1 text-xs ${
                      adjustment.selected ? "border-amber-300/60 bg-amber-200/10" : "border-white/10"
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
    </>
  );
}
