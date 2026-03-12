import Link from "next/link";
import type { Dispatch, FormEventHandler, SetStateAction } from "react";
import {
  OFFER_STATUSES,
  type BusinessRecord,
  type InventoryDraft,
  type InventoryRecord,
  type OfferDraft,
  type OverviewResponse,
  type ProductRecord,
  type StoreProfileDraft,
} from "./commerceConsoleTypes";

type CommerceStudioPanelsProps = {
  selectedBusinessId: string;
  selectedBusiness: BusinessRecord | null;
  selectionSummary: OverviewResponse["selectionSummary"] | undefined;
  storeDraft: StoreProfileDraft;
  setStoreDraft: Dispatch<SetStateAction<StoreProfileDraft>>;
  onSaveStoreProfile: FormEventHandler<HTMLFormElement>;
  onResetStoreProfile: () => void;
  inventoryDraft: InventoryDraft;
  setInventoryDraft: Dispatch<SetStateAction<InventoryDraft>>;
  onSaveInventory: FormEventHandler<HTMLFormElement>;
  onResetInventory: () => void;
  offerDraft: OfferDraft;
  setOfferDraft: Dispatch<SetStateAction<OfferDraft>>;
  onSaveOffer: FormEventHandler<HTMLFormElement>;
  onResetOffer: () => void;
  busyAction: string | null;
  products: ProductRecord[];
  productById: Map<string, ProductRecord>;
  inventoryOptions: InventoryRecord[];
};

export function CommerceStudioPanels({
  selectedBusinessId,
  selectedBusiness,
  selectionSummary,
  storeDraft,
  setStoreDraft,
  onSaveStoreProfile,
  onResetStoreProfile,
  inventoryDraft,
  setInventoryDraft,
  onSaveInventory,
  onResetInventory,
  offerDraft,
  setOfferDraft,
  onSaveOffer,
  onResetOffer,
  busyAction,
  products,
  productById,
  inventoryOptions,
}: CommerceStudioPanelsProps) {
  return (
    <div className="grid items-start gap-4 xl:grid-cols-[1.15fr_1fr]">
      <div id="store-profile" className="admin-card scroll-mt-28 space-y-4 p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] opacity-70">Selected Store</p>
            <h3 className="text-xl font-semibold break-words">
              {selectedBusiness?.storeProfile?.displayName ||
                selectedBusiness?.name ||
                "No business selected"}
            </h3>
            <p className="text-sm opacity-75 break-words">
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

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="admin-surface min-w-0 rounded-xl p-3">
            <p className="text-xs uppercase tracking-wide opacity-70">Active items</p>
            <p className="mt-1 text-xl font-semibold">
              {selectionSummary?.activeInventoryCount ?? 0}
            </p>
          </div>
          <div className="admin-surface min-w-0 rounded-xl p-3">
            <p className="text-xs uppercase tracking-wide opacity-70">Low stock</p>
            <p className="mt-1 text-xl font-semibold">{selectionSummary?.lowStockCount ?? 0}</p>
          </div>
          <div className="admin-surface min-w-0 rounded-xl p-3">
            <p className="text-xs uppercase tracking-wide opacity-70">Live offers</p>
            <p className="mt-1 text-xl font-semibold">{selectionSummary?.liveOfferCount ?? 0}</p>
          </div>
          <div className="admin-surface min-w-0 rounded-xl p-3">
            <p className="text-xs uppercase tracking-wide opacity-70">Featured offers</p>
            <p className="mt-1 text-xl font-semibold">
              {selectionSummary?.featuredOfferCount ?? 0}
            </p>
          </div>
        </div>

        <form onSubmit={onSaveStoreProfile} className="space-y-4">
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
              onClick={onResetStoreProfile}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm transition hover:bg-white/5"
              disabled={!selectedBusinessId}
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      <div className="grid gap-4">
        <form
          id="inventory-studio"
          onSubmit={onSaveInventory}
          className="admin-card scroll-mt-28 space-y-4 p-4 md:p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.2em] opacity-70">Inventory Studio</p>
              <h3 className="text-lg font-semibold">
                {inventoryDraft.id ? "Edit inventory item" : "Create inventory item"}
              </h3>
            </div>
            <button
              type="button"
              onClick={onResetInventory}
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
              onClick={onResetInventory}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm transition hover:bg-white/5"
            >
              Reset
            </button>
          </div>
        </form>

        <form
          id="offer-studio"
          onSubmit={onSaveOffer}
          className="admin-card scroll-mt-28 space-y-4 p-4 md:p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.2em] opacity-70">Offer Studio</p>
              <h3 className="text-lg font-semibold">
                {offerDraft.id ? "Edit live offer" : "Create live offer"}
              </h3>
            </div>
            <button
              type="button"
              onClick={onResetOffer}
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
              onClick={onResetOffer}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm transition hover:bg-white/5"
            >
              Reset
            </button>
          </div>
        </form>

        <div className="admin-card space-y-3 p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.2em] opacity-70">Operator Shortcuts</p>
              <h3 className="text-lg font-semibold">Fast paths for store activation</h3>
            </div>
            <span className="text-xs opacity-70">
              {selectedBusiness ? selectedBusiness.name : "Select a business"}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="#store-profile"
              className="admin-surface rounded-xl px-4 py-3 transition hover:bg-white/10"
            >
              <p className="text-sm font-semibold">Store setup</p>
              <p className="mt-1 text-sm opacity-75">
                Brand, delivery radius, notification rail, and regional details.
              </p>
            </Link>
            <Link
              href="#inventory-studio"
              className="admin-surface rounded-xl px-4 py-3 transition hover:bg-white/10"
            >
              <p className="text-sm font-semibold">Inventory routing</p>
              <p className="mt-1 text-sm opacity-75">
                Add local-buy items, stock controls, and pricing for the store.
              </p>
            </Link>
            <Link
              href="#offer-studio"
              className="admin-surface rounded-xl px-4 py-3 transition hover:bg-white/10"
            >
              <p className="text-sm font-semibold">Offer surfaces</p>
              <p className="mt-1 text-sm opacity-75">
                Launch live shopper offers, windows, badges, and featured placement.
              </p>
            </Link>
            <Link
              href="#inventory-ledger"
              className="admin-surface rounded-xl px-4 py-3 transition hover:bg-white/10"
            >
              <p className="text-sm font-semibold">Ledger review</p>
              <p className="mt-1 text-sm opacity-75">
                Audit what is live, low on stock, linked to products, or due for cleanup.
              </p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
