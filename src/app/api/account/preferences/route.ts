import { NextResponse, type NextRequest } from "next/server";
import { getApiAuthContext } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import {
  EXPERIENCE_HISTORY_LIMIT,
  buildExperienceHistoryCreates,
  normalizeDigestCadenceHours,
  normalizeProfileImageUrl,
  parseBoolean,
  resolveUserExperienceSnapshot,
  serializeExperienceHistory,
} from "@/lib/userExperience";
import {
  normalizeSiteVersion,
  normalizeSkin,
} from "@/lib/experiencePreferences";
import {
  findSelectableExperiencePackById,
  getExperiencePackCatalogItem,
  listSelectableExperiencePacks,
} from "@/lib/experienceStudioServer";
import { normalizeTheme } from "@/lib/theme";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

  return {
    profile: resolveUserExperienceSnapshot(profile ?? {}),
    activeExperiencePack,
    experiencePackCatalog,
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
        skin?: unknown;
        siteVersion?: unknown;
        experiencePackId?: unknown;
        profileImageUrl?: unknown;
        personalDigestEnabled?: unknown;
        digestCadenceHours?: unknown;
        sourceContext?: unknown;
      }
    | null;

  const theme =
    body && "theme" in body ? normalizeTheme(String(body.theme ?? "")) : null;
  const skin =
    body && "skin" in body ? normalizeSkin(String(body.skin ?? "")) : null;
  const siteVersion =
    body && "siteVersion" in body
      ? normalizeSiteVersion(String(body.siteVersion ?? ""))
      : null;
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
  const sourceContext =
    body && typeof body.sourceContext === "string" && body.sourceContext.trim()
      ? body.sourceContext.trim().slice(0, 120)
      : null;

  if (
    theme === null &&
    skin === null &&
    siteVersion === null &&
    experiencePackId === null &&
    profileImageUrl === null &&
    personalDigestEnabled === null &&
    digestCadenceHours === null
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
  const next = {
    ...(theme ? { theme } : {}),
    ...(skin ? { skin } : {}),
    ...(siteVersion ? { siteVersion } : {}),
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
        ...(theme ? { activeTheme: theme } : {}),
        ...(skin ? { activeSkin: skin } : {}),
        ...(siteVersion ? { activeSiteVersion: siteVersion } : {}),
        ...(experiencePackId !== null
          ? { activeExperiencePackId: nextExperiencePack?.id ?? null }
          : {}),
        ...(profileImageUrl !== null ? { profileImageUrl } : {}),
        ...(typeof personalDigestEnabled === "boolean" ? { personalDigestEnabled } : {}),
        ...(typeof digestCadenceHours === "number" ? { digestCadenceHours } : {}),
      },
      create: {
        userId,
        ...(theme ? { activeTheme: theme } : {}),
        ...(skin ? { activeSkin: skin } : {}),
        ...(siteVersion ? { activeSiteVersion: siteVersion } : {}),
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
