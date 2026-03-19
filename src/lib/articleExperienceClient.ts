import type { SiteEdition, SiteLayout } from "@/lib/experienceSystem";

export type ArticleExperienceSelection = {
  edition: SiteEdition;
  layout: SiteLayout;
};

export function sameArticleExperience(
  left: ArticleExperienceSelection,
  right: ArticleExperienceSelection,
) {
  return left.edition === right.edition && left.layout === right.layout;
}

export function resolveArticleDisplayExperience(input: {
  server: ArticleExperienceSelection;
  preview?: Partial<ArticleExperienceSelection> | null;
  storage?: Partial<ArticleExperienceSelection> | null;
  document?: Partial<ArticleExperienceSelection> | null;
}): ArticleExperienceSelection {
  if (input.preview?.edition || input.preview?.layout) {
    return {
      edition: input.preview.edition ?? input.server.edition,
      layout: input.preview.layout ?? input.server.layout,
    };
  }

  return {
    edition:
      input.storage?.edition ??
      input.document?.edition ??
      input.server.edition,
    layout:
      input.storage?.layout ??
      input.document?.layout ??
      input.server.layout,
  };
}
