import {
  applyThemeToDocument,
  normalizeTheme,
  type ThemeMode,
} from "@/lib/theme";

export type SiteSkin = "editorial" | "marketplace" | "field-notes" | "signal";
export type SiteVersion = "v1" | "v2" | "v3" | "v4";

export const SKIN_STORAGE_KEY = "ws:skin";
export const SITE_VERSION_STORAGE_KEY = "ws:site-version";

export const SITE_SKIN_OPTIONS: Array<{
  value: SiteSkin;
  label: string;
  summary: string;
}> = [
  {
    value: "editorial",
    label: "Editorial",
    summary: "Clean magazine-first layout for deep review reading.",
  },
  {
    value: "marketplace",
    label: "Marketplace",
    summary: "Commerce-forward layout tuned for offers and store discovery.",
  },
  {
    value: "field-notes",
    label: "Field Notes",
    summary: "Warm, tactile browsing mode for slower product exploration.",
  },
  {
    value: "signal",
    label: "Signal",
    summary: "Dense, high-contrast mode for power users and ops-heavy browsing.",
  },
];

export const SITE_VERSION_OPTIONS: Array<{
  value: SiteVersion;
  label: string;
  summary: string;
}> = [
  {
    value: "v1",
    label: "Version 1",
    summary: "Current flagship release.",
  },
  {
    value: "v2",
    label: "Version 2",
    summary: "Future alternate front-end track.",
  },
  {
    value: "v3",
    label: "Version 3",
    summary: "Future alternate front-end track.",
  },
  {
    value: "v4",
    label: "Version 4",
    summary: "Future alternate front-end track.",
  },
];

export type ExperiencePreferenceSnapshot = {
  theme: ThemeMode;
  skin: SiteSkin;
  siteVersion: SiteVersion;
};

const SKIN_VALUES = new Set<SiteSkin>(SITE_SKIN_OPTIONS.map((option) => option.value));
const SITE_VERSION_VALUES = new Set<SiteVersion>(
  SITE_VERSION_OPTIONS.map((option) => option.value),
);

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
  if (!value) {
    return null;
  }

  const next = value.trim().toLowerCase() as SiteSkin;
  return SKIN_VALUES.has(next) ? next : null;
}

export function normalizeSiteVersion(
  value: string | null | undefined,
): SiteVersion | null {
  if (!value) {
    return null;
  }

  const next = value.trim().toLowerCase() as SiteVersion;
  return SITE_VERSION_VALUES.has(next) ? next : null;
}

export function defaultSkin(): SiteSkin {
  return "editorial";
}

export function defaultSiteVersion(): SiteVersion {
  return "v1";
}

export function applyExperienceToDocument(input: Partial<ExperiencePreferenceSnapshot>): void {
  if (typeof document === "undefined") {
    return;
  }

  if (input.theme) {
    applyThemeToDocument(input.theme);
  }

  const html = document.documentElement;
  if (input.skin) {
    html.setAttribute("data-skin", input.skin);
  }

  if (input.siteVersion) {
    html.setAttribute("data-site-version", input.siteVersion);
  }
}

export function readSkinFromStorage(): SiteSkin | null {
  return normalizeSkin(storageGet(SKIN_STORAGE_KEY));
}

export function readSiteVersionFromStorage(): SiteVersion | null {
  return normalizeSiteVersion(storageGet(SITE_VERSION_STORAGE_KEY));
}

export function persistSkin(skin: SiteSkin): void {
  storageSet(SKIN_STORAGE_KEY, skin);
}

export function persistSiteVersion(siteVersion: SiteVersion): void {
  storageSet(SITE_VERSION_STORAGE_KEY, siteVersion);
}

export function readSkinFromDocument(): SiteSkin | null {
  if (typeof document === "undefined") {
    return null;
  }

  return normalizeSkin(document.documentElement.getAttribute("data-skin"));
}

export function readSiteVersionFromDocument(): SiteVersion | null {
  if (typeof document === "undefined") {
    return null;
  }

  return normalizeSiteVersion(document.documentElement.getAttribute("data-site-version"));
}

export function resolveExperienceSnapshot(input?: Partial<ExperiencePreferenceSnapshot>) {
  const theme = normalizeTheme(input?.theme) ?? normalizeTheme(null) ?? "gray";
  const skin = normalizeSkin(input?.skin) ?? defaultSkin();
  const siteVersion = normalizeSiteVersion(input?.siteVersion) ?? defaultSiteVersion();

  return {
    theme,
    skin,
    siteVersion,
  } satisfies ExperiencePreferenceSnapshot;
}

export function readExperienceFromClientStorage(): ExperiencePreferenceSnapshot {
  return {
    theme: normalizeTheme(storageGet("theme")) ?? "gray",
    skin: readSkinFromStorage() ?? defaultSkin(),
    siteVersion: readSiteVersionFromStorage() ?? defaultSiteVersion(),
  };
}

export function persistExperienceSnapshot(snapshot: ExperiencePreferenceSnapshot): void {
  storageSet("theme", snapshot.theme);
  persistSkin(snapshot.skin);
  persistSiteVersion(snapshot.siteVersion);
}
