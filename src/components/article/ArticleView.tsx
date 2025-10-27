// src/components/article/ArticleView.tsx
"use client";

import React from "react";
import type { Article } from "@prisma/client";
import Link from "next/link";
import ArticleBody from "./ArticleBody";
import ArticleHeaderArt from "./ArticleHeaderArt";

type Props = { article?: Article | null; variant: "summary" | "full" };

export default function ArticleView({ article, variant }: Props) {
  if (!article) {
    return (
      <div className="ws-container">
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 text-sm opacity-70">
          No article content available.
        </div>
      </div>
    );
  }

  if (variant === "summary") {
    return (
      <article className="border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
        {article.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.coverUrl}
            alt=""
            width={1200}
            height={320}
            sizes="(min-width: 1024px) 600px, 100vw"
            className="w-full h-56 object-cover"
            loading="lazy"
            decoding="async"
          />
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
      <div className="site-shell--wide">
        {/* Title + meta + header image row */}
        <header className={`${column} mb-8`}>
          <h1 className="text-3xl font-semibold tracking-tight">
            {article.title ?? "Untitled"}
          </h1>
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
        </header>
      </div>

      {/* Full-bleed header art (not clamped by ws-article/ws-container) */}
      <ArticleHeaderArt
        title={article.title}
        slug={article.slug}
        coverUrl={article.coverUrl}
        headerImageUrl={(article as any).headerImageUrl}
        contentHtml={article.content}
      />

      {/* Body in the centered reading strip */}
      <div className="ws-article">
        <ArticleBody article={article} />
      </div>

      {/* Divider also aligned to the reading strip */}
      <div className="ws-article">
        <hr className="adbay-rule" />
      </div>
    </>
  );
}
