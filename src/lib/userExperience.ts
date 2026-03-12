import { Prisma } from "@prisma/client";
import {
  type SiteSkin,
  type SiteVersion,
} from "@/lib/experiencePreferences";
import {
  buildSavedExperiencePreset,
  normalizeEdition,
  normalizeLayout,
  resolveExperienceSelection,
  type ExperiencePreset,
  type SiteLayout,
} from "@/lib/experienceSystem";
import { normalizeTheme, type ThemeMode } from "@/lib/theme";

export const EXPERIENCE_HISTORY_LIMIT = 12;
export const DEFAULT_DIGEST_CADENCE_HOURS = 168;
export const MIN_DIGEST_CADENCE_HOURS = 6;
export const MAX_DIGEST_CADENCE_HOURS = 24 * 14;

export type UserExperienceSnapshot = {
  profileImageUrl: string | null;
  theme: ThemeMode;
  layout: SiteSkin;
  edition: SiteVersion;
  preset: string;
  activePresetSlug: string | null;
  savedPresets: UserSavedExperiencePreset[];
  skin: SiteSkin;
  siteVersion: SiteVersion;
  experiencePackId: string | null;
  personalDigestEnabled: boolean;
  digestCadenceHours: number;
  lastDigestAt: string | null;
  lastSeenAt: string | null;
  lastSeenPath: string | null;
};

export type ExperienceHistoryRecord = {
  id: string;
  preferenceKey: string;
  previousValue: string | null;
  nextValue: string;
  sourceContext: string | null;
  createdAt: string;
};

export type UserSavedExperiencePreset = {
  slug: string;
  name: string;
  theme: ThemeMode;
  layout: SiteLayout;
  edition: SiteVersion;
  createdAt: string | null;
  updatedAt: string | null;
};

export function normalizeProfileImageUrl(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (
    trimmed.startsWith("/") ||
    /^https?:\/\//i.test(trimmed) ||
    /^data:image\//i.test(trimmed)
  ) {
    return trimmed.slice(0, 2000);
  }

  return null;
}

export function normalizeDigestCadenceHours(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.min(
    MAX_DIGEST_CADENCE_HOURS,
    Math.max(MIN_DIGEST_CADENCE_HOURS, Math.round(parsed)),
  );
}

export function parseBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }

  return null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

export function parseSavedExperiencePresets(
  value: Prisma.JsonValue | null | undefined,
): UserSavedExperiencePreset[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const parsed: UserSavedExperiencePreset[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }

    const record = item as Record<string, unknown>;
    const slug = typeof record.slug === "string" ? record.slug.trim().toLowerCase() : "";
    const name = typeof record.name === "string" ? record.name.trim() : "";
    const theme = normalizeTheme(typeof record.theme === "string" ? record.theme : null);
    const layout =
      typeof record.layout === "string" ? normalizeLayout(record.layout) : null;
    const edition =
      typeof record.edition === "string" ? normalizeEdition(record.edition) : null;

    if (!slug || !name || !theme || !layout || !edition) {
      continue;
    }

    parsed.push({
      slug,
      name,
      theme,
      layout,
      edition,
      createdAt: toIso(record.createdAt as string | null | undefined),
      updatedAt: toIso(record.updatedAt as string | null | undefined),
    });
  }

  return parsed;
}

export function serializeSavedExperiencePresets(
  presets: UserSavedExperiencePreset[],
): Prisma.InputJsonValue {
  return presets.map((preset) => ({
    slug: preset.slug,
    name: preset.name,
    theme: preset.theme,
    layout: preset.layout,
    edition: preset.edition,
    createdAt: preset.createdAt,
    updatedAt: preset.updatedAt,
  })) as Prisma.InputJsonValue;
}

export function buildSavedExperiencePresetCatalog(
  presets: UserSavedExperiencePreset[],
): ExperiencePreset[] {
  return presets.map((preset) =>
    buildSavedExperiencePreset({
      slug: preset.slug,
      name: preset.name,
      theme: preset.theme,
      layout: preset.layout,
      edition: preset.edition,
    }),
  );
}

