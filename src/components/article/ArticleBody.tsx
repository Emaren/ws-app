// src/components/article/ArticleBody.tsx
import type { Prisma } from "@prisma/client";
import { sanitizeArticleHtml } from "@/lib/sanitizeArticleHtml";
import ArticleCommerceModuleView, {
  type ArticleCommerceRenderableModule,
} from "./ArticleCommerceModuleView";
import { stripLeadingDuplicateExcerptBlock } from "./articleBodySupport";
import WysiwygStyle from "./WysiwygStyle";
import BigThumbs from "./BigThumbs";
import type { SiteEdition, SiteLayout } from "@/lib/experienceSystem";

function stripSingleOuterDiv(html: string): string {
  const t = html.trim();
  if (!/^<div\b[^>]*>[\s\S]*<\/div>\s*$/i.test(t)) return html;
  const opens = (t.match(/<div\b[^>]*>/gi) || []).length;
  const closes = (t.match(/<\/div>/gi) || []).length;
  if (opens !== closes || opens < 1) return html;
  const firstOpenEnd = t.indexOf(">");
  return t.slice(firstOpenEnd + 1, t.lastIndexOf("</div>"));
}

function ensureUlHasClass(ulHtml: string, cls: string): string {
  const open = ulHtml.match(/^<ul\b[^>]*>/i)?.[0];
  if (!open) return ulHtml;

  if (new RegExp(`\\b${cls}\\b`, "i").test(open)) return ulHtml;

  const m = open.match(/\bclass\s*=\s*(['"])([^'"]*)\1/i);
  if (m) {
    const quote = m[1];
    const cur = (m[2] || "").trim();
    const next = `${cur} ${cls}`.trim();
    const replaced = open.replace(m[0], `class=${quote}${next}${quote}`);
    return replaced + ulHtml.slice(open.length);
  }

  const replaced = open.replace(/^<ul\b/i, `<ul class="${cls}"`);
  return replaced + ulHtml.slice(open.length);
}

function extractFirstUnorderedList(html: string): null | {
  before: string;
  ulHtml: string;
  after: string;
} {
  const m = /<ul\b[\s\S]*?<\/ul>/i.exec(html);
  if (!m) return null;

  const start = m.index ?? 0;
  const end = start + m[0].length;

  return {
    before: html.slice(0, start),
    ulHtml: m[0],
    after: html.slice(end),
  };
}

function splitAtFirstHeading(html: string): { before: string; heading: string; after: string } {
  const m = /<h[23][\s\S]*?<\/h[23]>/i.exec(html);
  if (!m) return { before: "", heading: "", after: html };
  const start = m.index!;
  const end = start + m[0].length;
  return { before: html.slice(0, start), heading: m[0], after: html.slice(end) };
}

function splitAfterFirstParagraph(html: string): { before: string; after: string } {
  const m = /<p\b[\s\S]*?<\/p>/i.exec(html);
  if (!m) {
    return {
      before: html,
      after: "",
    };
  }

  const start = m.index ?? 0;
  const end = start + m[0].length;
  return {
    before: html.slice(0, end),
    after: html.slice(end),
  };
}

function splitAfterParagraphCount(
  html: string,
  count: number,
): { before: string; after: string } {
  if (count <= 0) {
    return { before: "", after: html };
  }

  const matcher = /<p\b[\s\S]*?<\/p>/gi;
  let match: RegExpExecArray | null;
  let seen = 0;
  let endIndex = 0;

  while ((match = matcher.exec(html))) {
    seen += 1;
    endIndex = matcher.lastIndex;
    if (seen >= count) {
      return {
        before: html.slice(0, endIndex),
        after: html.slice(endIndex),
      };
    }
  }

  return splitAfterFirstParagraph(html);
}

type HtmlSection = {
  headingHtml: string;
  headingText: string;
  bodyHtml: string;
};

function decodeInlineEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&ndash;|&mdash;/gi, "-");
}

function normalizeHeadingText(html: string): string {
  return decodeInlineEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function splitHeadingSections(html: string): {
  leadHtml: string;
  sections: HtmlSection[];
} {
  const matcher = /<h[23]\b[\s\S]*?<\/h[23]>/gi;
  const matches = Array.from(html.matchAll(matcher));

  if (matches.length === 0) {
    return { leadHtml: html, sections: [] };
  }

  const leadHtml = html.slice(0, matches[0].index ?? 0);
  const sections: HtmlSection[] = [];

  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index];
    const start = current.index ?? 0;
    const headingHtml = current[0];
    const headingEnd = start + headingHtml.length;
    const nextStart = matches[index + 1]?.index ?? html.length;

    sections.push({
      headingHtml,
      headingText: normalizeHeadingText(headingHtml),
      bodyHtml: html.slice(headingEnd, nextStart),
    });
  }

  return { leadHtml, sections };
}

