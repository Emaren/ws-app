import { NextResponse, type NextRequest } from "next/server";
import { getApiAuthContext } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import {
  EXPERIENCE_HISTORY_LIMIT,
  buildSavedExperiencePresetCatalog,
  buildExperienceHistoryCreates,
  normalizeDigestCadenceHours,
  normalizeProfileImageUrl,
  parseSavedExperiencePresets,
  parseBoolean,
  resolveUserExperienceSnapshot,
  serializeSavedExperiencePresets,
  serializeExperienceHistory,
  type UserSavedExperiencePreset,
} from "@/lib/userExperience";
import {
  normalizeEditionSelection,
  normalizeLayoutSelection,
  normalizePresetSelection,
  normalizeSiteVersion,
  normalizeSkin,
} from "@/lib/experiencePreferences";
import {
  buildExperiencePresetName,
  resolveExperienceSelection,
  toExperiencePresetOption,
} from "@/lib/experienceSystem";
import {
  findSelectableExperiencePackById,
  getExperiencePackCatalogItem,
  listSelectableExperiencePacks,
} from "@/lib/experienceStudioServer";
import { normalizeTheme } from "@/lib/theme";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function slugifyPresetName(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "preset"
  );
}

function buildUniqueUserPresetSlug(
  name: string,
  presets: UserSavedExperiencePreset[],
): string {
  const base = `user-${slugifyPresetName(name)}`;
  const existing = new Set(presets.map((preset) => preset.slug));
  if (!existing.has(base)) {
    return base;
  }

  let counter = 2;
  let next = `${base}-${counter}`;
  while (existing.has(next)) {
    counter += 1;
    next = `${base}-${counter}`;
  }

  return next;
}

async function loadPreferencePayload(userId: string) {
  const [profile, history, experiencePackCatalog] = await Promise.all([
    prisma.userExperienceProfile.findUnique({
      where: {
        userId,
      },
    }),
    prisma.userExperienceHistory.findMany({
      where: {
        userId,
      },
      orderBy: [{ createdAt: "desc" }],
      take: EXPERIENCE_HISTORY_LIMIT,
    }),
    listSelectableExperiencePacks(),
  ]);
  const activeExperiencePack = profile?.activeExperiencePackId
    ? await getExperiencePackCatalogItem(profile.activeExperiencePackId)
    : null;
  const resolvedProfile = resolveUserExperienceSnapshot(profile ?? {});
  const userPresetCatalog = buildSavedExperiencePresetCatalog(
    resolvedProfile.savedPresets,
  ).map(toExperiencePresetOption);

  return {
    profile: resolvedProfile,
    activeExperiencePack,
    experiencePackCatalog,
    userPresetCatalog,
    history: serializeExperienceHistory(history),
    generatedAt: new Date().toISOString(),
  };
}

export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext(req);
  if (!auth.token || !auth.userId) {
    return NextResponse.json({ message: "Authentication required" }, { status: 401 });
  }

  return NextResponse.json(await loadPreferencePayload(auth.userId));
}