export function resolveUserExperienceSnapshot(input: {
  profileImageUrl?: string | null;
  activeTheme?: string | null;
  activeSkin?: string | null;
  activeSiteVersion?: string | null;
  activePresetSlug?: string | null;
  savedPresets?: Prisma.JsonValue | null;
  activeExperiencePackId?: string | null;
  personalDigestEnabled?: boolean | null;
  digestCadenceHours?: number | null;
  lastDigestAt?: Date | string | null;
  lastSeenAt?: Date | string | null;
  lastSeenPath?: string | null;
}): UserExperienceSnapshot {
  const savedPresets = parseSavedExperiencePresets(input.savedPresets);
  const customPresetCatalog = buildSavedExperiencePresetCatalog(savedPresets);
  const experience = resolveExperienceSelection(
    {
      theme: normalizeTheme(input.activeTheme) ?? null,
      layout: normalizeLayout(input.activeSkin) ?? null,
      edition: normalizeEdition(input.activeSiteVersion) ?? null,
      preset: input.activePresetSlug ?? null,
    },
    { customPresets: customPresetCatalog },
  );

  return {
    profileImageUrl: input.profileImageUrl ?? null,
    theme: experience.theme,
    layout: experience.layout,
    edition: experience.edition,
    preset: experience.preset,
    activePresetSlug: input.activePresetSlug ?? null,
    savedPresets,
    skin: experience.layout,
    siteVersion: experience.edition,
    experiencePackId: input.activeExperiencePackId ?? null,
    personalDigestEnabled: input.personalDigestEnabled ?? true,
    digestCadenceHours:
      normalizeDigestCadenceHours(input.digestCadenceHours) ?? DEFAULT_DIGEST_CADENCE_HOURS,
    lastDigestAt: toIso(input.lastDigestAt),
    lastSeenAt: toIso(input.lastSeenAt),
    lastSeenPath: input.lastSeenPath ?? null,
  };
}

export function serializeExperienceHistory(
  rows: Array<{
    id: string;
    preferenceKey: string;
    previousValue: string | null;
    nextValue: string;
    sourceContext: string | null;
    createdAt: Date;
  }>,
): ExperienceHistoryRecord[] {
  return rows.map((row) => ({
    id: row.id,
    preferenceKey: row.preferenceKey,
    previousValue: row.previousValue,
    nextValue: row.nextValue,
    sourceContext: row.sourceContext,
    createdAt: row.createdAt.toISOString(),
  }));
}

export function historyLabel(preferenceKey: string): string {
  if (preferenceKey === "theme") return "Theme";
  if (preferenceKey === "skin" || preferenceKey === "layout") return "Layout";
  if (preferenceKey === "siteVersion" || preferenceKey === "edition") return "Edition";
  if (preferenceKey === "preset") return "Preset";
  if (preferenceKey === "savedPreset") return "Saved preset";
  if (preferenceKey === "experiencePack") return "Experience pack";
  if (preferenceKey === "profileImageUrl") return "Profile image";
  if (preferenceKey === "personalDigestEnabled") return "Digest";
  if (preferenceKey === "digestCadenceHours") return "Digest cadence";
  return preferenceKey;
}

export function buildExperienceHistoryCreates(input: {
  userId: string;
  current: UserExperienceSnapshot;
  next: Partial<UserExperienceSnapshot>;
  sourceContext?: string | null;
}): Prisma.UserExperienceHistoryCreateManyInput[] {
  const rows: Prisma.UserExperienceHistoryCreateManyInput[] = [];

  const maybePush = (
    preferenceKey: string,
    previousValue: string | null,
    nextValue: string | null,
    metadata?: Record<string, unknown>,
  ) => {
    if (nextValue === null || previousValue === nextValue) {
      return;
    }

    rows.push({
      userId: input.userId,
      preferenceKey,
      previousValue,
      nextValue,
      sourceContext: input.sourceContext ?? null,
      metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
    });
  };

  maybePush("theme", input.current.theme, input.next.theme ?? null);
  maybePush("skin", input.current.skin, input.next.skin ?? null);
  maybePush("siteVersion", input.current.siteVersion, input.next.siteVersion ?? null);
  maybePush("preset", input.current.activePresetSlug, input.next.activePresetSlug ?? null);
  maybePush(
    "profileImageUrl",
    input.current.profileImageUrl,
    input.next.profileImageUrl ?? null,
  );
  if (typeof input.next.personalDigestEnabled === "boolean") {
    maybePush(
      "personalDigestEnabled",
      input.current.personalDigestEnabled ? "true" : "false",
      input.next.personalDigestEnabled ? "true" : "false",
    );
  }
  if (typeof input.next.digestCadenceHours === "number") {
    maybePush(
      "digestCadenceHours",
      String(input.current.digestCadenceHours),
      String(input.next.digestCadenceHours),
      {
        units: "hours",
      },
    );
  }

  return rows;
}
