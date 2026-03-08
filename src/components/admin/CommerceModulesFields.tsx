"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ARTICLE_COMMERCE_PLACEMENTS,
  ARTICLE_COMMERCE_SIDES,
  ARTICLE_COMMERCE_SIZE_PRESETS,
  createArticleCommerceModuleDraft,
  type ArticleCommerceModuleDraft,
  type ArticleCommercePlacement,
} from "@/lib/articleCommerce";

type BusinessOption = {
  id: string;
  slug: string;
  name: string;
  isVerified: boolean;
  storeProfile: {
    displayName: string | null;
    logoUrl: string | null;
    heroImageUrl: string | null;
    city: string | null;
    region: string | null;
    deliveryEnabled: boolean;
  } | null;
};

type OfferOption = {
  id: string;
  businessId: string;
  title: string;
  status: string;
  featured: boolean;
  discountPriceCents: number | null;
  productName: string | null;
};

type InventoryOption = {
  id: string;
  businessId: string;
  name: string;
  priceCents: number;
  imageUrl: string | null;
  productName: string | null;
};

type OptionsResponse = {
  businesses: BusinessOption[];
  offers: OfferOption[];
  inventoryItems: InventoryOption[];
};

type Props = {
  value: ArticleCommerceModuleDraft[];
  onChange: (nextValue: ArticleCommerceModuleDraft[]) => void;
};

