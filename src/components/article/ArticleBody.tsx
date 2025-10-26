// src/components/article/ArticleBody.tsx
"use client";

import React from "react";
import type { Article } from "@prisma/client";
import FloatAd from "./FloatAd";
import WysiwygStyle from "./WysiwygStyle";

/** ---------- helpers ---------- */
function splitIntoParagraphs(html: string): string[] {
  const matches = html.match(/[\s\S]*?<\/p>/gi);
  if (matches && matches.length) return matches;
  return [html];
}
function splitForAdPlacement(html: string) {
  const h2Re = /<h2[\s\S]*?<\/h2>/i;
  const h2m = h2Re.exec(html);
  if (!h2m) {
    const firstP = /[\s\S]*?<\/p>/i.exec(html);
    if (!firstP) return { intro: html, sectionAndAfterIntro: "", rest: "" };
    const idx = firstP.index + firstP[0].length;
    return { intro: html.slice(0, idx), sectionAndAfterIntro: "", rest: html.slice(idx) };
  }
  const h2Start = h2m.index;
  const h2End = h2Start + h2m[0].length;

  const tail = html.slice(h2End);
  const pMatch = /[\s\S]*?<\/p>/i.exec(tail);
  if (!pMatch) return { intro: html.slice(0, h2End), sectionAndAfterIntro: "", rest: tail };

  const pEnd = pMatch.index + pMatch[0].length;
  return {
    intro: html.slice(0, h2Start),
    sectionAndAfterIntro: html.slice(h2Start, h2End + pEnd),
    rest: tail.slice(pEnd),
  };
}
function useSanitized(html: string) {
  const [clean, setClean] = React.useState<string | null>(null);
  React.useEffect(() => {
    let m = true;
    (async () => {
      const mod = await import("isomorphic-dompurify");
      const DOMPurify = (mod as any).default ?? mod;
      const out = DOMPurify.sanitize(html);
      if (m) setClean(out);
    })();
    return () => { m = false; };
  }, [html]);
  return clean;
}

/** ---------- main body component ---------- */
export default function ArticleBody({ article }: { article: Article }) {
  const { intro, sectionAndAfterIntro, rest } = splitForAdPlacement(article.content ?? "");
  const cleanIntro = useSanitized(intro);
  const cleanTarget = useSanitized(sectionAndAfterIntro);
  const cleanRest = useSanitized(rest);

  return (
    <>
      <WysiwygStyle />

      {/* Full-width body within the parent container */}
      <article className="min-w-0" style={{ overflow: "visible" }}>
        {/* 1) Intro (before the target H2) */}
        {cleanIntro !== null && (
          <div className="wysiwyg" dangerouslySetInnerHTML={{ __html: cleanIntro }} />
        )}

        {/* keep floats from jumping above the rule */}
        <div aria-hidden style={{ clear: "both", height: 0 }} />
        <hr className="adbay-rule" />

        {/* ---------- Float Ad #1 (RIGHT, beside the first H2 + next P) ---------- */}
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
          mt={8}
        />

        {/* 2) The target section (H2 + first paragraph after it) */}
        {cleanTarget !== null && (
          <div className="wysiwyg" dangerouslySetInnerHTML={{ __html: cleanTarget }} />
        )}

        {/* 3) Remainder of article, inject left ad halfway */}
        {cleanRest !== null && (() => {
          const parts = splitIntoParagraphs(cleanRest);
          const mid = parts.length > 0 ? Math.floor(parts.length / 2) : 0;
          const beforeMid = parts.slice(0, mid).join("");
          const afterMid = parts.slice(mid).join("");

          return (
            <>
              <div className="wysiwyg" dangerouslySetInnerHTML={{ __html: beforeMid }} />

              {/* ---------- Float Ad #2 (LEFT) ---------- */}
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

              <div className="wysiwyg" style={{ overflow: "visible" }} dangerouslySetInnerHTML={{ __html: afterMid }} />
            </>
          );
        })()}

        <div style={{ clear: "both" }} />
      </article>
    </>
  );
}
