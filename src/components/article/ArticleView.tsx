// src/components/article/ArticleView.tsx
"use client";

import React from "react";
import type { Article } from "@prisma/client";
import Link from "next/link";
import ArticleBody from "./ArticleBody";
import ArticleHeaderArt from "./ArticleHeaderArt";

type Props = { article?: Article | null; variant: "summary" | "full" };

// Locale/zone-safe date so SSR/client match (prevents hydration mismatch)
function formatStable(dt?: Date | string | null) {
  if (!dt) return "";
  const d = typeof dt === "string" ? new Date(dt) : dt;
  // UTC + fixed format = identical on server & client
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}, ${hh}:${mm} UTC`;
}

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
          <Link href={`/articles/${article.slug}`} className="text-xl font-semibold hover:underline underline-offset-4">
            {article.title ?? "Untitled"}
          </Link>
          {article.excerpt && <p className="opacity-80 leading-relaxed">{article.excerpt}</p>}
          <div className="text-sm opacity-60">
            {article.publishedAt ? formatStable(article.publishedAt) : "Unpublished"}
          </div>
        </div>
      </article>
    );
  }

  // ----- Full article -----
  return (
    <>
      {/* 1) Title/byline inside page frame + reader strip */}
      <div className="ws-container">
        <div className="ws-article">
          <header className="mb-6 md:mb-8">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-balance">
              {article.title ?? "Untitled"}
            </h1>
            <div className="mt-2 text-sm">
              <div className="opacity-75">
                Author: {(article as any).contributor ?? "Wheat & Stone Team"}
              </div>
              <div className="opacity-60">
                {article.publishedAt ? formatStable(article.publishedAt) : "Unpublished"}
              </div>
            </div>
          </header>
        </div>
      </div>

      {/* 2) Hero aligned to the same reader strip as the title/body */}
      <div className="ws-container">
        <div className="ws-article">
          <ArticleHeaderArt
            title={article.title}
            slug={article.slug}
            coverUrl={article.coverUrl}
            headerImageUrl={(article as any).headerImageUrl}
            contentHtml={article.content}
          />
        </div>
      </div>

      {/* 3) Body aligned to the centered reader strip */}
      <div className="ws-container">
        <div className="ws-article">
          <ArticleBody article={article} />
        </div>
      </div>

      {/* 4) Rule aligned to the reading strip */}
      <div className="ws-container">
        <div className="ws-article">
          <hr className="adbay-rule" />
        </div>
      </div>
    </>
  );
}
