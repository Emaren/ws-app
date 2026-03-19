import FloatAd from "./FloatAd";

type ModuleVisualStyle = "card" | "editorial-open";

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
      w: 322,
      mdW: 334,
      lgW: 346,
      h: 178,
      mdH: 186,
      lgH: 194,
      shape: "image" as const,
      shapeMargin: 16,
      shapeThreshold: 0.42,
      nudgeY: -4,
      lgNudgeY: -6,
      scale: 0.98,
      mdScale: 0.99,
      lgScale: 1,
    };
  }

  return {
    w: 352,
    mdW: 372,
    lgW: 392,
    h: 194,
    mdH: 204,
    lgH: 214,
    shape: "rounded" as const,
    shapeMargin: 16,
    nudgeY: -2,
    lgNudgeY: -4,
    scale: 1.01,
    mdScale: 1.02,
    lgScale: 1.03,
  };
}

function resolveFloatPresentation(input: {
  businessSlug: string | null;
  visualStyle: ModuleVisualStyle;
  sizePreset: string | null | undefined;
  compact: boolean;
}) {
  if (input.visualStyle === "editorial-open") {
    if (input.businessSlug === "homesteader-health") {
      return {
        w: 248,
        mdW: 286,
        lgW: 312,
        h: 214,
        mdH: 246,
        lgH: 268,
        shape: "image" as const,
        shapeMargin: 18,
        shapeThreshold: 0.2,
        scale: 1.06,
        mdScale: 1.08,
        lgScale: 1.1,
      };
    }

    if (input.businessSlug === "beaverlodge-butcher-shop") {
      return {
        w: 214,
        mdW: 228,
        lgW: 242,
        h: 112,
        mdH: 118,
        lgH: 124,
        shape: "image" as const,
        shapeMargin: 18,
        shapeThreshold: 0.15,
        scale: 1.04,
        mdScale: 1.05,
        lgScale: 1.06,
      };
    }

    return {
      ...sizeProps(input.compact ? "COMPACT" : input.sizePreset),
      shape: "image" as const,
      shapeMargin: 18,
      shapeThreshold: 0.25,
    };
  }

  return sizeProps(input.compact ? "COMPACT" : input.sizePreset);
}

function resolveEditorialOpenShell(input: {
  side: "left" | "right";
  businessSlug: string | null;
  compact: boolean;
}) {
  const widthClass =
    input.businessSlug === "homesteader-health"
      ? "md:w-[18.75rem] lg:w-[19.5rem]"
      : input.businessSlug === "beaverlodge-butcher-shop"
        ? "md:w-[17rem] lg:w-[17.5rem]"
        : input.compact
          ? "md:w-[17rem] lg:w-[17.5rem]"
          : "md:w-[18rem] lg:w-[18.75rem]";

  const sideClass =
    input.side === "left"
      ? "md:float-left md:mr-8 lg:mr-10"
      : "md:float-right md:ml-8 lg:ml-10";

  return `${sideClass} ${widthClass}`;
}

export default function ArticleCommerceModuleView({
  articleSlug,
  returnPath,
  module,
  compact = false,
  visualStyle = "card",
}: {
  articleSlug: string;
  returnPath?: string;
  module: ArticleCommerceRenderableModule;
  compact?: boolean;
  visualStyle?: ModuleVisualStyle;
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
  const dimensions = resolveFloatPresentation({
    businessSlug,
    visualStyle,
    sizePreset: module.sizePreset,
    compact,
  });
  const visibleTitle = title.trim() || "Local spotlight";
  const visibleBusinessTag =
    businessName && businessName.trim() && businessName.trim() !== visibleTitle ? businessName.trim() : null;

  if (visualStyle === "editorial-open") {
    const wrapperClassName = resolveEditorialOpenShell({
      side,
      businessSlug,
      compact,
    });

    return (
      <aside
        className={`my-5 w-full text-white/95 ${wrapperClassName} ${compact ? "" : "md:my-6"}`}
        style={{ clear: side }}
      >
        <div className="space-y-3.5 text-center md:space-y-4">
          <div className="flex justify-center">
            <FloatAd
              frameless
              flowMode="inline"
              label={visibleTitle}
              side={side}
              imageSrc={imageSrc}
              imageAlt={module.imageAlt || visibleTitle}
              pad={0}
              imgFit="contain"
              hoverTint
              caption={null}
              containerClassName="transition-transform duration-300 ease-out hover:-translate-y-0.5"
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

          <div className="mx-auto max-w-[18.5rem] space-y-2.5">
            <h4
              className={`font-semibold tracking-tight text-white/92 ${
                compact ? "text-[1.26rem] leading-[1.16] md:text-[1.34rem]" : "text-[1.34rem] leading-[1.12] md:text-[1.46rem]"
              }`}
            >
              {visibleTitle}
            </h4>

            {body ? (
              <p
                className={`mx-auto max-w-[17.5rem] leading-[1.72] text-white/68 ${
                  compact ? "text-[0.9rem] md:text-[0.92rem]" : "text-[0.92rem] md:text-[0.95rem]"
                }`}
              >
                {body}
              </p>
            ) : null}
          </div>
        </div>

        <div style={{ clear: "both" }} />
      </aside>
    );
  }

  return (
    <aside
      className={`rounded-[1.75rem] border border-amber-200/15 bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.12),_rgba(10,10,10,0.96)_58%)] p-4 md:p-5 ${compact ? "text-sm" : "lg:p-6"}`}
    >
      <div className="text-[11px] uppercase tracking-[0.24em] text-amber-100/80">
        {badgeText}
      </div>

      <div className="mt-3">
        <div style={{ clear: side }}>
          <FloatAd
            frameless
            label={visibleTitle}
            side={side}
            imageSrc={imageSrc}
            imageAlt={module.imageAlt || visibleTitle}
            pad={0}
            imgFit="contain"
            hoverTint
            caption={null}
            containerClassName="transition-transform duration-300 ease-out hover:-translate-y-0.5"
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
          <h4
            className={`font-semibold tracking-tight text-white ${
              compact ? "text-[1.25rem] leading-[1.15]" : "text-[1.55rem] leading-[1.08] md:text-[1.95rem]"
            }`}
          >
            {visibleTitle}
          </h4>
          {body && (
            <p
              className={`leading-[1.68] text-white/82 ${
                compact ? "text-[0.96rem]" : "text-[0.98rem] md:text-[1.03rem]"
              }`}
            >
              {body}
            </p>
          )}

          <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em] opacity-70">
            {visibleBusinessTag && (
              <span className="rounded-full border border-neutral-700 px-3 py-1">{visibleBusinessTag}</span>
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