function formatMoney(cents: number | null): string {
  if (cents === null) return "n/a";
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(cents / 100);
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      <input
        className="admin-surface rounded-xl px-3 py-2"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      <textarea
        className="admin-surface min-h-[96px] rounded-xl px-3 py-2"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

export default function CommerceModulesFields({ value, onChange }: Props) {
  const [options, setOptions] = useState<OptionsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const response = await fetch("/api/article-commerce/options", {
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        });

        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(
            payload && typeof payload.message === "string"
              ? payload.message
              : `Failed to load commerce options (${response.status})`,
          );
        }

        if (!cancelled) {
          setOptions(payload as OptionsResponse);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : String(error));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  const businesses = options?.businesses ?? [];
  const offers = options?.offers ?? [];
  const inventoryItems = options?.inventoryItems ?? [];

  const businessById = useMemo(
    () => new Map(businesses.map((business) => [business.id, business])),
    [businesses],
  );
  const offerById = useMemo(
    () => new Map(offers.map((offer) => [offer.id, offer])),
    [offers],
  );
  const inventoryById = useMemo(
    () => new Map(inventoryItems.map((item) => [item.id, item])),
    [inventoryItems],
  );

  function updateModule(
    clientKey: string,
    updater:
      | Partial<ArticleCommerceModuleDraft>
      | ((current: ArticleCommerceModuleDraft) => Partial<ArticleCommerceModuleDraft>),
  ) {
    onChange(
      value.map((module) => {
        if (module.clientKey !== clientKey) {
          return module;
        }
        const patch = typeof updater === "function" ? updater(module) : updater;
        return { ...module, ...patch };
      }),
    );
  }

  function removeModule(clientKey: string) {
    onChange(value.filter((module) => module.clientKey !== clientKey));
  }

  function addModule(placement: ArticleCommercePlacement) {
    onChange([
      ...value,
      createArticleCommerceModuleDraft({
        placement,
        side: placement === "CHECKLIST_SPLIT" ? "LEFT" : "RIGHT",
        sizePreset: placement === "CHECKLIST_SPLIT" ? "COMPACT" : "FEATURE",
      }),
    ]);
  }

  return (
    <section className="space-y-4 rounded-2xl border border-neutral-800/80 bg-neutral-950/40 p-4 md:p-5">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Commerce Modules</h3>
        <p className="text-sm opacity-75">
          Attach premium store and offer spotlights to reusable page slots instead of
          hardcoding ads into article markup.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => addModule("AFTER_FIRST_HEADING")}
          className="rounded-xl border border-amber-300/40 bg-amber-200/10 px-4 py-2 text-sm font-medium transition hover:bg-amber-200/20"
        >
          Add Top Spotlight
        </button>
        <button
          type="button"
          onClick={() => addModule("CHECKLIST_SPLIT")}
          className="rounded-xl border border-neutral-700 px-4 py-2 text-sm font-medium transition hover:bg-neutral-900"
        >
          Add Checklist Spotlight
        </button>
      </div>

      {isLoading && <div className="text-sm opacity-70">Loading store and offer options...</div>}
      {loadError && (
        <div className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {loadError}
        </div>
      )}

      {value.length === 0 && (
        <div className="rounded-2xl border border-dashed border-neutral-700 px-4 py-6 text-sm opacity-70">
          No commerce modules yet. Add one to turn this review into a store-ready buying page.
        </div>
      )}

      <div className="space-y-4">
        {value.map((module, index) => {
          const selectedBusiness = module.businessId ? businessById.get(module.businessId) : null;
          const filteredOffers = module.businessId
            ? offers.filter((offer) => offer.businessId === module.businessId)
            : offers;
          const filteredInventory = module.businessId
            ? inventoryItems.filter((item) => item.businessId === module.businessId)
            : inventoryItems;

          return (
            <div
              key={module.clientKey}
              className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] opacity-55">
                    Commerce Module {index + 1}
                  </div>
                  <div className="text-base font-semibold">
                    {module.title || module.businessName || module.offerTitle || "Untitled spotlight"}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm opacity-80">
                    <input
                      type="checkbox"
                      checked={module.isEnabled}
                      onChange={(event) =>
                        updateModule(module.clientKey, { isEnabled: event.target.checked })
                      }
                    />
                    Enabled
                  </label>

                  <button
                    type="button"
                    onClick={() => removeModule(module.clientKey)}
                    className="rounded-xl border border-red-500/60 px-3 py-2 text-sm text-red-200 transition hover:bg-red-500/10"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium">Placement</span>
                  <select
                    className="admin-surface rounded-xl px-3 py-2"
                    value={module.placement}
                    onChange={(event) =>
                      updateModule(module.clientKey, {
                        placement: event.target.value as ArticleCommercePlacement,
                      })
                    }
                  >
                    {ARTICLE_COMMERCE_PLACEMENTS.map((placement) => (
                      <option key={placement} value={placement}>
                        {placement === "AFTER_FIRST_HEADING"
                          ? "After first heading"
                          : "Beside first checklist"}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium">Side</span>
                  <select
                    className="admin-surface rounded-xl px-3 py-2"
                    value={module.side}
                    onChange={(event) =>
                      updateModule(module.clientKey, {
                        side: event.target.value as ArticleCommerceModuleDraft["side"],
                      })
                    }
                  >
                    {ARTICLE_COMMERCE_SIDES.map((side) => (
                      <option key={side} value={side}>
                        {side === "LEFT" ? "Left" : "Right"}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium">Size</span>
                  <select
                    className="admin-surface rounded-xl px-3 py-2"
                    value={module.sizePreset}
                    onChange={(event) =>
                      updateModule(module.clientKey, {
                        sizePreset: event.target.value as ArticleCommerceModuleDraft["sizePreset"],
                      })
                    }
                  >
                    {ARTICLE_COMMERCE_SIZE_PRESETS.map((sizePreset) => (
                      <option key={sizePreset} value={sizePreset}>
                        {sizePreset === "FEATURE" ? "Feature" : "Compact"}
                      </option>
                    ))}
                  </select>
                </label>

                <TextInput
                  label="Sort Order"
                  value={module.sortOrder}
                  onChange={(nextValue) => updateModule(module.clientKey, { sortOrder: nextValue })}
                  placeholder={String(index)}
                />
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium">Business</span>
                  <select
                    className="admin-surface rounded-xl px-3 py-2"
                    value={module.businessId}
                    onChange={(event) => {
                      const nextBusinessId = event.target.value;
                      const business = nextBusinessId ? businessById.get(nextBusinessId) : null;
                      updateModule(module.clientKey, (current) => ({
                        businessId: nextBusinessId,
                        businessSlug: business?.slug ?? "",
                        businessName:
                          business?.storeProfile?.displayName || business?.name || current.businessName,
                        imageSrc:
                          current.imageSrc ||
                          business?.storeProfile?.logoUrl ||
                          business?.storeProfile?.heroImageUrl ||
                          "",
                        title:
                          current.title ||
                          business?.storeProfile?.displayName ||
                          business?.name ||
                          "",
                        offerId: business ? current.offerId : "",
                        inventoryItemId: business ? current.inventoryItemId : "",
                      }));
                    }}
                  >
                    <option value="">Manual / none</option>
                    {businesses.map((business) => {
                      const displayName = business.storeProfile?.displayName || business.name;
                      return (
                        <option key={business.id} value={business.id}>
                          {displayName}
                          {business.isVerified ? " • verified" : ""}
                        </option>
                      );
                    })}
                  </select>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium">Offer</span>
                  <select
                    className="admin-surface rounded-xl px-3 py-2"
                    value={module.offerId}
                    onChange={(event) => {
                      const nextOfferId = event.target.value;
                      const offer = nextOfferId ? offerById.get(nextOfferId) : null;
                      updateModule(module.clientKey, (current) => ({
                        offerId: nextOfferId,
                        offerTitle: offer?.title ?? "",
                        businessId: offer?.businessId ?? current.businessId,
                        title: current.title || offer?.title || "",
                        badgeText:
                          current.badgeText ||
                          (offer?.featured ? "Featured offer" : current.badgeText),
                      }));
                    }}
                  >
                    <option value="">None</option>
                    {filteredOffers.map((offer) => (
                      <option key={offer.id} value={offer.id}>
                        {offer.title}
                        {offer.productName ? ` • ${offer.productName}` : ""}
                        {" • "}
                        {offer.status}
                        {" • "}
                        {formatMoney(offer.discountPriceCents)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium">Inventory Item</span>
                  <select
                    className="admin-surface rounded-xl px-3 py-2"
                    value={module.inventoryItemId}
                    onChange={(event) => {
                      const nextInventoryId = event.target.value;
                      const inventoryItem = nextInventoryId ? inventoryById.get(nextInventoryId) : null;
                      updateModule(module.clientKey, (current) => ({
                        inventoryItemId: nextInventoryId,
                        inventoryItemName: inventoryItem?.name ?? "",
                        businessId: inventoryItem?.businessId ?? current.businessId,
                        imageSrc: current.imageSrc || inventoryItem?.imageUrl || "",
                      }));
                    }}
                  >
                    <option value="">None</option>
                    {filteredInventory.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                        {item.productName ? ` • ${item.productName}` : ""}
                        {" • "}
                        {formatMoney(item.priceCents)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <TextInput
                  label="Business Slug"
                  value={module.businessSlug}
                  onChange={(nextValue) => updateModule(module.clientKey, { businessSlug: nextValue })}
                  placeholder="homesteader-health"
                />
                <TextInput
                  label="Business Name"
                  value={module.businessName}
                  onChange={(nextValue) => updateModule(module.clientKey, { businessName: nextValue })}
                  placeholder={selectedBusiness?.storeProfile?.displayName || selectedBusiness?.name || "Homesteader Health"}
                />
                <TextInput
                  label="Offer Title"
                  value={module.offerTitle}
                  onChange={(nextValue) => updateModule(module.clientKey, { offerTitle: nextValue })}
                  placeholder="Organic dairy delivery special"
                />
                <TextInput
                  label="Inventory Item Name"
                  value={module.inventoryItemName}
                  onChange={(nextValue) =>
                    updateModule(module.clientKey, { inventoryItemName: nextValue })
                  }
                  placeholder="Avalon Organic Chocolate Milk"
                />
                <TextInput
                  label="Headline"
                  value={module.title}
                  onChange={(nextValue) => updateModule(module.clientKey, { title: nextValue })}
                  placeholder="Fresh local delivery"
                />
                <TextInput
                  label="Badge"
                  value={module.badgeText}
                  onChange={(nextValue) => updateModule(module.clientKey, { badgeText: nextValue })}
                  placeholder="Local spotlight"
                />
                <TextInput
                  label="CTA Caption"
                  value={module.caption}
                  onChange={(nextValue) => updateModule(module.clientKey, { caption: nextValue })}
                  placeholder="Click for delivery"
                />
                <TextInput
                  label="Image Path or URL"
                  value={module.imageSrc}
                  onChange={(nextValue) => updateModule(module.clientKey, { imageSrc: nextValue })}
                  placeholder="/hh.tight.h156.v3.png"
                />
                <TextInput
                  label="Image Alt"
                  value={module.imageAlt}
                  onChange={(nextValue) => updateModule(module.clientKey, { imageAlt: nextValue })}
                  placeholder="Delivery promo image"
                />
              </div>

              <TextArea
                label="Supporting Copy"
                value={module.body}
                onChange={(nextValue) => updateModule(module.clientKey, { body: nextValue })}
                placeholder="Tell the reader what this store or offer adds to the review experience."
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
