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
    return "Wheat & Stone Team";
  }

  const trimmed = name.trim();
  return trimmed || "Wheat & Stone Team";
}

export function buildContributorPublicSlug(
  name: string | null | undefined,
  contributorId: string,
): string {
  const base = slugifyContributorSegment(resolveContributorDisplayName(name)) || "contributor";
  return `${base}-${contributorId.slice(-6).toLowerCase()}`;
}
