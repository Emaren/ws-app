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
            {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : "Unpublished"}
          </div>
        </div>
      </article>
    );
  }

  // Full article — use a centered container WITHOUT an 800px clamp so the
  // body can flow at the full page width and wrap around the floated ad boxes.
  // (Comments are rendered by the page, not here.)
  return (
    <div className="mx-auto w-full max-w-7xl px-6 md:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">{article.title ?? "Untitled"}</h1>
        <div className="mt-2 text-sm">
          <div className="opacity-75">
            Author: {(article as any).contributor ?? "Wheat & Stone Team"}
          </div>
          <div className="opacity-60">
            {article.publishedAt ? new Date(article.publishedAt).toLocaleString() : "Unpublished"}
          </div>
        </div>
      </header>

      <ArticleHeaderArt
        title={article.title}
        slug={article.slug}
        coverUrl={article.coverUrl}
        headerImageUrl={(article as any).headerImageUrl}
        contentHtml={article.content}
      />

      <ArticleBody article={article} />

      <hr className="adbay-rule" />
    </div>
  );
}
