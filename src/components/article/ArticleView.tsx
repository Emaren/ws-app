// src/components/article/ArticleView.tsx
"use client";

import type { Article } from "@prisma/client";
import Link from "next/link";
import WysiwygStyle from "./WysiwygStyle";

type Props = {
  article?: Article | null;
  variant: "summary" | "full";
};

/** Small floated ad card (true CSS float so body text wraps around it). */
function FloatAd({ label, side }: { label: string; side: "right" | "left" }) {
  const style: React.CSSProperties = {
    width: 320,
    height: 160,
    float: side,
    marginLeft: side === "right" ? 16 : 0,
    marginRight: side === "left" ? 16 : 0,
    marginBottom: 16,
  };
  return (
    <div
      role="complementary"
      aria-label={label}
      style={style}
      className="rounded-xl border text-sm bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300"
    >
      <div className="h-full w-full flex items-center justify-center">{label}</div>
    </div>
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

  // Always reserve a header-image spot.
  // For THIS article, prefer /Avalon.jpg; otherwise:
  // explicit field -> first <img> in content -> coverUrl -> (no image => placeholder)
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
            {/* left: author + timestamp */}
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

            {/* right: image OR placeholder box (keeps the space reserved) */}
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
          {/* First paragraph */}
          {first && (
            <div
              className="wysiwyg max-w-prose md:max-w-3xl"
              style={{ overflow: "visible" }}
              dangerouslySetInnerHTML={{ __html: first }}
            />
          )}

          {/* Ad #1 floats right, text wraps around it */}
          <FloatAd label="Homesteader Health Delivery" side="right" />

          {/* Paragraphs up to midpoint */}
          {beforeMid && (
            <div
              className="wysiwyg max-w-prose md:max-w-3xl"
              style={{ overflow: "visible" }}
              dangerouslySetInnerHTML={{ __html: beforeMid }}
            />
          )}

          {/* Ad #2 floats left, roughly halfway through the article */}
          <FloatAd label="Beaverlodge Butcher Shop Delivery" side="left" />

          {/* Remaining paragraphs */}
          {afterMid && (
            <div
              className="wysiwyg max-w-prose md:max-w-3xl"
              style={{ overflow: "visible" }}
              dangerouslySetInnerHTML={{ __html: afterMid }}
            />
          )}

          {/* Clear floats so comments and anything after start below */}
          <div style={{ clear: "both" }} />
        </div>
      </article>
    </>
  );
}
