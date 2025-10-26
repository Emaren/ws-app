// src/components/article/ArticleBody.tsx
"use client";

import React from "react";
import type { Article } from "@prisma/client";
import FloatAd from "./FloatAd";
import WysiwygStyle from "./WysiwygStyle";

/* ----------------------- helpers ----------------------- */

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
function splitAtFirstH2(html: string): { before: string; h2Html: string; afterH2: string } {
  const m = /<h2[\s\S]*?<\/h2>/i.exec(html);
  if (!m) return { before: "", h2Html: "", afterH2: html };
  const start = m.index!;
  const end = start + m[0].length;
  return { before: html.slice(0, start), h2Html: m[0], afterH2: html.slice(end) };
}

/**
 * Find a “midpoint” in HTML based on common block closers so we can
 * drop a floated ad there. Returns { head, tail } split strings.
 */
function splitHtmlAtMidBlock(html: string): { head: string; tail: string } {
  // Find the end indices of common block elements
  const re = /<\/(p|ul|ol|table|tbody|thead|tfoot|tr|blockquote|pre|figure)>/gi;
  const ends: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    ends.push(m.index + m[0].length);
  }
  if (ends.length === 0) {
    return { head: html, tail: "" };
  }
  const midIdx = Math.floor(ends.length / 2);
  const cut = ends[midIdx];
  return { head: html.slice(0, cut), tail: html.slice(cut) };
}

/* ----------------------- main ----------------------- */

export default function ArticleBody({ article }: { article: Article }) {
  const [parts, setParts] = React.useState<{
    introHtml: string;   // before first <h2>
    h2Html: string;      // the first <h2>…</h2>
    afterH2Head: string; // content after <h2> up to “midpoint”
    afterH2Tail: string; // remainder after midpoint
  } | null>(null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      const raw = article.content ?? "";
      const clean = await sanitizeHtml(raw);
      const unwrapped = stripSingleOuterDiv(clean);

      // 1) Split on the first H2
      const { before, h2Html, afterH2 } = splitAtFirstH2(unwrapped);

      // 2) Split the remainder at a reasonable midpoint (based on blocks)
      const { head, tail } = splitHtmlAtMidBlock(afterH2);

      if (alive) {
        setParts({
          introHtml: before,
          h2Html,
          afterH2Head: head,
          afterH2Tail: tail,
        });
      }
    })();
    return () => {
      alive = false;
    };
  }, [article.content]);

  return (
    <>
      <WysiwygStyle />

      {/* One BFC for the whole article body so floats wrap properly */}
      <article className="min-w-0" style={{ overflow: "visible" }}>
        <div className="wysiwyg">
          {/* 1) Everything before the first H2 */}
          {parts?.introHtml && <div dangerouslySetInnerHTML={{ __html: parts.introHtml }} />}

          {/* keep floats from jumping above the rule */}
          <div aria-hidden style={{ clear: "both", height: 0 }} />
          <hr className="adbay-rule" />

          {/* 2) The first H2 */}
          {parts?.h2Html && <div dangerouslySetInnerHTML={{ __html: parts.h2Html }} />}

          {/* 3) RIGHT ad (hh.png) appears immediately after H2,
                 then we render the *entire* next chunk so everything wraps:
                 paragraphs, lists, quotes, tables, etc. */}
          {parts && (
            <>
              <FloatAd
                label="Homesteader Health Delivery"
                side="right"
                imageSrc="/hh.png"
                imageAlt="Homesteader Health home delivery"
                w={289} mdW={300} lgW={320}
                h={170} mdH={180} lgH={190}
                intrinsic
                imgMaxH={120} mdImgMaxH={130} lgImgMaxH={140}
                imgClassName="max-w-[75%]"
                imgFit="contain"
                pad={2}
              />
              <div dangerouslySetInnerHTML={{ __html: parts.afterH2Head }} />
            </>
          )}

          {/* 4) LEFT ad at midpoint, then the tail content */}
          {parts && (
            <>
              <FloatAd
                label="Beaverlodge Butcher Shop Delivery"
                side="left"
                imageSrc="/bbs.adcard.center.v4.png"
                imageAlt="Beaverlodge Butcher Shop delivery"
                w={320} mdW={328} lgW={340}
                h={158} mdH={170} lgH={180}
                intrinsic
                imgMaxH={150} mdImgMaxH={160} lgImgMaxH={170}
                imgClassName="max-w-[80%]"
                imgFit="contain"
                pad={0}
              />
              <div dangerouslySetInnerHTML={{ __html: parts.afterH2Tail }} />
            </>
          )}

          <div style={{ clear: "both" }} />
        </div>
      </article>
    </>
  );
}
