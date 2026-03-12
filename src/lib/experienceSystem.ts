import { getThemeLabel, type ThemeMode } from "@/lib/theme";

export type SiteEdition = "classic" | "rustic" | "modern" | "operator";
export type SiteLayout = "editorial" | "gazette" | "marketplace" | "atlas";

export type ExperiencePresetStatus = "flagship" | "active" | "draft" | "saved";

export type ExperiencePageKey =
  | "home"
  | "article"
  | "articles"
  | "products"
  | "offers"
  | "map"
  | "discover"
  | "community"
  | "about"
  | "account";

export type ExperiencePreset = {
  slug: string;
  name: string;
  theme: ThemeMode;
  edition: SiteEdition;
  layout: SiteLayout;
  status: ExperiencePresetStatus;
  summary: string;
  supportedPages: ExperiencePageKey[];
};

export type ExperiencePresetOption = {
  value: string;
  label: string;
  summary: string;
  status: ExperiencePresetStatus;
  theme: ThemeMode;
  edition: SiteEdition;
  layout: SiteLayout;
  supportedPages: ExperiencePageKey[];
};

export type SavedExperiencePresetInput = {
  slug: string;
  name: string;
  theme: ThemeMode;
  edition: SiteEdition;
  layout: SiteLayout;
};

export const EXPERIENCE_EDITION_OPTIONS: Array<{
  value: SiteEdition;
  label: string;
  summary: string;
}> = [
  {
    value: "classic",
    label: "Classic",
    summary: "Johnny Cash restraint with publication-first confidence.",
  },
  {
    value: "rustic",
    label: "Rustic",
    summary: "Warm, tactile, Canadian richness with softer heritage texture.",
  },
  {
    value: "modern",
    label: "Modern",
    summary: "Premium showcase surfaces with sleeker highlight moments.",
  },
  {
    value: "operator",
    label: "Operator",
    summary: "Midnight-leaning control-room precision inspired by your in-house tools.",
  },
];

export const EXPERIENCE_LAYOUT_OPTIONS: Array<{
  value: SiteLayout;
  label: string;
  summary: string;
}> = [
  {
    value: "editorial",
    label: "Editorial",
    summary: "Article-first, reading-first composition for deep reviews and stories.",
  },
  {
    value: "gazette",
    label: "Gazette",
    summary: "Front-page publication rhythm for home, category, and story hubs.",
  },
  {
    value: "marketplace",
    label: "Marketplace",
    summary: "Commerce-forward composition for offers, products, and buy paths.",
  },
  {
    value: "atlas",
    label: "Atlas",
    summary: "Browse-and-discover structure for maps, local routes, and networks.",
  },
];

export const EXPERIENCE_PAGE_OPTIONS: Array<{
  key: ExperiencePageKey;
  label: string;
  pathname: string;
  summary: string;
}> = [
  {
    key: "home",
    label: "Home",
    pathname: "/",
    summary: "Flagship front door and first brand impression.",
  },
  {
    key: "article",
    label: "Article",
    pathname:
      "/articles/avalon-organic-chocolate-milk-the-gold-standard-in-a-glass-bottle",
    summary: "Canonical long-form review surface.",
  },
  {
    key: "articles",
    label: "Articles",
    pathname: "/articles",
    summary: "Article index and publication archive.",
  },
  {
    key: "products",
    label: "Products",
    pathname: "/products",
    summary: "Product atlas and review-linked catalog surface.",
  },
  {
    key: "offers",
    label: "Offers",
    pathname: "/offers",
    summary: "Unread-deal energy, offer inboxes, and local buy routes.",
  },
  {
    key: "map",
    label: "Map",
    pathname: "/map",
    summary: "Store atlas, local routes, and regional discovery.",
  },
  {
    key: "discover",
    label: "Discover",
    pathname: "/discover",
    summary: "Mixed discovery surface for articles, products, and stores.",
  },
  {
    key: "community",
    label: "Community",
    pathname: "/community",
    summary: "Reader and contributor participation layer.",
  },
  {
    key: "about",
    label: "About",
    pathname: "/about",
    summary: "Brand narrative and mission framing.",
  },
  {
    key: "account",
    label: "Account",
    pathname: "/account",
    summary: "Member controls, balances, and saved-signal surfaces.",
  },
];