function resolveChecklistSectionIndex(sections: HtmlSection[]): number {
  const explicitIndex = sections.findIndex((section) =>
    section.headingText.includes("why we chose it"),
  );
  if (explicitIndex >= 0) {
    return explicitIndex;
  }

  const boxChecklistIndex = sections.findIndex((section) =>
    /checks every box/i.test(section.bodyHtml.replace(/<[^>]+>/g, " ")),
  );
  if (boxChecklistIndex >= 0) {
    return boxChecklistIndex;
  }

  return sections.findIndex((section) => /<ul\b/i.test(section.bodyHtml));
}

function HtmlBlock({ html }: { html?: string }) {
  if (!html) return null;
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

type ArticleBodyArticle = Prisma.ArticleGetPayload<{
  include: {
    commerceModules: {
      include: {
        business: {
          include: {
            storeProfile: true,
          },
        },
        offer: true,
        inventoryItem: true,
      },
    },
  },
}>;

function legacyCommerceModules(article: {
  slug: string;
  title: string;
}): ArticleCommerceRenderableModule[] {
  const fingerprint = `${article.slug} ${article.title}`.toLowerCase();
  if (
    !fingerprint.includes("avalon") ||
    !fingerprint.includes("chocolate") ||
    !fingerprint.includes("milk")
  ) {
    return [];
  }

  return [
    {
      id: "legacy-top-spotlight",
      placement: "AFTER_FIRST_HEADING",
      side: "RIGHT",
      sizePreset: "FEATURE",
      businessSlug: "homesteader-health",
      businessName: "Homesteader Health",
      inventoryItemName: "Homesteader Health Delivery",
      title: "Homesteader Health",
      badgeText: "Local spotlight",
      body: "A longtime northern health-food grocer with practical guidance, curated organic shelves, and the kind of everyday wellness focus that still feels personal.",
      imageSrc: "/hh.tight.h156.v3.png",
    },
    {
      id: "legacy-checklist-spotlight",
      placement: "CHECKLIST_SPLIT",
      side: "LEFT",
      sizePreset: "COMPACT",
      businessSlug: "beaverlodge-butcher-shop",
      businessName: "Beaverlodge Butcher Shop",
      inventoryItemName: "Beaverlodge Butcher Shop Delivery",
      title: "Beaverlodge Butcher Shop",
      badgeText: "Butcher pickup and delivery",
      body: "A family-run Alberta butcher shop known for custom cuts, house-made sausage, careful sourcing, and quality standards that still feel proudly local.",
      imageSrc: "/bbs.adcard.center.v4.png",
      imageAlt: "Beaverlodge Butcher Shop delivery",
    },
  ];
}

function dedupeCommerceModules(
  modules: ArticleCommerceRenderableModule[],
): ArticleCommerceRenderableModule[] {
  const seen = new Set<string>();

  return modules.filter((module) => {
    const businessIdentity = commerceModuleIdentity(module);
    const key = businessIdentity
      ? businessIdentity.toLowerCase()
      : [module.placement || "", module.side || "", module.title || "", module.imageSrc || ""]
          .join("::")
          .toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function commerceModuleIdentity(module: ArticleCommerceRenderableModule): string {
  return (
    module.business?.slug ||
    module.businessSlug ||
    module.business?.name ||
    module.businessName ||
    module.title ||
    module.offer?.title ||
    module.inventoryItem?.name ||
    module.imageSrc ||
    ""
  );
}

function normalizeCommerceModuleSide(
  side: ArticleCommerceRenderableModule["side"],
): "left" | "right" | null {
  if (side === "LEFT") return "left";
  if (side === "RIGHT") return "right";
  return null;
}

function pickPreferredCommerceModule(
  modules: ArticleCommerceRenderableModule[],
  options: {
    placement: "AFTER_FIRST_HEADING" | "CHECKLIST_SPLIT";
    side: "left" | "right";
    excludeIdentity?: string | null;
  },
): ArticleCommerceRenderableModule | null {
  const pool = modules.filter((module) => {
    const identity = commerceModuleIdentity(module).toLowerCase();
    return !options.excludeIdentity || identity !== options.excludeIdentity.toLowerCase();
  });

  return (
    pool.find(
      (module) =>
        module.placement === options.placement &&
        normalizeCommerceModuleSide(module.side) === options.side,
    ) ||
    pool.find((module) => normalizeCommerceModuleSide(module.side) === options.side) ||
    pool.find((module) => module.placement === options.placement) ||
    pool[0] ||
    null
  );
}

function editionSurfaceToneClass(edition: SiteEdition): string {
  if (edition === "rustic") {
    return "border-amber-300/20 bg-amber-300/[0.06]";
  }
  if (edition === "modern") {
    return "border-cyan-300/15 bg-cyan-400/[0.05]";
  }
  if (edition === "operator") {
    return "border-sky-400/20 bg-sky-500/[0.06]";
  }
  return "border-white/12 bg-white/[0.02]";
}

export default function ArticleBody({
  article,
  experience,
}: {
  article: ArticleBodyArticle;
  experience?: {
    edition: SiteEdition;
    layout: SiteLayout;
  };
}) {
  const raw = article.content ?? "";
  const clean = sanitizeArticleHtml(raw);
  const unwrapped = stripLeadingDuplicateExcerptBlock(
    stripSingleOuterDiv(clean),
    article.excerpt,
  );
  const edition = experience?.edition ?? "classic";
  const layout = experience?.layout ?? "editorial";
  const decoratedBody = layout !== "editorial";
  const useOpenEditorialModules = layout === "editorial" && edition === "classic";
  const excerptShellClass = decoratedBody
    ? `rounded-[1.75rem] border p-5 md:p-6 ${editionSurfaceToneClass(edition)}`
    : "";
  const bodyShellClass = decoratedBody
    ? `rounded-[1.85rem] border p-5 md:p-7 ${editionSurfaceToneClass(edition)}`
    : "";

  const hasAnyBody = unwrapped.trim().length > 0;
  const excerpt = article.excerpt?.trim() || "";
  const hasExcerpt = excerpt.length > 0;

  const { before: topBefore, heading: topHeading, after: topAfter } = splitAtFirstHeading(unwrapped);
  const commerceModules = dedupeCommerceModules(
    article.commerceModules.length > 0 ? article.commerceModules : legacyCommerceModules(article),
  );
  const topModules = commerceModules.filter(
    (module) =>
      module.placement === "AFTER_FIRST_HEADING" ||
      (!module.placement && normalizeCommerceModuleSide(module.side) === "right"),
  );
  const primaryTopModule = pickPreferredCommerceModule(topModules, {
    placement: "AFTER_FIRST_HEADING",
    side: "right",
  });
  const checklistModules = commerceModules.filter(
    (module) =>
      module.placement === "CHECKLIST_SPLIT" ||
      (!module.placement && normalizeCommerceModuleSide(module.side) === "left"),
  );
  const primaryChecklistModule = pickPreferredCommerceModule(checklistModules, {
    placement: "CHECKLIST_SPLIT",
    side: "left",
    excludeIdentity: primaryTopModule ? commerceModuleIdentity(primaryTopModule) : null,
  });
  const firstChecklistSplit = extractFirstUnorderedList(topAfter);
  const secondChecklistRelativeSplit = firstChecklistSplit
    ? extractFirstUnorderedList(firstChecklistSplit.after)
    : null;
  const preChecklistHtml = firstChecklistSplit?.before ?? topAfter;
  const editorialSections = useOpenEditorialModules ? splitHeadingSections(topAfter) : null;
  const editorialLeadHtml = editorialSections?.leadHtml ?? "";
  const editorialLeadSplit = splitAfterParagraphCount(editorialLeadHtml, 2);
  const checklistSectionIndex = useOpenEditorialModules
    ? resolveChecklistSectionIndex(editorialSections?.sections ?? [])
    : -1;

  return (
    <>
      <WysiwygStyle />
      <BigThumbs slug={article.slug} />

      {hasExcerpt && (
        <section className={`mt-4 md:mt-5 mb-6 md:mb-7 ${excerptShellClass}`.trim()}>
          <p className="text-[1.2rem] md:text-[1.24rem] leading-[1.58] opacity-95">
            {excerpt}
          </p>
          <hr className="adbay-rule mt-5 md:mt-6" />
        </section>
      )}

      <article className={`min-w-0 overflow-x-clip ${bodyShellClass}`.trim()}>
        <div
          className="wysiwyg overflow-x-hidden
            [&>*:first-child]:mt-0 [&_hr:first-child]:mt-0
            [&>*:last-child]:mb-0 [&_p:last-child]:mb-0 [&_ul:last-child]:mb-0 [&_ol:last-child]:mb-0 [&_blockquote:last-child]:mb-0 [&_table:last-child]:mb-0"
        >
          {!hasAnyBody && <p className="opacity-70">No formatted article content available yet.</p>}

          <HtmlBlock html={topBefore} />
          <HtmlBlock html={topHeading} />
          {useOpenEditorialModules ? (
            <>
              <HtmlBlock html={editorialLeadSplit.before} />

              {primaryTopModule ? (
                <ArticleCommerceModuleView
                  articleSlug={article.slug}
                  module={primaryTopModule}
                  visualStyle="editorial-open"
                />
              ) : null}

              <HtmlBlock html={editorialLeadSplit.after} />

              {editorialSections?.sections.map((section, index) => {
                const showChecklistModule = !!primaryChecklistModule && index === checklistSectionIndex;

                return (
                  <div key={`${section.headingText}-${index}`}>
                    <HtmlBlock html={section.headingHtml} />

                    {showChecklistModule ? (
                      (() => {
                        const checklistSplit = extractFirstUnorderedList(section.bodyHtml);

                        if (!checklistSplit) {
                          return (
                            <>
                              <ArticleCommerceModuleView
                                articleSlug={article.slug}
                                module={primaryChecklistModule!}
                                compact
                                visualStyle="editorial-open"
                              />
                              <HtmlBlock html={section.bodyHtml} />
                            </>
                          );
                        }

                        return (
                          <>
                            <HtmlBlock html={checklistSplit.before} />
                            <ArticleCommerceModuleView
                              articleSlug={article.slug}
                              module={primaryChecklistModule!}
                              compact
                              visualStyle="editorial-open"
                            />
                            <div
                              dangerouslySetInnerHTML={{
                                __html: ensureUlHasClass(checklistSplit.ulHtml, "ws-checklist"),
                              }}
                            />
                            <HtmlBlock html={checklistSplit.after} />
                          </>
                        );
                      })()
                    ) : (
                      <HtmlBlock html={section.bodyHtml} />
                    )}
                  </div>
                );
              })}

              {(primaryTopModule || primaryChecklistModule) && <div style={{ clear: "both" }} />}
            </>
          ) : (
            <>
              <HtmlBlock html={preChecklistHtml} />

              {topModules.map((module, index) => {
                return (
                  <ArticleCommerceModuleView
                    key={module.id ?? `${module.placement}-${index}-${module.title ?? "module"}`}
                    articleSlug={article.slug}
                    module={module}
                    visualStyle="card"
                  />
                );
              })}

              {firstChecklistSplit ? (
                <>
                  {secondChecklistRelativeSplit ? (
                    <>
                      <div
                        dangerouslySetInnerHTML={{
                          __html: firstChecklistSplit.ulHtml,
                        }}
                      />

                      <div
                        dangerouslySetInnerHTML={{
                          __html: secondChecklistRelativeSplit.before,
                        }}
                      />

                      {primaryChecklistModule ? (
                        <>
                          <div className="ws-checkgrid">
                            <div className="ws-check-ad">
                              <ArticleCommerceModuleView
                                articleSlug={article.slug}
                                module={primaryChecklistModule}
                                compact
                              />
                            </div>

                            <div
                              className="ws-checklist-wrap"
                              dangerouslySetInnerHTML={{
                                __html: ensureUlHasClass(secondChecklistRelativeSplit.ulHtml, "ws-checklist"),
                              }}
                            />
                          </div>

                        </>
                      ) : (
                        <div
                          className="ws-checklist-wrap"
                          dangerouslySetInnerHTML={{
                            __html: ensureUlHasClass(secondChecklistRelativeSplit.ulHtml, "ws-checklist"),
                          }}
                        />
                      )}

                      <HtmlBlock html={secondChecklistRelativeSplit.after} />
                    </>
                  ) : primaryChecklistModule ? (
                    <>
                      <div className="ws-checkgrid">
                        <div className="ws-check-ad">
                          <ArticleCommerceModuleView
                            articleSlug={article.slug}
                            module={primaryChecklistModule}
                            compact
                          />
                        </div>

                        <div
                          className="ws-checklist-wrap"
                          dangerouslySetInnerHTML={{
                            __html: ensureUlHasClass(firstChecklistSplit.ulHtml, "ws-checklist"),
                          }}
                        />
                      </div>

                      <HtmlBlock html={firstChecklistSplit.after} />
                    </>
                  ) : (
                    <>
                      <div
                        dangerouslySetInnerHTML={{
                          __html: firstChecklistSplit.ulHtml,
                        }}
                      />

                      <HtmlBlock html={firstChecklistSplit.after} />
                    </>
                  )}
                </>
              ) : (
                <HtmlBlock html={topAfter} />
              )}
            </>
          )}

          <div style={{ clear: "both" }} />
        </div>
      </article>
    </>
  );
}
