export const ARTICLE_COMMERCE_PLACEMENTS = [
  "AFTER_FIRST_HEADING",
  "CHECKLIST_SPLIT",
] as const;

export const ARTICLE_COMMERCE_SIDES = [
  "LEFT",
  "RIGHT",
] as const;

export const ARTICLE_COMMERCE_SIZE_PRESETS = [
  "FEATURE",
  "COMPACT",
] as const;

export type ArticleCommercePlacement = (typeof ARTICLE_COMMERCE_PLACEMENTS)[number];
export type ArticleCommerceSide = (typeof ARTICLE_COMMERCE_SIDES)[number];
export type ArticleCommerceSizePreset = (typeof ARTICLE_COMMERCE_SIZE_PRESETS)[number];

export type ArticleCommerceModuleInput = {
  id?: string | null;
  placement?: ArticleCommercePlacement | null;
  sortOrder?: number | null;
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
  side?: ArticleCommerceSide | null;
  sizePreset?: ArticleCommerceSizePreset | null;
  isEnabled?: boolean | null;
};

export type NormalizedArticleCommerceModuleInput = {
  placement: ArticleCommercePlacement;
  sortOrder: number;
  businessId: string | null;
  businessSlug: string | null;
  businessName: string | null;
  offerId: string | null;
  offerTitle: string | null;
  inventoryItemId: string | null;
  inventoryItemName: string | null;
  title: string | null;
  badgeText: string | null;
  body: string | null;
  imageSrc: string | null;
  imageAlt: string | null;
  caption: string | null;
  side: ArticleCommerceSide;
  sizePreset: ArticleCommerceSizePreset;
  isEnabled: boolean;
};

export type ArticleCommerceModuleDraft = {
  clientKey: string;
  placement: ArticleCommercePlacement;
  sortOrder: string;
  businessId: string;
  businessSlug: string;
  businessName: string;
  offerId: string;
  offerTitle: string;
  inventoryItemId: string;
  inventoryItemName: string;
  title: string;
  badgeText: string;
  body: string;
  imageSrc: string;
  imageAlt: string;
  caption: string;
  side: ArticleCommerceSide;
  sizePreset: ArticleCommerceSizePreset;
  isEnabled: boolean;
};

function createDraftKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `commerce-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function asOptionalText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function asOptionalId(value: unknown): string | null {
  return asOptionalText(value, 64);
}

function normalizeSortOrder(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value.trim(), 10);
    if (Number.isFinite(parsed)) {
      return Math.max(0, parsed);
    }
  }

  return fallback;
}

function hasMeaningfulContent(module: {
  businessId: string | null;
  businessSlug: string | null;
  businessName: string | null;
  offerId: string | null;
  offerTitle: string | null;
  inventoryItemId: string | null;
  inventoryItemName: string | null;
  title: string | null;
  badgeText: string | null;
  body: string | null;
  imageSrc: string | null;
  caption: string | null;
}): boolean {
  return Boolean(
    module.businessId ||
      module.businessSlug ||
      module.businessName ||
      module.offerId ||
      module.offerTitle ||
      module.inventoryItemId ||
      module.inventoryItemName ||
      module.title ||
      module.badgeText ||
      module.body ||
      module.imageSrc ||
      module.caption,
  );
}

export function createArticleCommerceModuleDraft(
  value?: Partial<ArticleCommerceModuleDraft>,
): ArticleCommerceModuleDraft {
  return {
    clientKey: value?.clientKey || createDraftKey(),
    placement: value?.placement || "AFTER_FIRST_HEADING",
    sortOrder: value?.sortOrder || "",
    businessId: value?.businessId || "",
    businessSlug: value?.businessSlug || "",
    businessName: value?.businessName || "",
    offerId: value?.offerId || "",
    offerTitle: value?.offerTitle || "",
    inventoryItemId: value?.inventoryItemId || "",
    inventoryItemName: value?.inventoryItemName || "",
    title: value?.title || "",
    badgeText: value?.badgeText || "",
    body: value?.body || "",
    imageSrc: value?.imageSrc || "",
    imageAlt: value?.imageAlt || "",
    caption: value?.caption || "",
    side: value?.side || "RIGHT",
    sizePreset: value?.sizePreset || "FEATURE",
    isEnabled: value?.isEnabled ?? true,
  };
}

export function articleCommerceDraftFromRecord(
  value?: Partial<ArticleCommerceModuleInput> | null,
): ArticleCommerceModuleDraft {
  return createArticleCommerceModuleDraft({
    placement: value?.placement || "AFTER_FIRST_HEADING",
    sortOrder:
      typeof value?.sortOrder === "number" && Number.isFinite(value.sortOrder)
        ? String(value.sortOrder)
        : "",
    businessId: value?.businessId || "",
    businessSlug: value?.businessSlug || "",
    businessName: value?.businessName || "",
    offerId: value?.offerId || "",
    offerTitle: value?.offerTitle || "",
    inventoryItemId: value?.inventoryItemId || "",
    inventoryItemName: value?.inventoryItemName || "",
    title: value?.title || "",
    badgeText: value?.badgeText || "",
    body: value?.body || "",
    imageSrc: value?.imageSrc || "",
    imageAlt: value?.imageAlt || "",
    caption: value?.caption || "",
    side: value?.side || "RIGHT",
    sizePreset: value?.sizePreset || "FEATURE",
    isEnabled: value?.isEnabled ?? true,
  });
}

export function articleCommercePayloadFromDrafts(
  drafts: ArticleCommerceModuleDraft[],
): ArticleCommerceModuleInput[] {
  return drafts.map((draft) => ({
    placement: draft.placement,
    sortOrder: draft.sortOrder.trim() ? Number.parseInt(draft.sortOrder, 10) : null,
    businessId: asOptionalId(draft.businessId),
    businessSlug: asOptionalText(draft.businessSlug, 120),
    businessName: asOptionalText(draft.businessName, 120),
    offerId: asOptionalId(draft.offerId),
    offerTitle: asOptionalText(draft.offerTitle, 120),
    inventoryItemId: asOptionalId(draft.inventoryItemId),
    inventoryItemName: asOptionalText(draft.inventoryItemName, 120),
    title: asOptionalText(draft.title, 160),
    badgeText: asOptionalText(draft.badgeText, 60),
    body: asOptionalText(draft.body, 320),
    imageSrc: asOptionalText(draft.imageSrc, 500),
    imageAlt: asOptionalText(draft.imageAlt, 160),
    caption: asOptionalText(draft.caption, 80),
    side: draft.side,
    sizePreset: draft.sizePreset,
    isEnabled: draft.isEnabled,
  }));
}

export function normalizeArticleCommerceModulesInput(input: unknown): {
  data: NormalizedArticleCommerceModuleInput[];
  error?: string;
} {
  if (input === null || input === undefined) {
    return { data: [] };
  }

  if (!Array.isArray(input)) {
    return { data: [], error: "Commerce modules payload must be an array." };
  }

  if (input.length > 8) {
    return { data: [], error: "Commerce modules are limited to 8 per article." };
  }

  const normalized: NormalizedArticleCommerceModuleInput[] = [];

  for (let index = 0; index < input.length; index += 1) {
    const raw = input[index];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return { data: [], error: `Commerce module ${index + 1} is invalid.` };
    }

    const source = raw as Record<string, unknown>;
    const placement = ARTICLE_COMMERCE_PLACEMENTS.includes(
      source.placement as ArticleCommercePlacement,
    )
      ? (source.placement as ArticleCommercePlacement)
      : "AFTER_FIRST_HEADING";
    const side = ARTICLE_COMMERCE_SIDES.includes(source.side as ArticleCommerceSide)
      ? (source.side as ArticleCommerceSide)
      : "RIGHT";
    const sizePreset = ARTICLE_COMMERCE_SIZE_PRESETS.includes(
      source.sizePreset as ArticleCommerceSizePreset,
    )
      ? (source.sizePreset as ArticleCommerceSizePreset)
      : "FEATURE";

    const module: NormalizedArticleCommerceModuleInput = {
      placement,
      sortOrder: normalizeSortOrder(source.sortOrder, index),
      businessId: asOptionalId(source.businessId),
      businessSlug: asOptionalText(source.businessSlug, 120),
      businessName: asOptionalText(source.businessName, 120),
      offerId: asOptionalId(source.offerId),
      offerTitle: asOptionalText(source.offerTitle, 120),
      inventoryItemId: asOptionalId(source.inventoryItemId),
      inventoryItemName: asOptionalText(source.inventoryItemName, 120),
      title: asOptionalText(source.title, 160),
      badgeText: asOptionalText(source.badgeText, 60),
      body: asOptionalText(source.body, 320),
      imageSrc: asOptionalText(source.imageSrc, 500),
      imageAlt: asOptionalText(source.imageAlt, 160),
      caption: asOptionalText(source.caption, 80),
      side,
      sizePreset,
      isEnabled: source.isEnabled === undefined ? true : Boolean(source.isEnabled),
    };

    if (!hasMeaningfulContent(module)) {
      continue;
    }

    if (
      !module.businessId &&
      !module.businessSlug &&
      !module.businessName &&
      !module.offerId &&
      !module.inventoryItemId &&
      !module.title
    ) {
      return {
        data: [],
        error: `Commerce module ${index + 1} needs a business, offer, inventory item, or title.`,
      };
    }

    normalized.push(module);
  }

  normalized.sort((left, right) => {
    if (left.placement !== right.placement) {
      return left.placement.localeCompare(right.placement);
    }
    return left.sortOrder - right.sortOrder;
  });

  return { data: normalized };
}