export const EXPERIENCE_PAGE_KEYS = EXPERIENCE_PAGE_OPTIONS.map(
  (page) => page.key,
) as ExperiencePageKey[];

export const EXPERIENCE_PRESET_REGISTRY: ExperiencePreset[] = [
  {
    slug: "black-classic-editorial",
    name: "Black / Classic / Editorial",
    theme: "black",
    edition: "classic",
    layout: "editorial",
    status: "flagship",
    summary: "The restrained Wheat & Stone baseline. Quiet black publication authority.",
    supportedPages: ["home", "article", "articles", "discover", "about", "account"],
  },
  {
    slug: "grey-classic-editorial",
    name: "Grey / Classic / Editorial",
    theme: "grey",
    edition: "classic",
    layout: "editorial",
    status: "active",
    summary: "A softer editorial variant for calmer reading and cleaner contrast.",
    supportedPages: ["home", "article", "articles", "discover", "about", "account"],
  },
  {
    slug: "walnut-rustic-gazette",
    name: "Walnut / Rustic / Gazette",
    theme: "walnut",
    edition: "rustic",
    layout: "gazette",
    status: "active",
    summary: "Warm founder-homepage energy with heritage texture and front-page rhythm.",
    supportedPages: ["home", "articles", "discover", "community", "about"],
  },
  {
    slug: "sepia-rustic-editorial",
    name: "Sepia / Rustic / Editorial",
    theme: "sepia",
    edition: "rustic",
    layout: "editorial",
    status: "active",
    summary: "Long-form storytelling mode for slower reading and tactile product stories.",
    supportedPages: ["article", "articles", "about", "account"],
  },
  {
    slug: "black-modern-marketplace",
    name: "Black / Modern / Marketplace",
    theme: "black",
    edition: "modern",
    layout: "marketplace",
    status: "active",
    summary: "The premium gradient-ready commerce surface for products and offers.",
    supportedPages: ["products", "offers", "discover", "home"],
  },
  {
    slug: "white-modern-gazette",
    name: "White / Modern / Gazette",
    theme: "white",
    edition: "modern",
    layout: "gazette",
    status: "draft",
    summary: "Founder-clean publication mode with more breathing room and lighter presentation.",
    supportedPages: ["home", "articles", "discover", "about"],
  },
  {
    slug: "midnight-operator-atlas",
    name: "Midnight / Operator / Atlas",
    theme: "midnight",
    edition: "operator",
    layout: "atlas",
    status: "active",
    summary: "Map and discovery mode with TMail-style control-room precision.",
    supportedPages: ["map", "discover", "community", "account"],
  },
  {
    slug: "midnight-operator-marketplace",
    name: "Midnight / Operator / Marketplace",
    theme: "midnight",
    edition: "operator",
    layout: "marketplace",
    status: "draft",
    summary: "Forward-looking marketplace mode for future command-center commerce surfaces.",
    supportedPages: ["products", "offers", "account"],
  },
];

export function toExperiencePresetOption(preset: ExperiencePreset): ExperiencePresetOption {
  return {
    value: preset.slug,
    label: preset.name,
    summary: preset.summary,
    status: preset.status,
    theme: preset.theme,
    edition: preset.edition,
    layout: preset.layout,
    supportedPages: preset.supportedPages,
  };
}

export const EXPERIENCE_PRESET_OPTIONS = EXPERIENCE_PRESET_REGISTRY.map(toExperiencePresetOption);

export const EXPERIENCE_PAGE_DEFAULT_PRESETS: Record<ExperiencePageKey, string> = {
  home: "walnut-rustic-gazette",
  article: "black-classic-editorial",
  articles: "walnut-rustic-gazette",
  products: "black-modern-marketplace",
  offers: "black-modern-marketplace",
  map: "midnight-operator-atlas",
  discover: "midnight-operator-atlas",
  community: "walnut-rustic-gazette",
  about: "black-classic-editorial",
  account: "black-classic-editorial",
};

