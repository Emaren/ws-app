export const PUBLIC_TEAM_CONTRIBUTOR_NAME = "Wheat & Stone Team";
export const PUBLIC_TEAM_CONTRIBUTOR_SLUG = "wheat-and-stone-team";

function slugifyContributorSegment(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function resolveContributorDisplayName(name: string | null | undefined): string {
  if (typeof name !== "string") {
    return PUBLIC_TEAM_CONTRIBUTOR_NAME;
  }

  const trimmed = name.trim();
  return trimmed || PUBLIC_TEAM_CONTRIBUTOR_NAME;
}

export function buildContributorPublicSlug(
  name: string | null | undefined,
  contributorId: string,
): string {
  const base = slugifyContributorSegment(resolveContributorDisplayName(name)) || "contributor";
  return `${base}-${contributorId.slice(-6).toLowerCase()}`;
}

export function resolveContributorPublicSlug(input?: {
  id?: string | null;
  name?: string | null;
} | null): string {
  if (!input?.id) {
    return PUBLIC_TEAM_CONTRIBUTOR_SLUG;
  }

  return buildContributorPublicSlug(input.name, input.id);
}
