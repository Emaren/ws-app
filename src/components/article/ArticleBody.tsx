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

function splitAtFirstH2(html: string): {
  before: string;
  h2Html: string;
  afterH2: string;
} {
  const m = /<h2[\s\S]*?<\/h2>/i.exec(html);
  if (!m) return { before: "", h2Html: "", afterH2: html };
  const start = m.index!;
  const end = start + m[0].length;
  return { before: html.slice(0, start), h2Html: m[0], afterH2: html.slice(end) };
}

/** Keep first N blocks full width after the H2 */
function splitAfterNBlocks(html: string, n = 2): { firstChunk: string; rest: string } {
  const re = /<\/(p|ul|ol|blockquote|pre|figure|table|thead|tbody|tfoot|tr|h3|h4|h5|h6)>/gi;
  let cut = -1;
  let count = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    count += 1;
    if (count === n) {
      cut = m.index + m[0].length;
      break;
    }
  }
  if (cut === -1) return { firstChunk: html, rest: "" };
  return { firstChunk: html.slice(0, cut), rest: html.slice(cut) };
}

/** Split after a fraction (0..1) of block closers so we can place the left ad higher/lower */
function splitHtmlAtBlockFraction(html: string, fraction = 0.33): { head: string; tail: string } {
  const re = /<\/(p|ul|ol|table|tbody|thead|tfoot|tr|blockquote|pre|figure)>/gi;
  const ends: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) ends.push(m.index + m[0].length);
  if (ends.length === 0) return { head: html, tail: "" };

  const clamped = Math.min(0.95, Math.max(0.05, fraction));
  const idx = Math.max(0, Math.min(ends.length - 1, Math.floor(ends.length * clamped)));
  const cut = ends[idx];
  return { head: html.slice(0, cut), tail: html.slice(cut) };
}

/* ----------------------- main ----------------------- */

const LEFT_AD_FRACTION = 0.28;

export default function ArticleBody({ article }: { article: Article }) {
  const raw = article.content ?? "";
  const clean = sanitizeArticleHtml(raw);
  const unwrapped = stripSingleOuterDiv(clean);
  const { before, h2Html, afterH2 } = splitAtFirstH2(unwrapped);
  const { firstChunk, rest } = splitAfterNBlocks(afterH2, 2);
  const { head, tail } = splitHtmlAtBlockFraction(rest, LEFT_AD_FRACTION);

  const parts = {
    introHtml: before,
    h2Html,
    firstBlocksAfterH2: firstChunk,
    afterBlocksHead: head,
    afterBlocksTail: tail,
  };

  const hasAnyBody =
    !!parts &&
    (parts.introHtml ||
      parts.h2Html ||
      parts.firstBlocksAfterH2 ||
      parts.afterBlocksHead ||
      parts.afterBlocksTail);

  return (
    <>
      <WysiwygStyle />
      <BigThumbs slug={article.slug} />

      {/* Hard clamp horizontal overflow inside the article column */}
      <article className="min-w-0 overflow-x-clip">
        <div
          className="wysiwyg overflow-x-hidden
            [&>*:first-child]:mt-0 [&_hr:first-child]:mt-0
            [&>*:last-child]:mb-0 [&_p:last-child]:mb-0 [&_ul:last-child]:mb-0 [&_ol:last-child]:mb-0 [&_blockquote:last-child]:mb-0 [&_table:last-child]:mb-0"
        >
          {!hasAnyBody && (
            <p className="opacity-70">No formatted article content available yet.</p>
          )}

          {/* 1) Before H2 */}
          {parts?.introHtml && <div dangerouslySetInnerHTML={{ __html: parts.introHtml }} />}

          {/* keep floats from jumping above the rule */}
          <div aria-hidden style={{ clear: "both", height: 0 }} />
          <hr className="adbay-rule" style={{ marginBlock: 8 }} />

          {/* 2) H2 */}
          {parts?.h2Html && <div dangerouslySetInnerHTML={{ __html: parts.h2Html }} />}

          {/* 3) First N blocks after H2 (full width) */}
          {parts?.firstBlocksAfterH2 && (
            <div dangerouslySetInnerHTML={{ __html: parts.firstBlocksAfterH2 }} />
          )}

          {/* Ensure floats stay below the rule */}
          <div aria-hidden style={{ clear: "both" }} />

          {/* 4) RIGHT ad begins here */}
          {(parts?.afterBlocksHead || parts?.afterBlocksTail) && (
            <>
              <FloatAd
                frameless
                label="Homesteader Health Delivery"
                side="right"
                imageSrc="/hh.tight.h156.v3.png"
                w={161} mdW={161} lgW={161}
                h={156} mdH={156} lgH={156}
                pad={0}
                imgFit="contain"
                nudgeY={-6} lgNudgeY={-10}
                scale={0.88} mdScale={0.88} lgScale={0.94}
                hoverTint={true}
                caption="Click for Delivery"
                deliveryLeadContext={{
                  source: "LOCAL_AD",
                  articleSlug: article.slug,
                  businessSlug: "homesteader-health",
                  businessName: "Homesteader Health",
                  inventoryItemName: "Homesteader Health Delivery",
                }}
              />
              {parts?.afterBlocksHead && (
                <div dangerouslySetInnerHTML={{ __html: parts.afterBlocksHead }} />
              )}
            </>
          )}

          {/* 5) LEFT ad at tunable position, then the tail */}
          {parts?.afterBlocksTail && (
            <>
              <FloatAd
                frameless
                side="left"
                label="Beaverlodge Butcher Shop Delivery"
                imageSrc="/bbs.adcard.center.v4.png"
                imageAlt="Beaverlodge Butcher Shop delivery"
                w={200} mdW={200} lgW={220}
                h={140} mdH={140} lgH={150}
                pad={0}
                imgFit="contain"
                shape="image"
                shapeMargin={14}
                shapeThreshold={0.45}
                mt={40}
                nudgeY={-6} lgNudgeY={-8}
                scale={1} lgScale={1}
                hoverTint={true}
                caption="Click for Delivery"
                deliveryLeadContext={{
                  source: "LOCAL_AD",
                  articleSlug: article.slug,
                  businessSlug: "beaverlodge-butcher-shop",
                  businessName: "Beaverlodge Butcher Shop",
                  inventoryItemName: "Beaverlodge Butcher Shop Delivery",
                }}
              />

              <div dangerouslySetInnerHTML={{ __html: parts.afterBlocksTail }} />
            </>
          )}

          <div style={{ clear: "both" }} />
        </div>
      </article>
    </>
  );
}
