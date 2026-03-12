"use client";

import {
  centsToDollars,
  claimPercent,
  countdownLabel,
  expiryCountdown,
  formatWindow,
  isOfferLiveNow,
  parseIsoMs,
  remainingUnits,
  remainingUnitsCount,
  type InventoryItemRecord,
  type OfferRecord,
} from "./businessTerminalSupport";

type BusinessTerminalLedgerPanelsProps = {
  scopedInventory: InventoryItemRecord[];
  scopedOffers: OfferRecord[];
  inventoryById: Map<string, InventoryItemRecord>;
  nowMs: number;
  busyAction: string | null;
  onEditInventory: (item: InventoryItemRecord) => void;
  onPreviewInventoryItem: (item: InventoryItemRecord) => void;
  onToggleInventory: (item: InventoryItemRecord) => void | Promise<void>;
  onDeleteInventory: (item: InventoryItemRecord) => void | Promise<void>;
  onEditOffer: (offer: OfferRecord) => void;
  onToggleOffer: (offer: OfferRecord) => void | Promise<void>;
  onDeleteOffer: (offer: OfferRecord) => void | Promise<void>;
};

export function BusinessTerminalLedgerPanels({
  scopedInventory,
  scopedOffers,
  inventoryById,
  nowMs,
  busyAction,
  onEditInventory,
  onPreviewInventoryItem,
  onToggleInventory,
  onDeleteInventory,
  onEditOffer,
  onToggleOffer,
  onDeleteOffer,
}: BusinessTerminalLedgerPanelsProps) {
  return (
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
                  SKU: {item.sku ?? "-"} · Price: {centsToDollars(item.priceCents)} · Available:{" "}
                  {availableUnits}
                </p>
                <p className="mt-1 text-xs opacity-70">
                  Compare-at: {centsToDollars(item.compareAtCents)} · Low-stock:{" "}
                  {item.lowStockThreshold ?? "-"} · {expiryCountdown(item.expiresAt, nowMs)}
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button
                    onClick={() => onEditInventory(item)}
                    className="rounded-lg border px-2 py-1.5 text-xs transition hover:bg-white/5"
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onPreviewInventoryItem(item)}
                    className="rounded-lg border px-2 py-1.5 text-xs transition hover:bg-white/5"
                    type="button"
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => void onToggleInventory(item)}
                    disabled={busyAction === `inventory-toggle-${item.id}`}
                    className="rounded-lg border px-2 py-1.5 text-xs transition hover:bg-white/5 disabled:opacity-60"
                    type="button"
                  >
                    {item.isActive ? "Disable" : "Enable"}
                  </button>
                  <button
                    onClick={() => void onDeleteInventory(item)}
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
        {scopedOffers.length === 0 ? <p className="text-sm opacity-70">No offers for this business yet.</p> : null}
        <ul className="space-y-3">
          {scopedOffers.map((offer) => {
            const linkedInventory = offer.inventoryItemId ? inventoryById.get(offer.inventoryItemId) : null;
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
                  {linkedInventory ? ` · Base: ${centsToDollars(linkedInventory.priceCents)}` : ""} · Window:{" "}
                  {formatWindow(offer.startsAt, offer.endsAt)}
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
                        style={{ width: `${Math.max(0, Math.min(claimedPercent ?? 0, 100))}%` }}
                      />
                    </div>
                    <p className="text-[11px] opacity-65">
                      {unitsLeft ?? 0} of {offer.unitsTotal} units left
                    </p>
                  </div>
                ) : null}

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onEditOffer(offer)}
                    className="rounded-lg border px-2 py-1.5 text-xs transition hover:bg-white/5"
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => void onToggleOffer(offer)}
                    disabled={busyAction === `offer-toggle-${offer.id}`}
                    className="rounded-lg border px-2 py-1.5 text-xs transition hover:bg-white/5 disabled:opacity-60"
                    type="button"
                  >
                    {offer.status === "LIVE" ? "Disable" : "Enable"}
                  </button>
                  <button
                    onClick={() => void onDeleteOffer(offer)}
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
  );
}
