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
        w: 164,
        mdW: 170,
        lgW: 178,
        h: 78,
        mdH: 82,
        lgH: 86,
        shape: "image" as const,
        shapeMargin: 6,
        shapeThreshold: 0.2,
        nudgeY: 1,
        mdNudgeY: 1,
        lgNudgeY: 2,
        scale: 1.12,
        mdScale: 1.15,
        lgScale: 1.18,
      };
    }

    if (input.businessSlug === "beaverlodge-butcher-shop") {
      return {
        w: 232,
        mdW: 242,
        lgW: 252,
        h: 88,
        mdH: 92,
        lgH: 98,
        shape: "image" as const,
        shapeMargin: 6,
        shapeThreshold: 0.15,
        nudgeY: 1,
        mdNudgeY: 1,
        lgNudgeY: 1,
        scale: 1.36,
        mdScale: 1.4,
        lgScale: 1.45,
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
      ? "md:w-[9.05rem] lg:w-[9.25rem]"
      : input.businessSlug === "beaverlodge-butcher-shop"
        ? "md:w-[10.1rem] lg:w-[10.35rem]"
        : input.compact
          ? "md:w-[17rem] lg:w-[17.5rem]"
          : "md:w-[18rem] lg:w-[18.75rem]";

  const sideClass =
    input.side === "left"
      ? "md:float-left md:mr-7 lg:mr-8"
      : "md:float-right md:ml-7 lg:ml-8";

  const offsetClass =
    input.businessSlug === "homesteader-health"
      ? "md:mt-2 lg:mt-2.5"
      : input.businessSlug === "beaverlodge-butcher-shop"
        ? "md:mt-0.5 lg:mt-1"
        : "";

  return `${sideClass} ${widthClass} ${offsetClass}`.trim();
}

function dispatchEditorialAdOpen(triggerId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(`ws-floatad-open:${triggerId}`));
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
      ? "max-w-[9rem] md:max-w-[9.2rem]"
      : businessSlug === "beaverlodge-butcher-shop"
        ? "max-w-[9.9rem] md:max-w-[10.1rem]"
        : "max-w-[14rem]";
  const editorialTextOffsetClass =
    businessSlug === "homesteader-health"
      ? "-mt-[3.45rem] md:-mt-[3.65rem] lg:-mt-[3.8rem]"
      : businessSlug === "beaverlodge-butcher-shop"
        ? "-mt-[4.45rem] md:-mt-[4.65rem] lg:-mt-[4.85rem]"
        : "";
  const editorialLogoHeightClass =
    businessSlug === "homesteader-health"
      ? "h-[5.95rem] md:h-[6.1rem] lg:h-[6.3rem]"
      : businessSlug === "beaverlodge-butcher-shop"
        ? "h-[4.75rem] md:h-[5rem] lg:h-[5.25rem]"
        : compact
          ? "h-[5rem] md:h-[5.3rem] lg:h-[5.6rem]"
          : "h-[5.75rem] md:h-[6rem] lg:h-[6.35rem]";
  const editorialModulePadClass =
    businessSlug === "homesteader-health"
      ? "px-0.5 py-0"
      : businessSlug === "beaverlodge-butcher-shop"
        ? "px-0.5 py-0"
        : "px-0.5 py-0";
  const editorialCopyClass =
    businessSlug === "beaverlodge-butcher-shop"
      ? "text-[0.49rem] md:text-[0.53rem] leading-[1.2]"
      : compact
        ? "text-[0.49rem] md:text-[0.54rem] leading-[1.18]"
        : "text-[0.5rem] md:text-[0.55rem] leading-[1.2]";
  const editorialTitleClass =
    businessSlug === "beaverlodge-butcher-shop"
      ? "text-[0.85rem] leading-[1.01] md:text-[0.9rem]"
      : compact
        ? "text-[0.87rem] leading-[1.02] md:text-[0.91rem]"
        : "text-[0.88rem] leading-[1.02] md:text-[0.93rem]";
  if (visualStyle === "editorial-open") {
    const wrapperClassName = resolveEditorialOpenShell({
      side,
      businessSlug,
      compact,
    });

    return (
      <aside
        className={`my-0 w-full ${wrapperClassName} ${compact ? "" : "md:my-0.5"}`}
      >
        <FloatAd
          buttonId={triggerId}
          triggerOnly
          label={visibleTitle}
          side={side}
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

        <button
          type="button"
          onClick={() => dispatchEditorialAdOpen(triggerId)}
          className={`group relative block w-full appearance-none cursor-pointer overflow-hidden rounded-[1rem] border border-transparent bg-transparent text-center outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40 ${editorialModulePadClass}`}
          aria-label={`${visibleTitle} - open delivery form`}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[3] flex items-center justify-center rounded-[1rem] bg-[var(--editorial-ad-hover-bg)] opacity-0 transition-opacity duration-180 ease-out group-hover:opacity-100 group-focus-visible:opacity-100"
          >
            <span className="pointer-events-none rounded-full bg-black/58 px-3.5 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-[var(--editorial-ad-hover-label)] shadow-[0_10px_28px_rgba(0,0,0,0.22)]">
              Buy Now
            </span>
          </span>

          <div className="pointer-events-none relative z-[1] flex flex-col items-center gap-0">
            {imageSrc ? (
              <div className="relative flex w-full justify-center">
                <img
                  src={imageSrc}
                  alt={module.imageAlt || visibleTitle}
                  className={`pointer-events-none block w-auto ${editorialLogoHeightClass}`}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                />
              </div>
            ) : null}

            <div
              className={`mx-auto flex flex-col items-center gap-[0.03rem] ${editorialTextShellClass} ${editorialTextOffsetClass}`}
              style={{ color: "var(--editorial-ad-copy)" }}
            >
              <h4
                className={`font-semibold tracking-tight ${editorialTitleClass}`}
                style={{ color: "var(--editorial-ad-title)" }}
              >
                {visibleTitle}
              </h4>

              {body ? (
                <p
                  className={`mx-auto ${editorialCopyClass}`}
                  style={{ color: "var(--editorial-ad-muted)" }}
                >
                  {body}
                </p>
              ) : null}
            </div>
          </div>
        </button>
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
        <div>
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
