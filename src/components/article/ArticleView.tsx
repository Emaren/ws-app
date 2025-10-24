// src/components/article/ArticleView.tsx
"use client";

import type { Article } from "@prisma/client";
import Link from "next/link";
import Image from "next/image";
import WysiwygStyle from "./WysiwygStyle";

type Props = {
  article?: Article | null;
  variant: "summary" | "full";
};

/** Small floated ad card (true CSS float so body text wraps around it). */
function FloatAd({
  label,
  side,
  imageSrc,
  imageAlt,
  tall,
  intrinsic,         // keep HH natural-height
  nudgeY = 0,        // <— pixels to vertically nudge the image (negative = up)
}: {
  label: string;
  side: "right" | "left";
  imageSrc?: string;
  imageAlt?: string;
  tall?: boolean;
  intrinsic?: boolean;
  nudgeY?: number;
}) {
  const boxStyle: React.CSSProperties = {
    width: 320,
    float: side,
    marginLeft: side === "right" ? 16 : 0,
    marginRight: side === "left" ? 16 : 0,
    marginBottom: 16,
    height: intrinsic ? undefined : tall ? 256 : 160, // Beaverlodge fixed; Homesteader natural
    display: "inline-block",
  };

  const subject = encodeURIComponent(`Ad Inquiry: ${label}`);
  const body = encodeURIComponent(
    `Hi Tony,\n\nI'm interested in the "${label}" ad placement I saw on Wheat & Stone.\n\nThanks!\n`
  );

  return (
    <a
      href={`mailto:tony@wheatandstone.ca?subject=${subject}&body=${body}`}
      aria-label={`${label} — email tony@wheatandstone.ca`}
      style={boxStyle}
      className={[
        "group floatad relative rounded-xl border overflow-hidden cursor-pointer", // ← add floatad
        "bg-neutral-50 dark:bg-neutral-900",
        "border-neutral-200 dark:border-neutral-800",
        "ring-0 transition focus:outline-none focus-visible:ring-2",
        "hover:ring-neutral-300 dark:hover:ring-neutral-700",
      ].join(" ")}
    >
      {imageSrc ? (
        intrinsic ? (
          /* HOMESTEADER: natural height, centered horizontally */
          <div className="p-3 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageSrc}
              alt={imageAlt || label}
              className="block h-auto max-w-full"
              loading="lazy"
            />
          </div>
        ) : (
          /* BEAVERLODGE: fixed-height card; center both ways; nudge up */
          <div className="h-full w-full p-3 flex items-center justify-center">
            <Image
              src={imageSrc}
              alt={imageAlt || label}
              width={320}
              height={tall ? 256 : 160}
              className="max-h-full max-w-full object-contain"
              style={{ transform: `translateY(${nudgeY}px)` }}  // <— lift/lower without cropping
              priority={false}
            />
          </div>
        )
      ) : (
        <div className="h-full w-full flex items-center justify-center text-sm text-neutral-700 dark:text-neutral-300">
          {label}
        </div>
      )}

      {/* Overlay */}
      <div
        className={[
          "floatad__overlay",                                 // ← add this
          "absolute inset-0 z-50 flex items-center justify-center",
          "bg-black/0",                                       // start transparent
        ].join(" ")}
        aria-hidden="true"
      >
        <span className="rounded-md bg-black/70 px-3 py-1.5 text-xs font-medium text-white">
          Delivery
        </span>
      </div>
    </a>
  );
}

/** Split article HTML into an array of paragraph-sized chunks (ES2015-safe). */
function splitIntoParagraphs(html: string): string[] {
  const matches = html.match(/[\s\S]*?<\/p>/gi);
  if (matches && matches.length) return matches;
  return [html];
}

/** Extract the first <img src="..."> from HTML, if any. */
function extractFirstImageSrc(html: string | null | undefined): string | null {
  if (!html) return null;
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

export default function ArticleView({ article, variant }: Props) {
  if (!article) {
    return (
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 text-sm opacity-70">
        No article content available.
      </div>
    );
  }

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

  // ---------- Full article with two floated ads placed inside the flow ----------
  const all = splitIntoParagraphs(article.content ?? "");
  const first = all[0] ?? "";
  const rest = all.slice(1);

  const mid = rest.length > 0 ? Math.floor(rest.length / 2) : 0;
  const beforeMid = rest.slice(0, mid).join("");
  const afterMid = rest.slice(mid).join("");

  // Header image choice
  const explicitHeader = (article as any).headerImageUrl as string | undefined;
  const isAvalonArticle =
    (article.slug?.toLowerCase().includes("avalon") ||
      article.title?.toLowerCase().includes("avalon")) ?? false;
  const contentImg = extractFirstImageSrc(article.content);
  const headerImageUrl =
    explicitHeader ||
    (isAvalonArticle ? "/Avalon.jpg" : undefined) ||
    contentImg ||
    article.coverUrl ||
    null;

  return (
    <>
      <WysiwygStyle />

      <article className="min-w-0">
        {/* Optional large cover */}
        {article.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.coverUrl}
            alt=""
            className="w-full h-[340px] object-cover rounded-2xl mb-8"
          />
        )}

        {/* Title + meta with a ALWAYS-PRESENT right cell (image or placeholder) */}
        <header className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">{article.title ?? "Untitled"}</h1>

          <div className="mt-2 grid grid-cols-1 md:grid-cols-[1fr_140px] items-center gap-4">
            <div>
              <div className="text-sm opacity-75">
                Author: {(article as any).contributor ?? "Wheat & Stone Team"}
              </div>
              <div className="text-sm opacity-60">
                {article.publishedAt
                  ? new Date(article.publishedAt).toLocaleString()
                  : "Unpublished"}
              </div>
            </div>

            {headerImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={headerImageUrl}
                alt=""
                className="place-self-center md:place-self-end w-[140px] h-[140px] object-cover rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm"
                loading="lazy"
              />
            ) : (
              <div className="place-self-center md:place-self-end w-[140px] h-[140px] rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 text-xs flex items-center justify-center opacity-60">
                Image
              </div>
            )}
          </div>
        </header>

        {/* Body with ads injected between paragraph chunks */}
        <div style={{ overflow: "visible" }}>
          {first && (
            <div
              className="wysiwyg max-w-prose md:max-w-3xl"
              style={{ overflow: "visible" }}
              dangerouslySetInnerHTML={{ __html: first }}
            />
          )}

          {/* Ad #1 — Homesteader: intrinsic height, centered */}
          <FloatAd
            label="Homesteader Health Delivery"
            side="right"
            imageSrc="/hh.png"
            imageAlt="Homesteader Health home delivery"
            intrinsic
          />

          {beforeMid && (
            <div
              className="wysiwyg max-w-prose md:max-w-3xl"
              style={{ overflow: "visible" }}
              dangerouslySetInnerHTML={{ __html: beforeMid }}
            />
          )}

          {/* Ad #2 — Beaverlodge: fixed-height gray card, centered */}
          <FloatAd
            label="Beaverlodge Butcher Shop Delivery"
            side="left"
            imageSrc="/bbs.trim.v6.png"
            imageAlt="Beaverlodge Butcher Shop delivery"
            tall
          />

          {afterMid && (
            <div
              className="wysiwyg max-w-prose md:max-w-3xl"
              style={{ overflow: "visible" }}
              dangerouslySetInnerHTML={{ __html: afterMid }}
            />
          )}

          <div style={{ clear: "both" }} />
        </div>
      </article>
    </>
  );
}
