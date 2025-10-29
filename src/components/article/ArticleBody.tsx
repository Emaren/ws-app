// src/components/article/ArticleBody.tsx
"use client";

import React from "react";
import type { Article } from "@prisma/client";
import FloatAd from "./FloatAd";
import WysiwygStyle from "./WysiwygStyle";
import BigThumbs from "./BigThumbs";

/* ----------------------- helpers ----------------------- */

async function sanitizeHtml(html: string): Promise<string> {
  const mod = await import("isomorphic-dompurify");
  const DOMPurify = (mod as any).default ?? mod;
  return DOMPurify.sanitize(html);
}

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

/** Lower value = higher left-ad placement (affects how early text wraps) */
const LEFT_AD_FRACTION = 0.28; // try 0.20 for even higher, 0.40 for lower

export default function ArticleBody({ article }: { article: Article }) {
  const [parts, setParts] = React.useState<{
    introHtml: string;
    h2Html: string;
    firstBlocksAfterH2: string;
    afterBlocksHead: string;
    afterBlocksTail: string;
  } | null>(null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      const raw = article.content ?? "";
      if (!raw.trim()) {
        if (alive) setParts(null);
        return;
      }

      const clean = await sanitizeHtml(raw);
      const unwrapped = stripSingleOuterDiv(clean);

      // 1) Split on the first H2
      const { before, h2Html, afterH2 } = splitAtFirstH2(unwrapped);

      // 2) Keep the FIRST two blocks after H2 full width
      const { firstChunk, rest } = splitAfterNBlocks(afterH2, 2);

      // 3) Split the remainder at a tunable fraction for LEFT ad placement
      const { head, tail } = splitHtmlAtBlockFraction(rest, LEFT_AD_FRACTION);

      if (alive) {
        setParts({
          introHtml: before,
          h2Html,
          firstBlocksAfterH2: firstChunk,
          afterBlocksHead: head,
          afterBlocksTail: tail,
        });
      }
    })();

    return () => {
      alive = false;
    };
  }, [article.content]);

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

      <article className="min-w-0" style={{ overflow: "visible" }}>
      <div className="wysiwyg
   [&>*:first-child]:mt-0 [&_hr:first-child]:mt-0
   [&>*:last-child]:mb-0 [&_p:last-child]:mb-0 [&_ul:last-child]:mb-0 [&_ol:last-child]:mb-0 [&_blockquote:last-child]:mb-0 [&_table:last-child]:mb-0">
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
  shapeMargin={14}          // was 8 — extra space to clear bullet markers
  shapeThreshold={0.45}
  mt={40}
  nudgeY={-6} lgNudgeY={-8}
  scale={1} lgScale={1}
  hoverTint={true}
  caption="Click for Delivery"
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
