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

  // ----- Full article (center strip for reading; header art stays full-bleed) -----
  return (
    <>
      {/* Title + byline inside the centered reading strip */}
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
