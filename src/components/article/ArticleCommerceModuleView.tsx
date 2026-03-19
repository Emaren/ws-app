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
        w: 186,
        mdW: 194,
        lgW: 202,
        h: 90,
        mdH: 94,
        lgH: 98,
        shape: "image" as const,
        shapeMargin: 6,
        shapeThreshold: 0.2,
        nudgeY: 1,
        mdNudgeY: 1,
        lgNudgeY: 2,
        scale: 1.22,
        mdScale: 1.25,
        lgScale: 1.28,
      };
    }

    if (input.businessSlug === "beaverlodge-butcher-shop") {
      return {
        w: 194,
        mdW: 204,
        lgW: 214,
        h: 78,
        mdH: 82,
        lgH: 86,
        shape: "image" as const,
        shapeMargin: 6,
        shapeThreshold: 0.15,
        nudgeY: 1,
        mdNudgeY: 1,
        lgNudgeY: 1,
        scale: 1.3,
        mdScale: 1.34,
        lgScale: 1.38,
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
      ? "md:w-[13.25rem] lg:w-[13.75rem]"
      : input.businessSlug === "beaverlodge-butcher-shop"
        ? "md:w-[13.5rem] lg:w-[14rem]"
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
  const triggerId = [
    "article-commerce-ad",
    businessSlug || module.id || visibleTitle,
    side,
  ]
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const editorialTextShellClass =
    businessSlug === "homesteader-health"
      ? "max-w-[11.8rem] md:max-w-[12.2rem]"
      : businessSlug === "beaverlodge-butcher-shop"
        ? "max-w-[12.1rem] md:max-w-[12.5rem]"
        : "max-w-[14rem]";
  const editorialTextOffsetClass =
    businessSlug === "homesteader-health"
      ? "-mt-2 md:-mt-2.5"
      : businessSlug === "beaverlodge-butcher-shop"
        ? "-mt-4 md:-mt-[1.1rem]"
        : "";

  if (visualStyle === "editorial-open") {
    const wrapperClassName = resolveEditorialOpenShell({
      side,
      businessSlug,
      compact,
    });

    return (
      <aside
        className={`my-4 w-full ${wrapperClassName} ${compact ? "" : "md:my-5"}`}
        style={{ clear: side }}
      >
        <div className="group relative overflow-hidden rounded-[1rem] px-1 py-1 text-center transition-colors duration-200 ease-out md:space-y-0.5">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[1] rounded-[1rem] bg-[var(--editorial-ad-hover-bg)] opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100 group-focus-within:opacity-100"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-1/2 z-[2] flex -translate-y-1/2 justify-center opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100 group-focus-within:opacity-100"
          >
            <span className="rounded-full bg-black/72 px-4 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-white shadow-[0_12px_28px_rgba(0,0,0,0.28)]">
              Buy Now
            </span>
          </span>

          <div className="relative z-0 flex justify-center">
            <FloatAd
              buttonId={triggerId}
              frameless
              flowMode="inline"
              label={visibleTitle}
              side={side}
              imageSrc={imageSrc}
              imageAlt={module.imageAlt || visibleTitle}
              pad={0}
              imgFit="contain"
              hoverTint={false}
              caption={null}
              hoverRing={false}
              containerClassName="duration-200 ease-out"
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

          <button
            type="button"
            onClick={() => document.getElementById(triggerId)?.click()}
            className={`relative z-0 mx-auto flex w-full cursor-pointer flex-col items-center gap-0 rounded-[1rem] bg-transparent px-1 py-0 text-center transition-colors duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40 ${editorialTextShellClass} ${editorialTextOffsetClass}`}
            aria-label={`${visibleTitle} - open delivery form`}
            style={{ color: "var(--editorial-ad-copy)" }}
          >
            <h4
              className={`font-semibold tracking-tight ${
                compact ? "text-[0.96rem] leading-[1.02] md:text-[1rem]" : "text-[0.98rem] leading-[1.02] md:text-[1.04rem]"
              }`}
              style={{ color: "var(--editorial-ad-title)" }}
            >
              {visibleTitle}
            </h4>

            {body ? (
              <p
                className={`mx-auto leading-[1.42] ${
                  compact ? "text-[0.69rem] md:text-[0.72rem]" : "text-[0.71rem] md:text-[0.74rem]"
                }`}
                style={{ color: "var(--editorial-ad-muted)" }}
              >
                {body}
              </p>
            ) : null}
          </button>
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
