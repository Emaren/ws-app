"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import type {
  InventoryFormState,
  InventoryItemRecord,
  OfferFormState,
} from "./businessTerminalSupport";

type BusinessTerminalEditorPanelsProps = {
  selectedBusinessId: string;
  inventoryForm: InventoryFormState;
  setInventoryForm: Dispatch<SetStateAction<InventoryFormState>>;
  offerForm: OfferFormState;
  setOfferForm: Dispatch<SetStateAction<OfferFormState>>;
  scopedInventory: InventoryItemRecord[];
  busyAction: string | null;
  loading: boolean;
  pricingPreviewBusy: boolean;
  onSubmitInventory: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onSubmitOffer: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onClearInventoryEdit: () => void;
  onClearOfferEdit: () => void;
};

export function BusinessTerminalEditorPanels({
  selectedBusinessId,
  inventoryForm,
  setInventoryForm,
  offerForm,
  setOfferForm,
  scopedInventory,
  busyAction,
  loading,
  pricingPreviewBusy,
  onSubmitInventory,
  onSubmitOffer,
  onClearInventoryEdit,
  onClearOfferEdit,
}: BusinessTerminalEditorPanelsProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <form onSubmit={onSubmitInventory} className="admin-card space-y-4 p-4 md:p-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold">Inventory CRUD</h3>
          {inventoryForm.id ? (
            <button
              type="button"
              onClick={onClearInventoryEdit}
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
              onChange={(event) => setInventoryForm((prev) => ({ ...prev, name: event.target.value }))}
              className="admin-surface w-full rounded-xl px-3 py-2"
              placeholder="Avalon Chocolate Milk"
              required
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>SKU</span>
            <input
              value={inventoryForm.sku}
              onChange={(event) => setInventoryForm((prev) => ({ ...prev, sku: event.target.value }))}
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
            onChange={(event) => setInventoryForm((prev) => ({ ...prev, isActive: event.target.checked }))}
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

      <form onSubmit={onSubmitOffer} className="admin-card space-y-4 p-4 md:p-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold">Offer CRUD</h3>
          {offerForm.id ? (
            <button
              type="button"
              onClick={onClearOfferEdit}
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
              onChange={(event) => setOfferForm((prev) => ({ ...prev, title: event.target.value }))}
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
              onChange={(event) => setOfferForm((prev) => ({ ...prev, unitsTotal: event.target.value }))}
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
              onChange={(event) => setOfferForm((prev) => ({ ...prev, startsAt: event.target.value }))}
              className="admin-surface w-full rounded-xl px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Ends</span>
            <input
              type="datetime-local"
              value={offerForm.endsAt}
              onChange={(event) => setOfferForm((prev) => ({ ...prev, endsAt: event.target.value }))}
              className="admin-surface w-full rounded-xl px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span>CTA URL</span>
            <input
              value={offerForm.ctaUrl}
              onChange={(event) => setOfferForm((prev) => ({ ...prev, ctaUrl: event.target.value }))}
              className="admin-surface w-full rounded-xl px-3 py-2"
              placeholder="https://wheatandstone.ca/articles/..."
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={offerForm.featured}
            onChange={(event) => setOfferForm((prev) => ({ ...prev, featured: event.target.checked }))}
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
  );
}
