import FloatAd from "./FloatAd";

export type ArticleCommerceRenderableModule = {
  id?: string | null;
  placement?: "AFTER_FIRST_HEADING" | "CHECKLIST_SPLIT" | string | null;
  businessId?: string | null;
  businessSlug?: string | null;
  businessName?: string | null;
  offerId?: string | null;
  offerTitle?: string | null;
  inventoryItemId?: string | null;
  inventoryItemName?: string | null;
  title?: string | null;
  badgeText?: string | null;
  body?: string | null;
  imageSrc?: string | null;
  imageAlt?: string | null;
  caption?: string | null;
  side?: "LEFT" | "RIGHT" | string | null;
  sizePreset?: "FEATURE" | "COMPACT" | string | null;
  business?: {
    slug?: string | null;
    name?: string | null;
    storeProfile?: {
      displayName?: string | null;
      logoUrl?: string | null;
      heroImageUrl?: string | null;
      city?: string | null;
      region?: string | null;
      deliveryEnabled?: boolean | null;
    } | null;
  } | null;
  offer?: {
    id?: string | null;
    title?: string | null;
    discountPriceCents?: number | null;
  } | null;
  inventoryItem?: {
    id?: string | null;
    name?: string | null;
    priceCents?: number | null;
    imageUrl?: string | null;
  } | null;
};

function formatMoney(cents: number | null | undefined): string | null {
  if (typeof cents !== "number" || !Number.isFinite(cents)) return null;
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(cents / 100);
}

function sizeProps(sizePreset: string | null | undefined) {
  if (sizePreset === "COMPACT") {
    return {
      w: 290,
      mdW: 300,
      lgW: 315,
      h: 128,
      mdH: 136,
      lgH: 145,
      shape: "image" as const,
      shapeMargin: 12,
      shapeThreshold: 0.45,
      nudgeY: -6,
      lgNudgeY: -8,
      scale: 0.95,
      mdScale: 0.95,
      lgScale: 0.95,
    };
  }

  return {
    w: 390,
    mdW: 410,
    lgW: 440,
    h: 228,
    mdH: 242,
    lgH: 260,
    shape: "rounded" as const,
    shapeMargin: 14,
    nudgeY: -4,
    lgNudgeY: -8,
    scale: 1.05,
    mdScale: 1.05,
    lgScale: 1.05,
  };
}

export default function ArticleCommerceModuleView({
  articleSlug,
  returnPath,
  module,
  compact = false,
}: {
  articleSlug: string;
  returnPath?: string;
  module: ArticleCommerceRenderableModule;
  compact?: boolean;
}) {
  const businessName =
    module.business?.storeProfile?.displayName ||
    module.business?.name ||
    module.businessName ||
    null;
  const businessSlug = module.business?.slug || module.businessSlug || null;
  const offerId = module.offer?.id || module.offerId || null;
  const offerTitle = module.offer?.title || module.offerTitle || null;
  const inventoryItemId = module.inventoryItem?.id || module.inventoryItemId || null;
  const inventoryItemName = module.inventoryItem?.name || module.inventoryItemName || null;
  const title = module.title || offerTitle || inventoryItemName || businessName || "Local spotlight";
  const badgeText = module.badgeText || (offerTitle ? "Offer spotlight" : "Delivery spotlight");
  const caption = module.caption || (offerTitle ? "Claim this offer" : "Click for delivery");
  const imageSrc =
    module.imageSrc ||
    module.inventoryItem?.imageUrl ||
    module.business?.storeProfile?.logoUrl ||
    module.business?.storeProfile?.heroImageUrl ||
    null;
  const priceHint =
    formatMoney(module.offer?.discountPriceCents) || formatMoney(module.inventoryItem?.priceCents);
  const body =
    module.body ||
    [
      businessName
        ? `${businessName}${module.business?.storeProfile?.deliveryEnabled ? " delivers locally." : " is featured on Wheat & Stone."}`
        : null,
      offerTitle ? `Current offer: ${offerTitle}.` : null,
      inventoryItemName ? `Featured item: ${inventoryItemName}.` : null,
      priceHint ? `Current price: ${priceHint}.` : null,
    ]
      .filter(Boolean)
      .join(" ");
  const side = module.side === "LEFT" ? "left" : "right";
  const dimensions = sizeProps(module.sizePreset);

  return (
    <aside
      className={`rounded-[1.75rem] border border-amber-200/15 bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.12),_rgba(10,10,10,0.96)_58%)] p-4 md:p-5 ${compact ? "text-sm" : ""}`}
    >
      <div className="text-[11px] uppercase tracking-[0.24em] text-amber-100/80">
        {badgeText}
      </div>

      <div className="mt-3">
        <div style={{ clear: side }}>
          <FloatAd
            frameless
            label={title}
            side={side}
            imageSrc={imageSrc}
            imageAlt={module.imageAlt || title}
            pad={0}
            imgFit="contain"
            hoverTint
            caption={caption}
            deliveryLeadContext={{
              source: "LOCAL_AD",
              articleSlug,
              businessSlug: businessSlug ?? undefined,
              businessName: businessName ?? undefined,
              offerId: offerId ?? undefined,
              offerTitle: offerTitle ?? undefined,
              inventoryItemId: inventoryItemId ?? undefined,
              inventoryItemName: inventoryItemName ?? undefined,
              returnPath,
            }}
            {...dimensions}
          />
        </div>

        <div className={`space-y-3 ${compact ? "" : "pr-1"}`}>
          <h4 className={`font-semibold tracking-tight ${compact ? "text-base" : "text-xl md:text-2xl"}`}>
            {title}
          </h4>
          {body && (
            <p className={`leading-relaxed opacity-85 ${compact ? "text-sm" : "text-[1rem] md:text-[1.04rem]"}`}>
              {body}
            </p>
          )}

          <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em] opacity-70">
            {businessName && (
              <span className="rounded-full border border-neutral-700 px-3 py-1">{businessName}</span>
            )}
            {offerTitle && (
              <span className="rounded-full border border-neutral-700 px-3 py-1">{offerTitle}</span>
            )}
            {priceHint && (
              <span className="rounded-full border border-amber-300/25 bg-amber-200/10 px-3 py-1 text-amber-100">
                {priceHint}
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ clear: "both" }} />
    </aside>
  );
}
