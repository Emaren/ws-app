// src/components/article/ArticleBody.tsx
"use client";

import React from "react";
import type { Article } from "@prisma/client";
import FloatAd from "./FloatAd";
import WysiwygStyle from "./WysiwygStyle";
import BigThumbs from "./BigThumbs";

/* ----------------------- helpers ----------------------- */

/** Sanitize HTML before injecting into the DOM */
async function sanitizeHtml(html: string): Promise<string> {
  const mod = await import("isomorphic-dompurify");
  const DOMPurify = (mod as any).default ?? mod;
  return DOMPurify.sanitize(html);
}

/** If content is one big <div>…</div>, unwrap it so we don't inherit clamps. */
function stripSingleOuterDiv(html: string): string {
  const t = html.trim();
  if (!/^<div\b[^>]*>[\s\S]*<\/div>\s*$/i.test(t)) return html;
  const opens = (t.match(/<div\b[^>]*>/gi) || []).length;
  const closes = (t.match(/<\/div>/gi) || []).length;
  if (opens !== closes || opens < 1) return html;
  const firstOpenEnd = t.indexOf(">");
  return t.slice(firstOpenEnd + 1, t.lastIndexOf("</div>"));
}

/** Split into (before first <h2>), (that <h2>), and (everything after it). */
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

/**
 * Split AFTER the first N *blocks* that follow the H2 so the ad starts lower.
 * Block closers we count: p, lists, blockquote, pre, figure, table (+ sections), h3–h6.
 */
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

/** Find a “midpoint” in HTML based on common block closers to place the left ad. */
function splitHtmlAtMidBlock(html: string): { head: string; tail: string } {
  const re = /<\/(p|ul|ol|table|tbody|thead|tfoot|tr|blockquote|pre|figure)>/gi;
  const ends: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) ends.push(m.index + m[0].length);
  if (ends.length === 0) return { head: html, tail: "" };
  const midIdx = Math.floor(ends.length / 2);
  const cut = ends[midIdx];
  return { head: html.slice(0, cut), tail: html.slice(cut) };
}

/* ----------------------- main ----------------------- */

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

      // 3) Split the remainder at a reasonable midpoint (based on blocks)
      const { head, tail } = splitHtmlAtMidBlock(rest);

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

      {/* Big thumbs belong inside the reading strip (outer .ws-article handles width) */}
      <BigThumbs slug={article.slug} />

      {/* The article body itself — no inner .ws-container to preserve .ws-article width */}
      <article className="min-w-0" style={{ overflow: "visible" }}>
        <div className="wysiwyg">
          {/* 1) Everything before the first H2 (Excerpt stays full width) */}
          {parts?.introHtml && <div dangerouslySetInnerHTML={{ __html: parts.introHtml }} />}

          {/* keep floats from jumping above the rule */}
          <div aria-hidden style={{ clear: "both", height: 0 }} />
          <hr className="adbay-rule my-6 md:my-8" />

          {/* 2) The first H2 */}
          {parts?.h2Html && <div dangerouslySetInnerHTML={{ __html: parts.h2Html }} />}

          {/* 3) The FIRST N blocks after H2 (full width) */}
          {parts?.firstBlocksAfterH2 && (
            <div dangerouslySetInnerHTML={{ __html: parts.firstBlocksAfterH2 }} />
          )}

          {/* Ensure the float cannot climb above this point */}
          <div aria-hidden style={{ clear: "both" }} />

          {/* 4) RIGHT ad now starts here */}
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
  // imgFit="contain"
  nudgeY={-6} lgNudgeY={-18}
  scale={1.1} lgScale={1.99}
/>



              {parts?.afterBlocksHead && (
                <div dangerouslySetInnerHTML={{ __html: parts.afterBlocksHead }} />
              )}
            </>
          )}

          {/* 5) LEFT ad at midpoint of the remaining content, then the tail */}
          {parts?.afterBlocksTail && (
            <>
              <FloatAd
                label="Beaverlodge Butcher Shop Delivery"
                side="left"
                imageSrc="/bbs.adcard.center.v4.png"
                imageAlt="Beaverlodge Butcher Shop delivery"
                w={320} mdW={161} lgW={340}
                h={156} mdH={156} lgH={130}
                intrinsic
                imgMaxH={150}
                mdImgMaxH={160}
                lgImgMaxH={170}
                imgClassName="max-w-[80%]"
                imgFit="contain"
                pad={0}
                nudgeY={-6} lgNudgeY={-8}
                scale={1.1} lgScale={1.5}
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
