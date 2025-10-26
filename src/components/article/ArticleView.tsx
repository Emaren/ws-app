// src/components/article/ArticleView.tsx
"use client";

import React from "react";
import type { Article } from "@prisma/client";
import Link from "next/link";
import Image from "next/image";
import WysiwygStyle from "./WysiwygStyle";

/** -------- utilities -------- */

function splitIntoParagraphs(html: string): string[] {
  const matches = html.match(/[\s\S]*?<\/p>/gi);
  if (matches && matches.length) return matches;
  return [html];
}

function extractFirstImageSrc(html: string | null | undefined): string | null {
  if (!html) return null;
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

/** --------------------------------------------------------------
 * FloatAd — responsive float ad with full container & image control
 * (uses CSS vars so Tailwind keeps the classes)
 * -------------------------------------------------------------- */
type FloatAdProps = {
  label: string;
  side: "right" | "left";
  imageSrc?: string;
  imageAlt?: string;

  // Container sizing (px)
  w?: number; h?: number;
  mdW?: number; mdH?: number;
  lgW?: number; lgH?: number;

  // Image sizing (px)
  intrinsic?: boolean;             // true = <img>, false = Next <Image>
  imgMaxH?: number;                // base clamp
  mdImgMaxH?: number;              // md clamp
  lgImgMaxH?: number;              // lg clamp
  imgFit?: "contain" | "cover";
  nudgeY?: number;

  // Spacing / cosmetics
  pad?: number; mt?: number;

  // Optional class hooks
  containerClassName?: string;
  imgClassName?: string;
};

function sizeClass(v?: number, axis: "w" | "h" = "w") {
  return v != null ? `${axis}-[${v}px]` : "";
}
function join(...parts: (string | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

function FloatAd({
  label,
  side,
  imageSrc,
  imageAlt,
  // container sizes
  w, h, mdW, mdH, lgW, lgH,
  // image sizes
  intrinsic,
  imgMaxH, mdImgMaxH, lgImgMaxH,
  imgFit = "contain",
  // layout
  nudgeY = 0,
  pad = 16,
  mt = 0,
  containerClassName,
  imgClassName,
}: FloatAdProps) {
  const isLeft = side === "left";
  const horizontalGutter = isLeft ? 44 : 36;
  const shapePad = isLeft ? 32 : 16;

  // Float container base style (float + margins + shape-outside)
  const boxStyle: React.CSSProperties = {
    float: side,
    marginTop: mt,
    marginLeft: !isLeft ? horizontalGutter : 0,
    marginRight: isLeft ? horizontalGutter : 0,
    marginBottom: 20,
    shapeOutside: "margin-box",
    shapeMargin: `${shapePad}px`,
    display: "inline-block",
  };

  // Container responsive classes (Tailwind sees these statically)
  const containerSizeClasses = join(
    sizeClass(w, "w"),
    sizeClass(h, "h"),
    mdW != null ? `md:${sizeClass(mdW, "w")}` : "",
    mdH != null ? `md:${sizeClass(mdH, "h")}` : "",
    lgW != null ? `lg:${sizeClass(lgW, "w")}` : "",
    lgH != null ? `lg:${sizeClass(lgH, "h")}` : "",
  );

  const innerPadStyle: React.CSSProperties = { padding: pad };
  const fitClass = imgFit === "cover" ? "object-cover" : "object-contain";

  // CSS vars provide dynamic values; classes stay static
  const imgStyleVars: React.CSSProperties = {
    ...(imgMaxH != null ? { ["--img-h" as any]: `${imgMaxH}px` } : {}),
    ...(mdImgMaxH != null ? { ["--img-h-md" as any]: `${mdImgMaxH}px` } : {}),
    ...(lgImgMaxH != null ? { ["--img-h-lg" as any]: `${lgImgMaxH}px` } : {}),
    transform: `translateY(${nudgeY}px)`,
  };

  return (
    <a
      href={`mailto:tony@wheatandstone.ca?subject=${encodeURIComponent(`Ad Inquiry: ${label}`)}&body=${encodeURIComponent(
        `Hi Tony,\n\nI'm interested in the "${label}" ad placement I saw on Wheat & Stone.\n\nThanks!\n`,
      )}`}
      aria-label={`${label} — email tony@wheatandstone.ca`}
      style={boxStyle}
      className={join(
        "group floatad relative rounded-xl border overflow-hidden cursor-pointer",
        "bg-neutral-50 dark:bg-neutral-900",
        "border-neutral-200 dark:border-neutral-800",
        "ring-0 transition focus:outline-none focus-visible:ring-2",
        "hover:ring-neutral-300 dark:hover:ring-neutral-700",
        containerSizeClasses,
        containerClassName
      )}
    >
      {imageSrc ? (
        intrinsic ? (
          // Intrinsic <img> stays responsive; clamp via CSS vars
          <div className="h-full w-full flex items-center justify-center" style={innerPadStyle}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageSrc}
              alt={imageAlt || label}
              className={join(
                "block w-auto h-auto max-w-full",
                "max-h-[var(--img-h)] md:max-h-[var(--img-h-md)] lg:max-h-[var(--img-h-lg)]",
                fitClass,
                imgClassName
              )}
              style={imgStyleVars}
              loading="lazy"
            />
          </div>
        ) : (
          // Fixed-box using Next/Image
          <div className="h-full w-full flex items-center justify-center" style={innerPadStyle}>
            <Image
              src={imageSrc}
              alt={imageAlt || label}
              width={Math.max(1, (w ?? 1))}
              height={Math.max(1, (h ?? 1))}
              className={join("max-h-full max-w-full", fitClass, imgClassName)}
              style={{ transform: `translateY(${nudgeY}px)` }}
              priority={false}
            />
          </div>
        )
      ) : (
        <div className="h-full w-full flex items-center justify-center text-sm text-neutral-700 dark:text-neutral-300">
          {label}
        </div>
      )}
      <div className="floatad__overlay" aria-hidden="true" />
    </a>
  );
}

/** -------------------------------------------------------------- */

type Props = {
  article?: Article | null;
  variant: "summary" | "full";
};

export default function ArticleView({ article, variant }: Props) {
  if (!article) {
    return (
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 text-sm opacity-70">
        No article content available.
      </div>
    );
  }

  /* ---------- Summary card ---------- */
  if (variant === "summary") {
    return (
      <article className="border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
        {article.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={article.coverUrl} alt="" className="w-full h-56 object-cover" loading="lazy" />
        )}
        <div className="p-5 space-y-3">
          <Link
            href={`/articles/${article.slug}`}
            className="text-xl font-semibold hover:underline underline-offset-4"
          >
            {article.title ?? "Untitled"}
          </Link>
          {article.excerpt && <p className="opacity-80 leading-relaxed">{article.excerpt}</p>}
          <div className="text-sm opacity-60">
            {article.publishedAt
              ? new Date(article.publishedAt).toLocaleDateString()
              : "Unpublished"}
          </div>
        </div>
      </article>
    );
  }

  /* ---------- Full article with deterministic ad injection ---------- */

  // Header image choice
  const explicitHeader = (article as any).headerImageUrl as string | undefined;
  const isAvalonArticle =
    (article.slug?.toLowerCase().includes("avalon") ||
      article.title?.toLowerCase().includes("avalon")) ?? false;
  const contentImg = extractFirstImageSrc(article.content);
  const headerImageUrl =
    explicitHeader ||
    (isAvalonArticle ? "/ECAvalon.jpg" : undefined) ||
    contentImg ||
    article.coverUrl ||
    null;

  const mainCoverUrl = article.coverUrl || headerImageUrl;

  // --- Split content so the right-rail ad lands AFTER first <h2> and its next <p> ---
  function splitForAdPlacement(html: string) {
    const h2Re = /<h2[\s\S]*?<\/h2>/i;
    const h2m = h2Re.exec(html);
    if (!h2m) {
      // Fallback: no h2 -> behave like old logic (after first paragraph)
      const firstP = /[\s\S]*?<\/p>/i.exec(html);
      if (!firstP) return { intro: html, sectionAndAfterIntro: "", rest: "" };
      const idx = firstP.index + firstP[0].length;
      return {
        intro: html.slice(0, idx),
        sectionAndAfterIntro: "",
        rest: html.slice(idx),
      };
    }
    const h2Start = h2m.index;
    const h2End = h2Start + h2m[0].length;

    // Find the first <p> AFTER the h2
    const tail = html.slice(h2End);
    const pRe = /[\s\S]*?<\/p>/i;
    const pMatch = pRe.exec(tail);

    if (!pMatch) {
      // h2 exists but no paragraph after it
      return {
        intro: html.slice(0, h2End),
        sectionAndAfterIntro: "",
        rest: tail,
      };
    }

    const pEnd = pMatch.index + pMatch[0].length;

    return {
      // Everything before the target section (this is the “excerpt/intro”)
      intro: html.slice(0, h2Start),

      // The target section you want the ad to float beside: H2 + next paragraph
      sectionAndAfterIntro: html.slice(h2Start, h2End + pEnd),

      // The remainder of the article after that paragraph
      rest: tail.slice(pEnd),
    };
  }

  const { intro, sectionAndAfterIntro, rest } = splitForAdPlacement(article.content ?? "");

  // ---- Client-only sanitization ----
  const [cleanIntro, setCleanIntro] = React.useState<string | null>(null);
  const [cleanSectionAndAfterIntro, setCleanSectionAndAfterIntro] = React.useState<string | null>(null);
  const [cleanRest, setCleanRest] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const mod = await import("isomorphic-dompurify");
      const DOMPurify = (mod as any).default ?? mod;
      const a = DOMPurify.sanitize(intro);
      const b = DOMPurify.sanitize(sectionAndAfterIntro);
      const c = DOMPurify.sanitize(rest);
      if (mounted) {
        setCleanIntro(a);
        setCleanSectionAndAfterIntro(b);
        setCleanRest(c);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [intro, sectionAndAfterIntro, rest]);

  // Allow the article body to breathe: stretch to the outer rail width
  const column = "w-full max-w-none";

  return (
    <>
      <WysiwygStyle />

      {/* Page container (rails come from responsive padding only) */}
      <div className="mx-auto w-full max-w-none px-4 sm:px-6 md:px-10 lg:px-16 xl:px-20">
        {/* Title + meta + header image row */}
        <header className={`${column} mb-8`}>
          <h1 className="text-3xl font-semibold tracking-tight">
            {article.title ?? "Untitled"}
          </h1>

          {/* Meta */}
          <div className="mt-2 text-sm">
            <div className="opacity-75">
              Author: {(article as any).contributor ?? "Wheat & Stone Team"}
            </div>
            <div className="opacity-60">
              {article.publishedAt
                ? new Date(article.publishedAt).toLocaleString()
                : "Unpublished"}
            </div>
          </div>

          {/* Badge + Bottle, symmetric gutters on md+ */}
          {mainCoverUrl && (
            <>
              {/* md+ : 1fr | 220 | 24 | 0–560 | 1fr */}
              <div
                className="mt-6 hidden md:grid items-stretch"
                style={{ gridTemplateColumns: "1fr 220px 24px minmax(0,560px) 1fr" }}
              >
                {/* Badge + legend (bottom-aligned) */}
                <div
                  className="flex h-full items-end justify-center"
                  style={{ gridColumn: 2, transform: "translate(-23px, 3px)" }}
                >
                  <div className="flex flex-col items-center justify-end">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/WSNI.png"
                      alt="Product score indicator"
                      style={{
                        width: "100%",
                        height: "auto",
                        maxWidth: 220,
                        filter: "drop-shadow(0 2px 8px rgba(0,0,0,.35))",
                      }}
                      loading="lazy"
                    />
                    {/* Legend with NO bullets */}
                    <div
                      className="mt-2 text-[12px] leading-[1.05] tracking-tight text-center select-none space-y-0.5"
                      style={{ listStyle: "none" }}
                    >
                      <div className="opacity-80">🏅 Trusted Classic</div>
                      <div className="opacity-75 text-emerald-600 dark:text-emerald-300 font-medium">
                        🍫 Honest&nbsp;Indulgence
                      </div>
                      <div className="opacity-75">🌿 Modern Nourishment</div>
                      <div className="opacity-75">🥛 Whole Dairy, Honestly Made</div>
                    </div>
                  </div>
                </div>

                {/* Bottle (nudged right a hair) */}
                <div style={{ gridColumn: 4 }} className="min-w-0 flex justify-center">
                  <div className="w-full max-w-[560px] translate-x-[10px] flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={mainCoverUrl}
                      alt=""
                      className="block rounded-2xl object-contain w-auto max-w-full md:max-h-[180px]"
                      loading="lazy"
                    />
                  </div>
                </div>
              </div> {/* CLOSE the md grid wrapper */}

              {/* < md : stack, centered */}
              <div className="mt-6 md:hidden flex flex-col items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/WSNI.png" alt="Product score indicator" className="w-[180px] h-auto" loading="lazy" />
                {/* Caption under the badge (mobile) */}
                <div className="text-[13px] leading-snug font-medium text-amber-700 dark:text-amber-300/90 tracking-tight text-center select-none -mt-2">
                  ⚠️ Engineered&nbsp;Edible
                </div>

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mainCoverUrl}
                  alt=""
                  className="block rounded-2xl object-contain"
                  style={{ width: "100%", height: "auto", maxWidth: 560, transform: "translateX(10px)" }}
                  loading="lazy"
                />
              </div>
            </>
          )}
        </header>

        {/* Body with deterministic ad positions */}
        <article className={`${column} min-w-0`} style={{ overflow: "visible" }}>
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
            // Container size (px) at each breakpoint
            w={289} mdW={300} lgW={320}
            h={170} mdH={180} lgH={190}
            // Image clamp (make the image smaller than the box)
            intrinsic
            imgMaxH={120} mdImgMaxH={130} lgImgMaxH={140}
            imgClassName="max-w-[75%]"
            imgFit="contain"
            pad={2}
            mt={8}
          />

          {/* 2) The target section (H2 + first paragraph after it) */}
          {cleanSectionAndAfterIntro !== null && (
            <div className="wysiwyg" dangerouslySetInnerHTML={{ __html: cleanSectionAndAfterIntro }} />
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
      </div>
    </>
  );
}
