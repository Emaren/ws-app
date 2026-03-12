import {
  applyThemeToDocument,
  normalizeTheme,
  THEME_STORAGE_KEY,
  type ThemeMode,
} from "@/lib/theme";
import {
  defaultEdition,
  defaultLayout,
  defaultPreset,
  EXPERIENCE_EDITION_OPTIONS,
  EXPERIENCE_LAYOUT_OPTIONS,
  EXPERIENCE_PAGE_OPTIONS,
  EXPERIENCE_PAGE_DEFAULT_PRESETS,
  EXPERIENCE_PRESET_OPTIONS,
  legacySiteVersionForEdition,
  legacySkinForLayout,
  normalizeEdition,
  normalizeLayout,
  normalizePresetSlug,
  resolveExperienceSelection,
  type ExperiencePageKey,
  type SiteEdition,
  type SiteLayout,
} from "@/lib/experienceSystem";

export type {
  ExperiencePageKey,
  SiteEdition,
  SiteLayout,
} from "@/lib/experienceSystem";

export type SiteSkin = SiteLayout;
export type SiteVersion = SiteEdition;

export const SKIN_STORAGE_KEY = "ws:skin";
export const SITE_VERSION_STORAGE_KEY = "ws:site-version";
export const LAYOUT_STORAGE_KEY = "ws:layout";
export const EDITION_STORAGE_KEY = "ws:edition";
export const PRESET_STORAGE_KEY = "ws:preset";

export const SITE_LAYOUT_OPTIONS = EXPERIENCE_LAYOUT_OPTIONS;
export const SITE_EDITION_OPTIONS = EXPERIENCE_EDITION_OPTIONS;
export const SITE_PRESET_OPTIONS = EXPERIENCE_PRESET_OPTIONS;
export const EXPERIENCE_PAGE_CATALOG = EXPERIENCE_PAGE_OPTIONS;
export const EXPERIENCE_PAGE_DEFAULT_PRESET_MAP = EXPERIENCE_PAGE_DEFAULT_PRESETS;

// Backward-compatible exports for older callers while the product language shifts.
export const SITE_SKIN_OPTIONS = SITE_LAYOUT_OPTIONS;
export const SITE_VERSION_OPTIONS = SITE_EDITION_OPTIONS;

export type ExperiencePreferenceSnapshot = {
  theme: ThemeMode;
  layout: SiteLayout;
  edition: SiteEdition;
  preset: string;
  skin: SiteLayout;
  siteVersion: SiteEdition;
};

type ExperiencePreferenceInput = Partial<{
  theme: ThemeMode | string | null;
  layout: SiteLayout | string | null;
  edition: SiteEdition | string | null;
  preset: string | null;
  skin: SiteLayout | string | null;
  siteVersion: SiteEdition | string | null;
}>;

function storageGet(key: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {}
}

export function normalizeSkin(value: string | null | undefined): SiteSkin | null {
  return normalizeLayout(value);
}

export function normalizeSiteVersion(value: string | null | undefined): SiteVersion | null {
  return normalizeEdition(value);
}

export function normalizeLayoutSelection(
  value: string | null | undefined,
): SiteLayout | null {
  return normalizeLayout(value);
}

export function normalizeEditionSelection(
  value: string | null | undefined,
): SiteEdition | null {
  return normalizeEdition(value);
}

export function normalizePresetSelection(value: string | null | undefined): string | null {
  return normalizePresetSlug(value);
}

export function defaultSkin(): SiteSkin {
  return defaultLayout();
}

export function defaultSiteVersion(): SiteVersion {
  return defaultEdition();
}

export function defaultLayoutSelection(): SiteLayout {
  return defaultLayout();
}

export function defaultEditionSelection(): SiteEdition {
  return defaultEdition();
}

export function defaultPresetSelection(): string {
  return defaultPreset();
}

export function readSkinFromStorage(): SiteSkin | null {
  return normalizeSkin(storageGet(LAYOUT_STORAGE_KEY) ?? storageGet(SKIN_STORAGE_KEY));
}

export function readSiteVersionFromStorage(): SiteVersion | null {
  return normalizeSiteVersion(
    storageGet(EDITION_STORAGE_KEY) ?? storageGet(SITE_VERSION_STORAGE_KEY),
  );
}

export function readLayoutFromStorage(): SiteLayout | null {
  return readSkinFromStorage();
}

export function readEditionFromStorage(): SiteEdition | null {
  return readSiteVersionFromStorage();
}

export function readPresetFromStorage(): string | null {
  return normalizePresetSelection(storageGet(PRESET_STORAGE_KEY));
}

export function persistSkin(skin: SiteSkin): void {
  persistLayout(skin);
}

export function persistSiteVersion(siteVersion: SiteVersion): void {
  persistEdition(siteVersion);
}

export function persistLayout(layout: SiteLayout): void {
  storageSet(LAYOUT_STORAGE_KEY, layout);
  storageSet(SKIN_STORAGE_KEY, legacySkinForLayout(layout));
}

