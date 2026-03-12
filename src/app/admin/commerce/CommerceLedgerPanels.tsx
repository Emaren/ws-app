import Link from "next/link";
import type { InventoryRecord, OfferRecord } from "./commerceConsoleTypes";
import { localDate, money } from "./commerceConsolePresentation";

type CommerceLedgerPanelsProps = {
  loading: boolean;
  inventoryItems: InventoryRecord[];
  offers: OfferRecord[];
  busyAction: string | null;
  onEditInventory: (item: InventoryRecord) => void;
  onToggleInventory: (item: InventoryRecord) => void | Promise<void>;
  onDeleteInventory: (item: InventoryRecord) => void | Promise<void>;
  onEditOffer: (offer: OfferRecord) => void;
  onToggleOfferStatus: (offer: OfferRecord) => void | Promise<void>;
  onDeleteOffer: (offer: OfferRecord) => void | Promise<void>;
};

export function CommerceLedgerPanels({
  loading,
  inventoryItems,
  offers,
  busyAction,
  onEditInventory,
  onToggleInventory,
  onDeleteInventory,
  onEditOffer,
  onToggleOfferStatus,
  onDeleteOffer,
}: CommerceLedgerPanelsProps) {
  return (
    <div className="grid items-start gap-4 xl:grid-cols-2">
      <div id="inventory-ledger" className="admin-card scroll-mt-28 space-y-3 p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] opacity-70">Inventory Ledger</p>
            <h3 className="mt-1 text-lg font-semibold">Active and draft local buy routes</h3>
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
              item.lowStockThreshold !== null && item.quantityOnHand <= item.lowStockThreshold;

            return (
              <article key={item.id} className="admin-surface rounded-xl p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 space-y-1">
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
                    <h4 className="text-base font-semibold break-words">{item.name}</h4>
                    <p className="text-sm opacity-75 break-words">
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

                  <div className="grid gap-2 text-sm md:min-w-[7rem] md:text-right">
                    <div>
                      <p className="opacity-70">On hand</p>
                      <p className="font-medium">{item.quantityOnHand}</p>
                    </div>
                    <div>
                      <p className="opacity-70">Updated</p>
                      <p className="font-medium break-words">{localDate(item.updatedAt)}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onEditInventory(item)}
                    className="rounded-xl border border-white/10 px-3 py-2 text-sm transition hover:bg-white/5"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void onToggleInventory(item)}
                    className="rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm transition hover:bg-amber-300/20"
                    disabled={busyAction === `toggle-inventory-${item.id}`}
                  >
                    {item.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void onDeleteInventory(item)}
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] opacity-70">Offer Ledger</p>
            <h3 className="mt-1 text-lg font-semibold">Live conversion surfaces for shoppers</h3>
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
                <div className="min-w-0 space-y-1">
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
                  <h4 className="text-base font-semibold break-words">{offer.title}</h4>
                  <p className="text-sm opacity-75 break-words">
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

                <div className="grid gap-2 text-sm md:min-w-[10rem] md:text-right">
                  <div>
                    <p className="opacity-70">Offer price</p>
                    <p className="font-medium">{money(offer.discountPriceCents)}</p>
                  </div>
                  <div>
                    <p className="opacity-70">Window</p>
                    <p className="font-medium break-words">
                      {offer.startsAt ? localDate(offer.startsAt) : "Now"} to{" "}
                      {offer.endsAt ? localDate(offer.endsAt) : "Open"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onEditOffer(offer)}
                  className="rounded-xl border border-white/10 px-3 py-2 text-sm transition hover:bg-white/5"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => void onToggleOfferStatus(offer)}
                  className="rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm transition hover:bg-amber-300/20"
                  disabled={busyAction === `toggle-offer-${offer.id}`}
                >
                  {offer.status === "LIVE" ? "Pause" : "Set Live"}
                </button>
                <button
                  type="button"
                  onClick={() => void onDeleteOffer(offer)}
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
  );
}
