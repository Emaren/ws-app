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

function stripHtmlToText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitAfterParagraphCount(html: string, count: number): {
  before: string;
  after: string;
} {
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

  return { before: html, after: "" };
}

function splitAtFirstHeading(html: string): { before: string; heading: string; after: string } {
  const m = /<h[23][\s\S]*?<\/h[23]>/i.exec(html);
  if (!m) return { before: "", heading: "", after: html };
  const start = m.index!;
  const end = start + m[0].length;
  return { before: html.slice(0, start), heading: m[0], after: html.slice(end) };
}

function splitBeforeLastHeading(html: string): { before: string; after: string } {
  const matches = [...html.matchAll(/<h[23][\s\S]*?<\/h[23]>/gi)];
  const last = matches.at(-1);
  if (!last || typeof last.index !== "number") {
    return { before: "", after: html };
  }

  return {
    before: html.slice(0, last.index),
    after: html.slice(last.index),
  };
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
  const commerceModules =
    article.commerceModules.length > 0 ? article.commerceModules : legacyCommerceModules(article);
  const topModules = commerceModules.filter((module) => module.placement === "AFTER_FIRST_HEADING");
  const checklistModules = commerceModules.filter((module) => module.placement === "CHECKLIST_SPLIT");
  const primaryChecklistModule = checklistModules[0] ?? null;
  const secondaryChecklistModules = checklistModules.slice(1);
  const checklistSplit = extractFirstUnorderedList(topAfter);
  const openEditorialAnchor = useOpenEditorialModules
    ? splitBeforeLastHeading(checklistSplit ? checklistSplit.before : topAfter)
    : null;
  const nonEditorialBeforeChecklist = useOpenEditorialModules
    ? ""
    : checklistSplit
      ? topAfter.slice(0, topAfter.indexOf(checklistSplit.ulHtml))
      : topAfter;

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
              {checklistSplit ? (
                <>
                  {topModules.length > 0 ? (
                    <>
                      <HtmlBlock html={openEditorialAnchor?.before} />

                      {topModules.map((module, index) => (
                        <ArticleCommerceModuleView
                          key={module.id ?? `${module.placement}-${index}-${module.title ?? "module"}`}
                          articleSlug={article.slug}
                          module={module}
                          visualStyle="editorial-open"
                        />
                      ))}

                      <HtmlBlock html={openEditorialAnchor?.after} />
                    </>
                  ) : (
                    <HtmlBlock html={checklistSplit.before} />
                  )}

                  {primaryChecklistModule ? (
                    <>
                      <ArticleCommerceModuleView
                        articleSlug={article.slug}
                        module={primaryChecklistModule}
                        compact
                        visualStyle="editorial-open"
                      />

                      <div
                        dangerouslySetInnerHTML={{
                          __html: ensureUlHasClass(checklistSplit.ulHtml, "ws-checklist"),
                        }}
                      />

                      {secondaryChecklistModules.map((module, index) => (
                        <div
                          key={module.id ?? `${module.placement}-extra-open-${index}-${module.title ?? "module"}`}
                          className="my-5"
                        >
                          <ArticleCommerceModuleView
                            articleSlug={article.slug}
                            module={module}
                            compact
                            visualStyle="editorial-open"
                          />
                        </div>
                      ))}

                      <HtmlBlock html={checklistSplit.after} />
                    </>
                  ) : (
                    <>
                      <div
                        dangerouslySetInnerHTML={{
                          __html: ensureUlHasClass(checklistSplit.ulHtml, "ws-checklist"),
                        }}
                      />

                      <HtmlBlock html={checklistSplit.after} />
                    </>
                  )}

                </>
              ) : (
                <>
                  {topModules.length > 0 ? (
                    <>
                      <HtmlBlock html={openEditorialAnchor?.before} />

                      {topModules.map((module, index) => (
                        <ArticleCommerceModuleView
                          key={module.id ?? `${module.placement}-${index}-${module.title ?? "module"}`}
                          articleSlug={article.slug}
                          module={module}
                          visualStyle="editorial-open"
                        />
                      ))}

                      <HtmlBlock html={openEditorialAnchor?.after} />
                    </>
                  ) : (
                    <HtmlBlock html={topAfter} />
                  )}
                </>
              )}
            </>
          ) : (
            <>
              <HtmlBlock html={nonEditorialBeforeChecklist} />

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

              {checklistSplit ? (
                <>
                  <HtmlBlock html={checklistSplit.before} />

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
                            __html: ensureUlHasClass(checklistSplit.ulHtml, "ws-checklist"),
                          }}
                        />
                      </div>

                      {secondaryChecklistModules.map((module, index) => (
                        <div
                          key={module.id ?? `${module.placement}-extra-${index}-${module.title ?? "module"}`}
                          className="my-5"
                        >
                          <ArticleCommerceModuleView articleSlug={article.slug} module={module} compact />
                        </div>
                      ))}

                      <HtmlBlock html={checklistSplit.after} />
                    </>
                  ) : (
                    <>
                      <div
                        className="ws-checklist-wrap"
                        dangerouslySetInnerHTML={{
                          __html: ensureUlHasClass(checklistSplit.ulHtml, "ws-checklist"),
                        }}
                      />

                      <HtmlBlock html={checklistSplit.after} />
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
