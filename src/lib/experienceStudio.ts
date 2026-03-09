import type { ExperiencePackStatus } from "@prisma/client";

export const EXPERIENCE_ROUTE_OPTIONS = [
  { key: "home", label: "Home", pathname: "/", summary: "Homepage / flagship front door" },
  { key: "discover", label: "Discover", pathname: "/discover", summary: "Discovery hub" },
  { key: "articles", label: "Articles", pathname: "/articles", summary: "Article index" },
  { key: "products", label: "Products", pathname: "/products", summary: "Product atlas" },
  { key: "offers", label: "Offers", pathname: "/offers", summary: "Offers index" },
  { key: "map", label: "Map", pathname: "/map", summary: "Store atlas / map" },
  { key: "community", label: "Community", pathname: "/community", summary: "Community hub" },
  { key: "about", label: "About", pathname: "/about", summary: "About page" },
] as const;

export type ExperienceRouteKey = (typeof EXPERIENCE_ROUTE_OPTIONS)[number]["key"];

const EXPERIENCE_ROUTE_KEY_SET = new Set<string>(
  EXPERIENCE_ROUTE_OPTIONS.map((option) => option.key),
);

export const EXPERIENCE_PACK_STATUS_OPTIONS: Array<{
  value: ExperiencePackStatus;
  label: string;
  summary: string;
}> = [
  {
    value: "DRAFT",
    label: "Draft",
    summary: "Internal work in progress. Admin only.",
  },
  {
    value: "PREVIEWABLE",
    label: "Previewable",
    summary: "Public preview links work, but the pack is not user-selectable yet.",
  },
  {
    value: "SELECTABLE",
    label: "Selectable",
    summary: "Users can choose this pack in their account settings.",
  },
  {
    value: "ARCHIVED",
    label: "Archived",
    summary: "Hidden from active use, kept for history.",
  },
];

export function normalizeExperienceRouteKey(
  input: string | null | undefined,
): ExperienceRouteKey | null {
  if (!input) {
    return null;
  }

  const normalized = input.trim().toLowerCase();
  return EXPERIENCE_ROUTE_KEY_SET.has(normalized)
    ? (normalized as ExperienceRouteKey)
    : null;
}

export function getExperienceRouteOption(routeKey: ExperienceRouteKey) {
  return EXPERIENCE_ROUTE_OPTIONS.find((option) => option.key === routeKey) ?? null;
}

export function buildExperiencePreviewHref(packSlug: string, routeKey: ExperienceRouteKey): string {
  return `/preview/${encodeURIComponent(packSlug)}/${encodeURIComponent(routeKey)}`;
}

export function slugifyExperienceValue(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export type ExperiencePackCatalogItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  status: ExperiencePackStatus;
  isSelectable: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  previewablePageCount: number;
  activeUserCount: number;
  pages: Array<{
    id: string;
    routeKey: ExperienceRouteKey;
    title: string;
    notes: string | null;
    viewportLabel: string | null;
    imageUrl: string;
    originalFilename: string | null;
    fileSizeBytes: number | null;
    sortOrder: number;
    isPublished: boolean;
    createdAt: string;
    updatedAt: string;
    previewHref: string;
    routeLabel: string;
    pathname: string;
  }>;
};