const EDITION_SET = new Set<SiteEdition>(
  EXPERIENCE_EDITION_OPTIONS.map((option) => option.value),
);
const LAYOUT_SET = new Set<SiteLayout>(
  EXPERIENCE_LAYOUT_OPTIONS.map((option) => option.value),
);
const SYSTEM_PRESET_MAP = new Map(
  EXPERIENCE_PRESET_REGISTRY.map((preset) => [preset.slug, preset] as const),
);
const PRESET_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LEGACY_PRESET_ALIASES: Record<string, string> = {
  "brown-rustic-gazette": "walnut-rustic-gazette",
  "blue-operator-atlas": "midnight-operator-atlas",
  "blue-operator-marketplace": "midnight-operator-marketplace",
};

const LEGACY_EDITION_ALIASES: Record<string, SiteEdition> = {
  v1: "classic",
  v2: "rustic",
  v3: "modern",
  v4: "operator",
  classic: "classic",
  rustic: "rustic",
  modern: "modern",
  operator: "operator",
};

const LEGACY_LAYOUT_ALIASES: Record<string, SiteLayout> = {
  editorial: "editorial",
  marketplace: "marketplace",
  "field-notes": "gazette",
  signal: "atlas",
  gazette: "gazette",
  atlas: "atlas",
};

export function normalizeEdition(value: string | null | undefined): SiteEdition | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  const mapped = LEGACY_EDITION_ALIASES[normalized] ?? null;
  return mapped && EDITION_SET.has(mapped) ? mapped : null;
}

export function normalizeLayout(value: string | null | undefined): SiteLayout | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  const mapped = LEGACY_LAYOUT_ALIASES[normalized] ?? null;
  return mapped && LAYOUT_SET.has(mapped) ? mapped : null;
}

function buildPresetRegistry(customPresets: ExperiencePreset[] = []) {
  return [...EXPERIENCE_PRESET_REGISTRY, ...customPresets];
}

function buildPresetMap(customPresets: ExperiencePreset[] = []) {
  return new Map(
    buildPresetRegistry(customPresets).map((preset) => [preset.slug, preset] as const),
  );
}

export function getEditionLabel(edition: SiteEdition | null | undefined): string {
  return (
    EXPERIENCE_EDITION_OPTIONS.find((option) => option.value === edition)?.label ?? "Classic"
  );
}

export function getLayoutLabel(layout: SiteLayout | null | undefined): string {
  return EXPERIENCE_LAYOUT_OPTIONS.find((option) => option.value === layout)?.label ?? "Editorial";
}

export function buildExperiencePresetName(input: {
  theme: ThemeMode;
  edition: SiteEdition;
  layout: SiteLayout;
}) {
  return `${getThemeLabel(input.theme)} / ${getEditionLabel(input.edition)} / ${getLayoutLabel(input.layout)}`;
}

export function buildSavedExperiencePreset(input: SavedExperiencePresetInput): ExperiencePreset {
  return {
    slug: input.slug,
    name: input.name,
    theme: input.theme,
    edition: input.edition,
    layout: input.layout,
    status: "saved",
    summary: `Saved ${getEditionLabel(input.edition).toLowerCase()} ${getLayoutLabel(input.layout).toLowerCase()} blend in ${getThemeLabel(input.theme).toLowerCase()}.`,
    supportedPages: EXPERIENCE_PAGE_KEYS,
  };
}

export function buildExperiencePresetOptions(
  customPresets: ExperiencePreset[] = [],
): ExperiencePresetOption[] {
  return buildPresetRegistry(customPresets).map(toExperiencePresetOption);
}

export function normalizePresetSlug(
  value: string | null | undefined,
  customPresets: ExperiencePreset[] = [],
): string | null {
  if (!value) {
    return null;
  }

  const raw = value.trim().toLowerCase();
  const normalized = LEGACY_PRESET_ALIASES[raw] ?? raw;
  if (!PRESET_SLUG_PATTERN.test(normalized)) {
    return null;
  }

  const presetMap = buildPresetMap(customPresets);
  if (presetMap.has(normalized) || SYSTEM_PRESET_MAP.has(normalized)) {
    return normalized;
  }

  return normalized;
}

export function defaultEdition(): SiteEdition {
  return "classic";
}

export function defaultLayout(): SiteLayout {
  return "editorial";
}

export function defaultPreset(): string {
  return "black-classic-editorial";
}

export function legacySiteVersionForEdition(edition: SiteEdition): string {
  if (edition === "classic") return "v1";
  if (edition === "rustic") return "v2";
  if (edition === "modern") return "v3";
  return "v4";
}

