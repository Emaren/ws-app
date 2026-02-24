// src/components/article/ArticleBody.tsx
import type { Article } from "@prisma/client";
import { sanitizeArticleHtml } from "@/lib/sanitizeArticleHtml";
import FloatAd from "./FloatAd";
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

function extractChecksEveryBox(html: string): null | {
  before: string;
  leadPara: string;
  ulHtml: string;
  after: string;
} {
  const lead =
    "<p\\b[^>]*>\\s*Avalon(?:’|&rsquo;|&#8217;|')s\\s+chocolate\\s+milk\\s+checks\\s+every\\s+box:\\s*<\\/p>";
  const re = new RegExp(`(${lead})\\s*(<ul\\b[\\s\\S]*?<\\/ul>)`, "i");
  const m = re.exec(html);
  if (!m) return null;

  const start = m.index ?? 0;
  const end = start + m[0].length;

  return {
    before: html.slice(0, start),
    leadPara: m[1],
    ulHtml: m[2],
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

export default function ArticleBody({ article }: { article: Article }) {
  const raw = article.content ?? "";
  const clean = sanitizeArticleHtml(raw);
  const unwrapped = stripSingleOuterDiv(clean);

  const hasAnyBody = unwrapped.trim().length > 0;

  const { before: topBefore, heading: topHeading, after: topAfter } = splitAtFirstHeading(unwrapped);
  const box = extractChecksEveryBox(topAfter);

  return (
    <>
      <WysiwygStyle />
      <BigThumbs slug={article.slug} />

      <article className="min-w-0 overflow-x-clip">
        <div
          className="wysiwyg overflow-x-hidden
            [&>*:first-child]:mt-0 [&_hr:first-child]:mt-0
            [&>*:last-child]:mb-0 [&_p:last-child]:mb-0 [&_ul:last-child]:mb-0 [&_ol:last-child]:mb-0
            [&_blockquote:last-child]:mb-0 [&_table:last-child]:mb-0"
        >
          {!hasAnyBody && <p className="opacity-70">No formatted article content available yet.</p>}

          <HtmlBlock html={topBefore} />
          <HtmlBlock html={topHeading} />

          {/* RIGHT ad — Homesteader (slightly bigger for balance) */}
          {hasAnyBody && (
            <div style={{ clear: "right" }}>
              <FloatAd
                frameless
                label="Homesteader Health Delivery"
                side="right"
                imageSrc="/hh.tight.h156.v3.png"
                w={400}
                mdW={420}
                lgW={450}
                h={235}
                mdH={250}
                lgH={265}
                pad={0}
                imgFit="contain"
                shape="rounded"
                shapeMargin={14}
                nudgeY={-4}
                lgNudgeY={-8}
                scale={1}
                mdScale={1}
                lgScale={1}
                hoverTint
                caption="Click for Delivery"
                deliveryLeadContext={{
                  source: "LOCAL_AD",
                  articleSlug: article.slug,
                  businessSlug: "homesteader-health",
                  businessName: "Homesteader Health",
                  inventoryItemName: "Homesteader Health Delivery",
                }}
              />
            </div>
          )}

          {box ? (
            <>
              <HtmlBlock html={box.before} />
              <HtmlBlock html={box.leadPara} />

              {/* Beaverlodge + checklist locked together */}
              <div className="ws-checkgrid">
                <div className="ws-check-ad">
                  <FloatAd
                    frameless
                    side="left"
                    label="Beaverlodge Butcher Shop Delivery"
                    imageSrc="/bbs.adcard.center.v4.png"
                    imageAlt="Beaverlodge Butcher Shop delivery"
                    w={300}
                    mdW={305}
                    lgW={315}
                    h={150}
                    mdH={155}
                    lgH={160}
                    pad={0}
                    imgFit="contain"
                    shape="image"
                    shapeMargin={0}
                    shapeThreshold={0.45}
                    mt={0}
                    nudgeY={0}
                    lgNudgeY={0}
                    scale={1}
                    mdScale={1}
                    lgScale={1}
                    hoverTint
                    caption="Click for Delivery"
                    deliveryLeadContext={{
                      source: "LOCAL_AD",
                      articleSlug: article.slug,
                      businessSlug: "beaverlodge-butcher-shop",
                      businessName: "Beaverlodge Butcher Shop",
                      inventoryItemName: "Beaverlodge Butcher Shop Delivery",
                    }}
                  />
                </div>

                <div
                  className="ws-checklist-wrap"
                  dangerouslySetInnerHTML={{ __html: ensureUlHasClass(box.ulHtml, "ws-checklist") }}
                />
              </div>

              <HtmlBlock html={box.after} />
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