export async function PATCH(req: NextRequest) {
  const auth = await getApiAuthContext(req);
  if (!auth.token || !auth.userId) {
    return NextResponse.json({ message: "Authentication required" }, { status: 401 });
  }
  const userId = auth.userId;

  const body = (await req.json().catch(() => null)) as
    | {
        theme?: unknown;
        layout?: unknown;
        edition?: unknown;
        skin?: unknown;
        siteVersion?: unknown;
        preset?: unknown;
        experiencePackId?: unknown;
        profileImageUrl?: unknown;
        personalDigestEnabled?: unknown;
        digestCadenceHours?: unknown;
        savePresetName?: unknown;
        sourceContext?: unknown;
      }
    | null;

  const theme =
      body && "theme" in body ? normalizeTheme(String(body.theme ?? "")) : null;
  const layout =
    body && "layout" in body ? normalizeLayoutSelection(String(body.layout ?? "")) : null;
  const edition =
    body && "edition" in body
      ? normalizeEditionSelection(String(body.edition ?? ""))
      : null;
  const skin =
    body && "skin" in body ? normalizeSkin(String(body.skin ?? "")) : null;
  const siteVersion =
    body && "siteVersion" in body
      ? normalizeSiteVersion(String(body.siteVersion ?? ""))
      : null;
  const preset =
    body && "preset" in body ? normalizePresetSelection(String(body.preset ?? "")) : null;
  const experiencePackId =
    body && "experiencePackId" in body
      ? (() => {
          if (body.experiencePackId === null || body.experiencePackId === "") {
            return "";
          }
          return typeof body.experiencePackId === "string"
            ? body.experiencePackId.trim()
            : null;
        })()
      : null;
  const profileImageUrl =
    body && "profileImageUrl" in body
      ? normalizeProfileImageUrl(body.profileImageUrl)
      : null;
  const personalDigestEnabled =
    body && "personalDigestEnabled" in body
      ? parseBoolean(body.personalDigestEnabled)
      : null;
  const digestCadenceHours =
    body && "digestCadenceHours" in body
      ? normalizeDigestCadenceHours(body.digestCadenceHours)
      : null;
  const savePresetName =
    body && "savePresetName" in body && typeof body.savePresetName === "string"
      ? body.savePresetName.trim().slice(0, 80)
      : null;
  const sourceContext =
    body && typeof body.sourceContext === "string" && body.sourceContext.trim()
      ? body.sourceContext.trim().slice(0, 120)
      : null;

  if (
    theme === null &&
    layout === null &&
    edition === null &&
    skin === null &&
    siteVersion === null &&
    preset === null &&
    experiencePackId === null &&
    profileImageUrl === null &&
    personalDigestEnabled === null &&
    digestCadenceHours === null &&
    !savePresetName
  ) {
    return NextResponse.json(
      { message: "No valid preference changes were provided" },
      { status: 400 },
    );
  }

  const existing = await prisma.userExperienceProfile.findUnique({
    where: {
      userId,
    },
  });

  const currentExperiencePack =
    existing?.activeExperiencePackId
      ? await getExperiencePackCatalogItem(existing.activeExperiencePackId)
      : null;
  const savedPresets = parseSavedExperiencePresets(existing?.savedPresets);
  const savedPresetCatalog = buildSavedExperiencePresetCatalog(savedPresets);
  const nextExperiencePack =
    experiencePackId === null
      ? null
      : experiencePackId === ""
        ? null
        : await findSelectableExperiencePackById(experiencePackId);

  if (experiencePackId && !nextExperiencePack) {
    return NextResponse.json(
      { message: "That experience pack is not selectable" },
      { status: 400 },
    );
  }

  const current = resolveUserExperienceSnapshot(existing ?? {});
  const currentPresetSlug = existing?.activePresetSlug ?? current.activePresetSlug;
  const nextExperience =
    theme !== null ||
    layout !== null ||
    edition !== null ||
    skin !== null ||
    siteVersion !== null ||
    preset !== null
      ? resolveExperienceSelection(
          {
            theme: theme ?? current.theme,
            layout: layout ?? skin ?? current.layout,
            edition: edition ?? siteVersion ?? current.edition,
            preset: preset ?? currentPresetSlug ?? current.preset,
          },
          { customPresets: savedPresetCatalog },
        )
      : null;
  let nextSavedPresets = savedPresets;
  let nextActivePresetSlug =
    nextExperience && nextExperience.presetMatched ? nextExperience.preset : null;

  if (savePresetName) {
    const targetTheme = nextExperience?.theme ?? current.theme;
    const targetLayout = nextExperience?.layout ?? current.layout;
    const targetEdition = nextExperience?.edition ?? current.edition;
    const presetName =
      savePresetName ||
      buildExperiencePresetName({
        theme: targetTheme,
        layout: targetLayout,
        edition: targetEdition,
      });
    const nextTimestamp = new Date().toISOString();
    const slug = buildUniqueUserPresetSlug(presetName, savedPresets);
    const savedPreset: UserSavedExperiencePreset = {
      slug,
      name: presetName,
      theme: targetTheme,
      layout: targetLayout,
      edition: targetEdition,
      createdAt: nextTimestamp,
      updatedAt: nextTimestamp,
    };

    nextSavedPresets = [...savedPresets, savedPreset];
    nextActivePresetSlug = slug;
  }

  const next = {
    ...(nextExperience
      ? {
          theme: nextExperience.theme,
          layout: nextExperience.layout,
          edition: nextExperience.edition,
          skin: nextExperience.layout,
          siteVersion: nextExperience.edition,
        }
      : {}),
    ...(nextExperience || savePresetName ? { activePresetSlug: nextActivePresetSlug } : {}),
    ...(experiencePackId !== null
      ? { experiencePackId: nextExperiencePack?.id ?? null }
      : {}),
    ...(profileImageUrl !== null ? { profileImageUrl } : {}),
    ...(typeof personalDigestEnabled === "boolean" ? { personalDigestEnabled } : {}),
    ...(typeof digestCadenceHours === "number" ? { digestCadenceHours } : {}),
  };

  const historyCreates = buildExperienceHistoryCreates({
    userId,
    current,
    next,
    sourceContext,
  });

  await prisma.$transaction(async (tx) => {
    await tx.userExperienceProfile.upsert({
      where: {
        userId,
      },
      update: {
        ...(nextExperience ? { activeTheme: nextExperience.theme } : {}),
        ...(nextExperience ? { activeSkin: nextExperience.layout } : {}),
        ...(nextExperience ? { activeSiteVersion: nextExperience.edition } : {}),
        ...(nextExperience || savePresetName ? { activePresetSlug: nextActivePresetSlug } : {}),
        ...(savePresetName
          ? { savedPresets: serializeSavedExperiencePresets(nextSavedPresets) }
          : {}),
        ...(experiencePackId !== null
          ? { activeExperiencePackId: nextExperiencePack?.id ?? null }
          : {}),
        ...(profileImageUrl !== null ? { profileImageUrl } : {}),
        ...(typeof personalDigestEnabled === "boolean" ? { personalDigestEnabled } : {}),
        ...(typeof digestCadenceHours === "number" ? { digestCadenceHours } : {}),
      },
      create: {
        userId,
        ...(nextExperience ? { activeTheme: nextExperience.theme } : {}),
        ...(nextExperience ? { activeSkin: nextExperience.layout } : {}),
        ...(nextExperience ? { activeSiteVersion: nextExperience.edition } : {}),
        ...(nextExperience || savePresetName ? { activePresetSlug: nextActivePresetSlug } : {}),
        ...(savePresetName
          ? { savedPresets: serializeSavedExperiencePresets(nextSavedPresets) }
          : {}),
        ...(experiencePackId !== null
          ? { activeExperiencePackId: nextExperiencePack?.id ?? null }
          : {}),
        ...(profileImageUrl !== null ? { profileImageUrl } : {}),
        ...(typeof personalDigestEnabled === "boolean" ? { personalDigestEnabled } : {}),
        ...(typeof digestCadenceHours === "number" ? { digestCadenceHours } : {}),
      },
    });

    if (historyCreates.length > 0) {
      await tx.userExperienceHistory.createMany({
        data: historyCreates,
      });
    }

    if (savePresetName && nextActivePresetSlug) {
      const savedPreset = nextSavedPresets.find((presetItem) => presetItem.slug === nextActivePresetSlug);
      if (savedPreset) {
        await tx.userExperienceHistory.create({
          data: {
            userId,
            preferenceKey: "savedPreset",
            previousValue: null,
            nextValue: savedPreset.slug,
            sourceContext,
            metadata: {
              name: savedPreset.name,
              theme: savedPreset.theme,
              edition: savedPreset.edition,
              layout: savedPreset.layout,
            },
          },
        });
      }
    }

    if (
      experiencePackId !== null &&
      currentExperiencePack?.id !== (nextExperiencePack?.id ?? null)
    ) {
      await tx.userExperienceHistory.create({
        data: {
          userId,
          preferenceKey: "experiencePack",
          previousValue: currentExperiencePack?.slug ?? null,
          nextValue: nextExperiencePack?.slug ?? "flagship-live",
          sourceContext,
          metadata: {
            previousPackId: currentExperiencePack?.id ?? null,
            nextPackId: nextExperiencePack?.id ?? null,
            previousPackName: currentExperiencePack?.name ?? null,
            nextPackName: nextExperiencePack?.name ?? null,
          },
        },
      });
    }
  });

  return NextResponse.json(await loadPreferencePayload(userId));
}
