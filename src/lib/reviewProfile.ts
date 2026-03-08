export type ReviewProfileInput = {
  productName?: string | null;
  brandName?: string | null;
  category?: string | null;
  reviewScore?: number | null;
  verdict?: string | null;
  organicStatus?: string | null;
  recommendedFor?: string | null;
  avoidFor?: string | null;
  localAvailability?: string | null;
  conventionalTitle?: string | null;
  conventionalHref?: string | null;
  conventionalImageSrc?: string | null;
  conventionalBadge?: string | null;
  conventionalPriceHint?: string | null;
  organicTitle?: string | null;
  organicHref?: string | null;
  organicImageSrc?: string | null;
  organicBadge?: string | null;
  organicPriceHint?: string | null;
};

export type ReviewProfilePayload = Omit<ReviewProfileInput, "reviewScore"> & {
  reviewScore?: number | string | null;
};

export type NormalizedReviewProfileInput = ReviewProfileInput & {
  productName: string;
};

export type ReviewProfileDraft = {
  productName: string;
  brandName: string;
  category: string;
  reviewScore: string;
  verdict: string;
  organicStatus: string;
  recommendedFor: string;
  avoidFor: string;
  localAvailability: string;
  conventionalTitle: string;
  conventionalHref: string;
  conventionalImageSrc: string;
  conventionalBadge: string;
  conventionalPriceHint: string;
  organicTitle: string;
  organicHref: string;
  organicImageSrc: string;
  organicBadge: string;
  organicPriceHint: string;
};

export type ReviewComparisonPair = {
  left: {
    title: string;
    href: string;
    imageSrc?: string;
    badge?: string;
    priceHint?: string;
  };
  right: {
    title: string;
    href: string;
    imageSrc?: string;
    badge?: string;
    priceHint?: string;
  };
};

export const emptyReviewProfileDraft: ReviewProfileDraft = {
  productName: "",
  brandName: "",
  category: "",
  reviewScore: "",
  verdict: "",
  organicStatus: "",
  recommendedFor: "",
  avoidFor: "",
  localAvailability: "",
  conventionalTitle: "",
  conventionalHref: "",
  conventionalImageSrc: "",
  conventionalBadge: "",
  conventionalPriceHint: "",
  organicTitle: "",
  organicHref: "",
  organicImageSrc: "",
  organicBadge: "",
  organicPriceHint: "",
};

const reviewTextKeys: Array<keyof Omit<ReviewProfileInput, "reviewScore">> = [
  "productName",
  "brandName",
  "category",
  "verdict",
  "organicStatus",
  "recommendedFor",
  "avoidFor",
  "localAvailability",
  "conventionalTitle",
  "conventionalHref",
  "conventionalImageSrc",
  "conventionalBadge",
  "conventionalPriceHint",
  "organicTitle",
  "organicHref",
  "organicImageSrc",
  "organicBadge",
  "organicPriceHint",
];

function toDraftValue(value: string | null | undefined): string {
  return typeof value === "string" ? value : "";
}

function toOptionalText(value: unknown, maxLength: number): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function normalizeReviewScore(value: unknown): { value: number | null; error?: string } {
  if (value === null || value === undefined || value === "") {
    return { value: null };
  }

  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value.trim(), 10)
        : Number.NaN;

  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) {
    return { value: null, error: "Review score must be a whole number between 0 and 100." };
  }

  if (parsed < 0 || parsed > 100) {
    return { value: null, error: "Review score must be between 0 and 100." };
  }

  return { value: Math.round(parsed) };
}

export function reviewProfileDraftFromRecord(
  value?: Partial<ReviewProfileInput> | null,
): ReviewProfileDraft {
  return {
    productName: toDraftValue(value?.productName),
    brandName: toDraftValue(value?.brandName),
    category: toDraftValue(value?.category),
    reviewScore:
      typeof value?.reviewScore === "number" && Number.isFinite(value.reviewScore)
        ? String(value.reviewScore)
        : "",
    verdict: toDraftValue(value?.verdict),
    organicStatus: toDraftValue(value?.organicStatus),
    recommendedFor: toDraftValue(value?.recommendedFor),
    avoidFor: toDraftValue(value?.avoidFor),
    localAvailability: toDraftValue(value?.localAvailability),
    conventionalTitle: toDraftValue(value?.conventionalTitle),
    conventionalHref: toDraftValue(value?.conventionalHref),
    conventionalImageSrc: toDraftValue(value?.conventionalImageSrc),
    conventionalBadge: toDraftValue(value?.conventionalBadge),
    conventionalPriceHint: toDraftValue(value?.conventionalPriceHint),
    organicTitle: toDraftValue(value?.organicTitle),
    organicHref: toDraftValue(value?.organicHref),
    organicImageSrc: toDraftValue(value?.organicImageSrc),
    organicBadge: toDraftValue(value?.organicBadge),
    organicPriceHint: toDraftValue(value?.organicPriceHint),
  };
}

