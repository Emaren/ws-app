// src/components/article/ArticleBody.tsx
import type { Prisma } from "@prisma/client";
import { sanitizeArticleHtml } from "@/lib/sanitizeArticleHtml";
import ArticleCommerceModuleView, {
  type ArticleCommerceRenderableModule,
} from "./ArticleCommerceModuleView";
import { stripLeadingDuplicateExcerptBlock } from "./articleBodySupport";
import WysiwygStyle from "./WysiwygStyle";
import BigThumbs from "./BigThumbs";

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
      title: "Homesteader Health Delivery",
      badgeText: "Local spotlight",
      body: "Bring the organic alternative straight to the door instead of sending the reader to a generic product page.",
      imageSrc: "/hh.tight.h156.v3.png",
      caption: "Click for delivery",
    },
    {
      id: "legacy-checklist-spotlight",
      placement: "CHECKLIST_SPLIT",
      side: "LEFT",
      sizePreset: "COMPACT",
      businessSlug: "beaverlodge-butcher-shop",
      businessName: "Beaverlodge Butcher Shop",
      inventoryItemName: "Beaverlodge Butcher Shop Delivery",
      title: "Beaverlodge Butcher Shop Delivery",
      badgeText: "Butcher pickup and delivery",
      body: "Pair clean dairy choices with local butcher delivery so the article can convert into a real household order.",
      imageSrc: "/bbs.adcard.center.v4.png",
      imageAlt: "Beaverlodge Butcher Shop delivery",
      caption: "Click for delivery",
    },
  ];
}

export default function ArticleBody({ article }: { article: ArticleBodyArticle }) {
  const raw = article.content ?? "";
  const clean = sanitizeArticleHtml(raw);
  const unwrapped = stripLeadingDuplicateExcerptBlock(
    stripSingleOuterDiv(clean),
    article.excerpt,
  );

  const hasAnyBody = unwrapped.trim().length > 0;
  const excerpt = article.excerpt?.trim() || "";
  const hasExcerpt = excerpt.length > 0;

  const { before: topBefore, heading: topHeading, after: topAfter } = splitAtFirstHeading(unwrapped);
  const checklistSplit = extractFirstUnorderedList(topAfter);
  const commerceModules =
    article.commerceModules.length > 0 ? article.commerceModules : legacyCommerceModules(article);
  const topModules = commerceModules.filter((module) => module.placement === "AFTER_FIRST_HEADING");
  const checklistModules = commerceModules.filter((module) => module.placement === "CHECKLIST_SPLIT");
  const primaryChecklistModule = checklistModules[0] ?? null;
  const secondaryChecklistModules = checklistModules.slice(1);

  return (
    <>
      <WysiwygStyle />
      <BigThumbs slug={article.slug} />

      {hasExcerpt && (
        <section className="ws-article mt-4 md:mt-5 mb-6 md:mb-7">
          <h3 className="text-[1.95rem] md:text-[2.05rem] leading-tight font-semibold tracking-tight">
            Excerpt:
          </h3>
          <p className="mt-2 text-[1.2rem] md:text-[1.24rem] leading-[1.58] opacity-95">
            {excerpt}
          </p>
          <hr className="adbay-rule mt-5 md:mt-6" />
        </section>
      )}

      <article className="min-w-0 overflow-x-clip">
        <div
          className="wysiwyg overflow-x-hidden
            [&>*:first-child]:mt-0 [&_hr:first-child]:mt-0
            [&>*:last-child]:mb-0 [&_p:last-child]:mb-0 [&_ul:last-child]:mb-0 [&_ol:last-child]:mb-0 [&_blockquote:last-child]:mb-0 [&_table:last-child]:mb-0"
        >
          {!hasAnyBody && <p className="opacity-70">No formatted article content available yet.</p>}

          <HtmlBlock html={topBefore} />
          <HtmlBlock html={topHeading} />

          {topModules.map((module, index) => (
            <div
              key={module.id ?? `${module.placement}-${index}-${module.title ?? "module"}`}
              style={{ clear: module.side === "LEFT" ? "left" : "right" }}
              className="mb-5"
            >
              <ArticleCommerceModuleView articleSlug={article.slug} module={module} />
            </div>
          ))}

          {checklistSplit ? (
            <>
              <HtmlBlock html={checklistSplit.before} />
              <div className="ws-checkgrid">
                {primaryChecklistModule && (
                  <div className="ws-check-ad">
                    <ArticleCommerceModuleView
                      articleSlug={article.slug}
                      module={primaryChecklistModule}
                      compact
                    />
                  </div>
                )}

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
            <HtmlBlock html={topAfter} />
          )}

          <div style={{ clear: "both" }} />
        </div>
      </article>
    </>
  );
}
