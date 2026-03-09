import { Prisma } from "@prisma/client";
import {
  defaultSiteVersion,
  defaultSkin,
  normalizeSiteVersion,
  normalizeSkin,
  type SiteSkin,
  type SiteVersion,
} from "@/lib/experiencePreferences";
import { normalizeTheme, type ThemeMode } from "@/lib/theme";

export const EXPERIENCE_HISTORY_LIMIT = 12;
export const DEFAULT_DIGEST_CADENCE_HOURS = 168;
export const MIN_DIGEST_CADENCE_HOURS = 6;
export const MAX_DIGEST_CADENCE_HOURS = 24 * 14;

export type UserExperienceSnapshot = {
  profileImageUrl: string | null;
  theme: ThemeMode;
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

export function resolveUserExperienceSnapshot(input: {
  profileImageUrl?: string | null;
  activeTheme?: string | null;
  activeSkin?: string | null;
  activeSiteVersion?: string | null;
  activeExperiencePackId?: string | null;
  personalDigestEnabled?: boolean | null;
  digestCadenceHours?: number | null;
  lastDigestAt?: Date | string | null;
  lastSeenAt?: Date | string | null;
  lastSeenPath?: string | null;
}): UserExperienceSnapshot {
  const toIso = (value: Date | string | null | undefined): string | null => {
    if (!value) {
      return null;
    }

    const parsed = value instanceof Date ? value : new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
  };

  return {
    profileImageUrl: input.profileImageUrl ?? null,
    theme: normalizeTheme(input.activeTheme) ?? "gray",
    skin: normalizeSkin(input.activeSkin) ?? defaultSkin(),
    siteVersion: normalizeSiteVersion(input.activeSiteVersion) ?? defaultSiteVersion(),
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
  if (preferenceKey === "skin") return "Skin";
  if (preferenceKey === "siteVersion") return "Site version";
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
