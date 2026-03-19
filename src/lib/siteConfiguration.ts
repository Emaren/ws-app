import type { Prisma } from "@prisma/client";
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
import {
  DEFAULT_DELIVERY_PAYMENT_CONFIG,
  DEFAULT_DELIVERY_PAYMENT_INSTRUCTIONS,
  DEFAULT_DELIVERY_PAYMENT_SUMMARY,
  DEFAULT_DELIVERY_PAYMENT_TITLE,
  type SiteDeliveryPaymentConfig,
  type SiteDeliveryPaymentMethod,
} from "@/lib/siteConfigurationShared";

const SITE_CONFIGURATION_SINGLETON_ID = "global";
const HOME_PAGE_DEFAULT_PRESET = EXPERIENCE_PAGE_DEFAULT_PRESETS.home;
const MAX_DELIVERY_PAYMENT_METHODS = 8;

type SiteConfigurationRow = {
  homePagePresetSlug: string;
  deliveryPaymentConfig: Prisma.JsonValue | null;
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
  deliveryPaymentConfig: SiteDeliveryPaymentConfig;
};

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function normalizeFreeText(
  value: unknown,
  fallback: string,
  maxLength: number,
): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  return trimmed.slice(0, maxLength);
}

function normalizeOptionalText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
}

function normalizeTokenSymbol(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z0-9]{2,16}$/.test(normalized)) {
    return null;
  }

  return normalized;
}

function normalizeDeliveryPaymentMethod(
  value: unknown,
  index: number,
): SiteDeliveryPaymentMethod | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const label = normalizeOptionalText(record.label, 80);
  const tokenSymbol = normalizeTokenSymbol(record.tokenSymbol);
  const network = normalizeOptionalText(record.network, 60);
  const address = normalizeOptionalText(record.address, 220);

  if (!label || !tokenSymbol || !network || !address) {
    return null;
  }

  const incomingId = normalizeOptionalText(record.id, 60);
  return {
    id: incomingId ?? `payment-method-${index + 1}`,
    label,
    tokenSymbol,
    network,
    address,
    note: normalizeOptionalText(record.note, 180),
  };
}

export function normalizeDeliveryPaymentConfig(value: unknown): SiteDeliveryPaymentConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_DELIVERY_PAYMENT_CONFIG;
  }

  const record = value as Record<string, unknown>;
  const methods = Array.isArray(record.methods)
    ? record.methods
        .map((method, index) => normalizeDeliveryPaymentMethod(method, index))
        .filter((method): method is SiteDeliveryPaymentMethod => Boolean(method))
        .slice(0, MAX_DELIVERY_PAYMENT_METHODS)
    : [];

  return {
    title: normalizeFreeText(
      record.title,
      DEFAULT_DELIVERY_PAYMENT_TITLE,
      120,
    ),
    summary: normalizeFreeText(
      record.summary,
      DEFAULT_DELIVERY_PAYMENT_SUMMARY,
      420,
    ),
    instructions: normalizeFreeText(
      record.instructions,
      DEFAULT_DELIVERY_PAYMENT_INSTRUCTIONS,
      420,
    ),
    methods,
  };
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
  const deliveryPaymentConfig = normalizeDeliveryPaymentConfig(row?.deliveryPaymentConfig);

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
    deliveryPaymentConfig,
  };
}

async function readSiteConfigurationRow(): Promise<SiteConfigurationRow | null> {
  try {
    return await prisma.siteConfiguration.findUnique({
      where: { id: SITE_CONFIGURATION_SINGLETON_ID },
      select: {
        homePagePresetSlug: true,
        deliveryPaymentConfig: true,
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

export async function getPublicDeliveryPaymentConfiguration(): Promise<SiteDeliveryPaymentConfig> {
  const row = await readSiteConfigurationRow();
  return normalizeDeliveryPaymentConfig(row?.deliveryPaymentConfig);
}

export async function updateSiteConfiguration(input: {
  homePagePresetSlug?: string | null | undefined;
  deliveryPaymentConfig?: unknown;
}): Promise<SiteConfigurationSnapshot> {
  const existing = await readSiteConfigurationRow();

  let normalizedHomePagePreset = resolveHomePagePreset(
    existing?.homePagePresetSlug ?? null,
  ).slug;
  if (input.homePagePresetSlug !== undefined) {
    const nextHomePagePreset = normalizeHomePagePresetSlug(input.homePagePresetSlug);
    if (!nextHomePagePreset) {
      throw new Error("Choose a valid home page preset.");
    }
    normalizedHomePagePreset = nextHomePagePreset;
  }

  const normalizedDeliveryPaymentConfig =
    input.deliveryPaymentConfig === undefined
      ? normalizeDeliveryPaymentConfig(existing?.deliveryPaymentConfig)
      : normalizeDeliveryPaymentConfig(input.deliveryPaymentConfig);

  const row = await prisma.siteConfiguration.upsert({
    where: { id: SITE_CONFIGURATION_SINGLETON_ID },
    create: {
      id: SITE_CONFIGURATION_SINGLETON_ID,
      homePagePresetSlug: normalizedHomePagePreset,
      deliveryPaymentConfig:
        normalizedDeliveryPaymentConfig as unknown as Prisma.InputJsonValue,
    },
    update: {
      homePagePresetSlug: normalizedHomePagePreset,
      deliveryPaymentConfig:
        normalizedDeliveryPaymentConfig as unknown as Prisma.InputJsonValue,
    },
    select: {
      homePagePresetSlug: true,
      deliveryPaymentConfig: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return serializeSiteConfiguration(row);
}