export function legacySkinForLayout(layout: SiteLayout): string {
  if (layout === "marketplace") return "marketplace";
  if (layout === "gazette") return "field-notes";
  if (layout === "atlas") return "signal";
  return "editorial";
}

export function getExperiencePreset(
  presetSlug: string | null | undefined,
  customPresets: ExperiencePreset[] = [],
) {
  const normalized = normalizePresetSlug(presetSlug, customPresets);
  if (!normalized) {
    return null;
  }

  return buildPresetMap(customPresets).get(normalized) ?? null;
}

export function getExperiencePageOption(pageKey: ExperiencePageKey | string | null | undefined) {
  if (!pageKey) {
    return null;
  }

  return EXPERIENCE_PAGE_OPTIONS.find((page) => page.key === pageKey) ?? null;
}

function scorePresetMatch(input: {
  preset: ExperiencePreset;
  theme: ThemeMode | null;
  edition: SiteEdition;
  layout: SiteLayout;
  page: ExperiencePageKey | null;
}) {
  let score = 0;
  if (input.preset.edition === input.edition) score += 5;
  if (input.preset.layout === input.layout) score += 4;
  if (input.theme && input.preset.theme === input.theme) score += 2;
  if (input.page && input.preset.supportedPages.includes(input.page)) score += 6;
  if (input.preset.status === "flagship") score += 1;
  return score;
}

export function recommendPresetForSelection(input?: {
  theme?: ThemeMode | null;
  edition?: SiteEdition | null;
  layout?: SiteLayout | null;
  page?: ExperiencePageKey | null;
}, options?: { customPresets?: ExperiencePreset[] }) {
  const theme = input?.theme ?? null;
  const edition = input?.edition ?? defaultEdition();
  const layout = input?.layout ?? defaultLayout();
  const page = input?.page ?? null;
  const presetRegistry = buildPresetRegistry(options?.customPresets ?? []);

  const candidates = presetRegistry.slice().sort(
    (left, right) =>
      scorePresetMatch({ preset: right, theme, edition, layout, page }) -
      scorePresetMatch({ preset: left, theme, edition, layout, page }),
  );

  const pageDefault = page
    ? getExperiencePreset(EXPERIENCE_PAGE_DEFAULT_PRESETS[page], options?.customPresets)
    : null;
  return (
    candidates[0] ??
    pageDefault ??
    getExperiencePreset(defaultPreset(), options?.customPresets)!
  );
}

export function resolveExperienceSelection(input?: {
  theme?: ThemeMode | null;
  edition?: SiteEdition | null;
  layout?: SiteLayout | null;
  preset?: string | null;
  page?: ExperiencePageKey | null;
}, options?: { customPresets?: ExperiencePreset[] }) {
  const customPresets = options?.customPresets ?? [];
  const presetRegistry = buildPresetRegistry(customPresets);
  const basePreset =
    getExperiencePreset(input?.preset, customPresets) ??
    (input?.page
      ? getExperiencePreset(EXPERIENCE_PAGE_DEFAULT_PRESETS[input.page], customPresets)
      : null) ??
    getExperiencePreset(defaultPreset(), customPresets);

  const theme = input?.theme ?? basePreset?.theme ?? "black";
  const edition = input?.edition ?? basePreset?.edition ?? defaultEdition();
  const layout = input?.layout ?? basePreset?.layout ?? defaultLayout();
  const explicitPreset =
    input?.preset ? getExperiencePreset(input.preset, customPresets) : null;
  const matchedPreset =
    (explicitPreset &&
    explicitPreset.theme === theme &&
    explicitPreset.edition === edition &&
    explicitPreset.layout === layout &&
    (!input?.page || explicitPreset.supportedPages.includes(input.page))
      ? explicitPreset
      : null) ??
    presetRegistry.find(
      (preset) =>
        preset.theme === theme &&
        preset.edition === edition &&
        preset.layout === layout &&
        (!input?.page || preset.supportedPages.includes(input.page)),
    ) ??
    null;
  const recommendedPreset = matchedPreset ?? recommendPresetForSelection({
    theme,
    edition,
    layout,
    page: input?.page ?? null,
  }, { customPresets });

  return {
    theme,
    edition,
    layout,
    preset: recommendedPreset.slug,
    presetName: recommendedPreset.name,
    presetMatched: Boolean(matchedPreset),
  };
}