export function persistEdition(edition: SiteEdition): void {
  storageSet(EDITION_STORAGE_KEY, edition);
  storageSet(SITE_VERSION_STORAGE_KEY, legacySiteVersionForEdition(edition));
}

export function persistPreset(preset: string): void {
  storageSet(PRESET_STORAGE_KEY, preset);
}

export function readSkinFromDocument(): SiteSkin | null {
  if (typeof document === "undefined") {
    return null;
  }

  const html = document.documentElement;
  return normalizeSkin(
    html.getAttribute("data-layout") ?? html.getAttribute("data-skin"),
  );
}

export function readSiteVersionFromDocument(): SiteVersion | null {
  if (typeof document === "undefined") {
    return null;
  }

  const html = document.documentElement;
  return normalizeSiteVersion(
    html.getAttribute("data-edition") ?? html.getAttribute("data-site-version"),
  );
}

export function readLayoutFromDocument(): SiteLayout | null {
  return readSkinFromDocument();
}

export function readEditionFromDocument(): SiteEdition | null {
  return readSiteVersionFromDocument();
}

export function readPresetFromDocument(): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  return normalizePresetSelection(document.documentElement.getAttribute("data-preset"));
}

export function resolveExperienceSnapshot(
  input?: ExperiencePreferenceInput & {
    page?: ExperiencePageKey | null;
  },
): ExperiencePreferenceSnapshot {
  const theme = normalizeTheme(String(input?.theme ?? "")) ?? normalizeTheme(null) ?? "black";
  const layout =
    normalizeLayoutSelection(String(input?.layout ?? input?.skin ?? "")) ?? defaultLayout();
  const edition =
    normalizeEditionSelection(String(input?.edition ?? input?.siteVersion ?? "")) ??
    defaultEdition();
  const preset =
    normalizePresetSelection(input?.preset ?? null) ??
    readPresetFromDocument() ??
    readPresetFromStorage() ??
    defaultPreset();
  const resolved = resolveExperienceSelection({
    theme,
    layout,
    edition,
    preset,
    page: input?.page ?? null,
  });

  return {
    theme: resolved.theme,
    layout: resolved.layout,
    edition: resolved.edition,
    preset: resolved.preset,
    skin: resolved.layout,
    siteVersion: resolved.edition,
  };
}

export function applyExperienceToDocument(input: ExperiencePreferenceInput): void {
  if (typeof document === "undefined") {
    return;
  }

  const snapshot = resolveExperienceSnapshot(input);
  applyThemeToDocument(snapshot.theme);

  const html = document.documentElement;
  html.setAttribute("data-layout", snapshot.layout);
  html.setAttribute("data-skin", legacySkinForLayout(snapshot.layout));
  html.setAttribute("data-edition", snapshot.edition);
  html.setAttribute("data-site-version", legacySiteVersionForEdition(snapshot.edition));
  html.setAttribute("data-preset", snapshot.preset);
}

export function readExperienceFromClientStorage(): ExperiencePreferenceSnapshot {
  return resolveExperienceSnapshot({
    theme: storageGet(THEME_STORAGE_KEY),
    layout: storageGet(LAYOUT_STORAGE_KEY) ?? storageGet(SKIN_STORAGE_KEY),
    edition: storageGet(EDITION_STORAGE_KEY) ?? storageGet(SITE_VERSION_STORAGE_KEY),
    preset: storageGet(PRESET_STORAGE_KEY),
  });
}

export function persistExperienceSnapshot(snapshot: ExperiencePreferenceSnapshot): void {
  storageSet(THEME_STORAGE_KEY, snapshot.theme);
  persistLayout(snapshot.layout);
  persistEdition(snapshot.edition);
  persistPreset(snapshot.preset);
}

export function readExperiencePreviewOverrideFromUrl(
  value?: string | URLSearchParams | null,
): ExperiencePreferenceSnapshot | null {
  let params: URLSearchParams | null = null;

  if (value instanceof URLSearchParams) {
    params = value;
  } else if (typeof value === "string") {
    params = new URLSearchParams(value.startsWith("?") ? value : `?${value}`);
  } else if (typeof window !== "undefined") {
    params = new URLSearchParams(window.location.search);
  }

  if (!params || params.get("ws-preview") !== "1") {
    return null;
  }

  const theme = normalizeTheme(params.get("ws-theme"));
  const edition = normalizeEditionSelection(params.get("ws-edition"));
  const layout = normalizeLayoutSelection(params.get("ws-layout"));
  const preset = normalizePresetSelection(params.get("ws-preset"));

  if (!theme && !edition && !layout && !preset) {
    return null;
  }

  return resolveExperienceSnapshot({
    theme,
    edition,
    layout,
    preset,
  });
}

export function hasExperiencePreviewOverride(value?: string | URLSearchParams | null): boolean {
  return Boolean(readExperiencePreviewOverrideFromUrl(value));
}
