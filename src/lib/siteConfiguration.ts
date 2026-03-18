import { prisma } from "@/lib/prisma";
import {
  EXPERIENCE_PAGE_DEFAULT_PRESETS,
  EXPERIENCE_PRESET_OPTIONS,
  getExperiencePreset,
  normalizePresetSlug,
  type ExperiencePresetStatus,
  type SiteEdition,
  type SiteLayout,
} from "@/lib/experienceSystem";
import type { ThemeMode } from "@/lib/theme";

const SITE_CONFIGURATION_SINGLETON_ID = "global";
const HOME_PAGE_DEFAULT_PRESET = EXPERIENCE_PAGE_DEFAULT_PRESETS.home;

type SiteConfigurationRow = {
  homePagePresetSlug: string;
  createdAt: Date;
  updatedAt: Date;
};

export type SiteConfigurationPresetOption = {
  value: string;
  label: string;
  summary: string;
  status: ExperiencePresetStatus;
  theme: ThemeMode;
  edition: SiteEdition;
  layout: SiteLayout;
  isSystemDefault: boolean;
};

export type SiteConfigurationSnapshot = {
  generatedAt: string;
  createdAt: string | null;
  updatedAt: string | null;
  homePagePresetSlug: string;
  homePagePresetLabel: string;
  homePagePresetSummary: string;
  homePagePresetStatus: ExperiencePresetStatus;
  homePagePresetTheme: ThemeMode;
  homePagePresetEdition: SiteEdition;
  homePagePresetLayout: SiteLayout;
  homePagePresetSource: "stored" | "fallback";
  homePresetOptions: SiteConfigurationPresetOption[];
};

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

export function listHomePagePresetOptions(): SiteConfigurationPresetOption[] {
  return EXPERIENCE_PRESET_OPTIONS.filter((option) => option.supportedPages.includes("home")).map(
    (option) => ({
      value: option.value,
      label: option.label,
      summary: option.summary,
      status: option.status,
      theme: option.theme,
      edition: option.edition,
      layout: option.layout,
      isSystemDefault: option.value === HOME_PAGE_DEFAULT_PRESET,
    }),
  );
}

export function normalizeHomePagePresetSlug(value: string | null | undefined): string | null {
  const normalized = normalizePresetSlug(value);
  if (!normalized) {
    return null;
  }

  const preset = getExperiencePreset(normalized);
  if (!preset || !preset.supportedPages.includes("home")) {
    return null;
  }

  return preset.slug;
}

function resolveHomePagePreset(value: string | null | undefined) {
  const normalized = normalizeHomePagePresetSlug(value) ?? HOME_PAGE_DEFAULT_PRESET;
  return getExperiencePreset(normalized)!;
}

function serializeSiteConfiguration(
  row: SiteConfigurationRow | null,
): SiteConfigurationSnapshot {
  const preset = resolveHomePagePreset(row?.homePagePresetSlug ?? null);

  return {
    generatedAt: new Date().toISOString(),
    createdAt: toIso(row?.createdAt),
    updatedAt: toIso(row?.updatedAt),
    homePagePresetSlug: preset.slug,
    homePagePresetLabel: preset.name,
    homePagePresetSummary: preset.summary,
    homePagePresetStatus: preset.status,
    homePagePresetTheme: preset.theme,
    homePagePresetEdition: preset.edition,
    homePagePresetLayout: preset.layout,
    homePagePresetSource: row ? "stored" : "fallback",
    homePresetOptions: listHomePagePresetOptions(),
  };
}

async function readSiteConfigurationRow(): Promise<SiteConfigurationRow | null> {
  try {
    return await prisma.siteConfiguration.findUnique({
      where: { id: SITE_CONFIGURATION_SINGLETON_ID },
      select: {
        homePagePresetSlug: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (error) {
    console.error("site_configuration_unavailable", {
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function getSiteConfigurationSnapshot(): Promise<SiteConfigurationSnapshot> {
  return serializeSiteConfiguration(await readSiteConfigurationRow());
}

export async function getConfiguredHomePagePresetSlug(): Promise<string> {
  const row = await readSiteConfigurationRow();
  return resolveHomePagePreset(row?.homePagePresetSlug ?? null).slug;
}

export async function updateSiteConfiguration(input: {
  homePagePresetSlug: string | null | undefined;
}): Promise<SiteConfigurationSnapshot> {
  const normalized = normalizeHomePagePresetSlug(input.homePagePresetSlug);
  if (!normalized) {
    throw new Error("Choose a valid home page preset.");
  }

  const row = await prisma.siteConfiguration.upsert({
    where: { id: SITE_CONFIGURATION_SINGLETON_ID },
    create: {
      id: SITE_CONFIGURATION_SINGLETON_ID,
      homePagePresetSlug: normalized,
    },
    update: {
      homePagePresetSlug: normalized,
    },
    select: {
      homePagePresetSlug: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return serializeSiteConfiguration(row);
}