export function reviewProfilePayloadFromDraft(
  draft: ReviewProfileDraft,
): ReviewProfilePayload {
  return {
    productName: toOptionalText(draft.productName, 160),
    brandName: toOptionalText(draft.brandName, 120),
    category: toOptionalText(draft.category, 120),
    reviewScore: draft.reviewScore.trim() ? draft.reviewScore.trim() : null,
    verdict: toOptionalText(draft.verdict, 220),
    organicStatus: toOptionalText(draft.organicStatus, 160),
    recommendedFor: toOptionalText(draft.recommendedFor, 220),
    avoidFor: toOptionalText(draft.avoidFor, 220),
    localAvailability: toOptionalText(draft.localAvailability, 220),
    conventionalTitle: toOptionalText(draft.conventionalTitle, 160),
    conventionalHref: toOptionalText(draft.conventionalHref, 500),
    conventionalImageSrc: toOptionalText(draft.conventionalImageSrc, 500),
    conventionalBadge: toOptionalText(draft.conventionalBadge, 60),
    conventionalPriceHint: toOptionalText(draft.conventionalPriceHint, 60),
    organicTitle: toOptionalText(draft.organicTitle, 160),
    organicHref: toOptionalText(draft.organicHref, 500),
    organicImageSrc: toOptionalText(draft.organicImageSrc, 500),
    organicBadge: toOptionalText(draft.organicBadge, 60),
    organicPriceHint: toOptionalText(draft.organicPriceHint, 60),
  };
}

export function hasReviewProfileContent(
  value?: Partial<ReviewProfileInput> | null,
): boolean {
  if (!value) return false;
  if (typeof value.reviewScore === "number" && Number.isFinite(value.reviewScore)) {
    return true;
  }

  return reviewTextKeys.some((key) => {
    const candidate = value[key];
    return typeof candidate === "string" && candidate.trim().length > 0;
  });
}

export function normalizeReviewProfileInput(input: unknown): {
  data: NormalizedReviewProfileInput | null;
  error?: string;
} {
  if (input === null || input === undefined) {
    return { data: null };
  }

  if (typeof input !== "object" || Array.isArray(input)) {
    return { data: null, error: "Review profile payload is invalid." };
  }

  const source = input as Record<string, unknown>;
  const score = normalizeReviewScore(source.reviewScore);
  if (score.error) {
    return { data: null, error: score.error };
  }

  const data: ReviewProfileInput = {
    productName: toOptionalText(source.productName, 160),
    brandName: toOptionalText(source.brandName, 120),
    category: toOptionalText(source.category, 120),
    reviewScore: score.value,
    verdict: toOptionalText(source.verdict, 220),
    organicStatus: toOptionalText(source.organicStatus, 160),
    recommendedFor: toOptionalText(source.recommendedFor, 220),
    avoidFor: toOptionalText(source.avoidFor, 220),
    localAvailability: toOptionalText(source.localAvailability, 220),
    conventionalTitle: toOptionalText(source.conventionalTitle, 160),
    conventionalHref: toOptionalText(source.conventionalHref, 500),
    conventionalImageSrc: toOptionalText(source.conventionalImageSrc, 500),
    conventionalBadge: toOptionalText(source.conventionalBadge, 60),
    conventionalPriceHint: toOptionalText(source.conventionalPriceHint, 60),
    organicTitle: toOptionalText(source.organicTitle, 160),
    organicHref: toOptionalText(source.organicHref, 500),
    organicImageSrc: toOptionalText(source.organicImageSrc, 500),
    organicBadge: toOptionalText(source.organicBadge, 60),
    organicPriceHint: toOptionalText(source.organicPriceHint, 60),
  };

  if (!hasReviewProfileContent(data)) {
    return { data: null };
  }

  if (!data.productName) {
    return {
      data: null,
      error: "Product name is required when saving a review profile.",
    };
  }

  return {
    data: {
      ...data,
      productName: data.productName,
    },
  };
}

export function buildAffiliatePairFromReviewProfile(
  value?: Partial<ReviewProfileInput> | null,
): ReviewComparisonPair | null {
  if (!value?.conventionalTitle || !value.conventionalHref) {
    return null;
  }
  if (!value.organicTitle || !value.organicHref) {
    return null;
  }

  return {
    left: {
      title: value.conventionalTitle,
      href: value.conventionalHref,
      imageSrc: value.conventionalImageSrc ?? undefined,
      badge: value.conventionalBadge ?? undefined,
      priceHint: value.conventionalPriceHint ?? undefined,
    },
    right: {
      title: value.organicTitle,
      href: value.organicHref,
      imageSrc: value.organicImageSrc ?? undefined,
      badge: value.organicBadge ?? undefined,
      priceHint: value.organicPriceHint ?? undefined,
    },
  };
}
