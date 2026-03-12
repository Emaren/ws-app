import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import {
  readExperiencePreviewOverrideFromUrl,
  type ExperiencePreferenceSnapshot,
} from "@/lib/experiencePreferences";
import { prisma } from "@/lib/prisma";
import {
  resolveExperienceSelection,
  type ExperiencePreset,
  type ExperiencePageKey,
} from "@/lib/experienceSystem";
import {
  buildSavedExperiencePresetCatalog,
  resolveUserExperienceSnapshot,
} from "@/lib/userExperience";

type SearchParamValue = string | string[] | undefined;

function toUrlSearchParams(
  input?: Record<string, SearchParamValue> | URLSearchParams | null,
): URLSearchParams | null {
  if (!input) {
    return null;
  }

  if (input instanceof URLSearchParams) {
    return input;
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item);
      }
      continue;
    }

    if (typeof value === "string") {
      params.set(key, value);
    }
  }

  return params;
}

function resolvePageSelection(
  page: ExperiencePageKey,
  snapshot: ExperiencePreferenceSnapshot | null,
  customPresets: ExperiencePreset[] = [],
) {
  return resolveExperienceSelection(
    {
      theme: snapshot?.theme ?? null,
      layout: snapshot?.layout ?? null,
      edition: snapshot?.edition ?? null,
      preset: snapshot?.preset ?? null,
      page,
    },
    { customPresets },
  );
}

export async function getPublicPageExperience(input: {
  page: ExperiencePageKey;
  searchParams?: Record<string, SearchParamValue> | URLSearchParams | null;
}) {
  const previewOverride = readExperiencePreviewOverrideFromUrl(
    toUrlSearchParams(input.searchParams),
  );
  if (previewOverride) {
    return resolvePageSelection(input.page, previewOverride);
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return resolvePageSelection(input.page, null);
  }

  const profile = await prisma.userExperienceProfile.findUnique({
    where: {
      userId: session.user.id,
    },
  });

  const snapshot = resolveUserExperienceSnapshot(profile ?? {});
  return resolvePageSelection(
    input.page,
    snapshot,
    buildSavedExperiencePresetCatalog(snapshot.savedPresets),
  );
}
