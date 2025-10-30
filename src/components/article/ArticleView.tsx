// src/components/article/ArticleView.tsx
"use client";

import React from "react";
import type { Article } from "@prisma/client";
import Link from "next/link";
import dynamic from "next/dynamic";
import ArticleBody from "./ArticleBody";
import ReactionsBar from "./ReactionsBar";
import AffiliatePair from "./AffiliatePair";

// Client-only to avoid hydration diffs
const ArticleHeaderArt = dynamic(() => import("./ArticleHeaderArt"), { ssr: false });

type Props = {
  article?: Article | null;
  variant: "summary" | "full";
  publishedAtUTC?: string;
  publishedAtISOString?: string;
};

const formatUTC = (dt?: Date | string | null) => {
  if (!dt) return "";
  const d = typeof dt === "string" ? new Date(dt) : dt;
  const iso = d.toISOString();
  const [date, time] = iso.split("T");
  return `${date} ${time.slice(0, 5)} UTC`;
};

export default function ArticleView({
  article,
  variant,
  publishedAtUTC,
  publishedAtISOString,
}: Props) {
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
          {article.excerpt && (
            <p className="opacity-80 leading-relaxed">{article.excerpt}</p>
          )}
          <div className="text-sm opacity-60">
            {article.publishedAt
              ? publishedAtUTC ?? formatUTC(article.publishedAt)
              : "Unpublished"}
          </div>
        </div>
      </article>
    );
  }

  return (
    <>
      {/* Title/byline */}
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
                {article.publishedAt ? (
                  <time dateTime={publishedAtISOString} suppressHydrationWarning>
                    {publishedAtUTC ?? formatUTC(article.publishedAt)}
                  </time>
                ) : (
                  "Unpublished"
                )}
              </div>
            </div>
          </header>
        </div>
      </div>

      {/* Hero */}
      <div className="ws-container">
        <div className="ws-article overflow-x-clip">
          <ArticleHeaderArt
            title={article.title}
            slug={article.slug}
            coverUrl={article.coverUrl}
            headerImageUrl={(article as any).headerImageUrl}
            contentHtml={article.content}
          />
        </div>
      </div>

      {/* Body (hard clamp any horizontal overflow) */}
      <div className="ws-container">
        <div className="ws-article overflow-x-clip">
          <ArticleBody article={article} />
        </div>
      </div>

      {/* Divider */}
      <div className="ws-container">
        <div className="ws-article overflow-x-clip">
          <hr className="adbay-rule my-8 md:my-10" />
        </div>
      </div>

      {/* Reactions */}
      <div className="ws-container">
        <div className="ws-article overflow-x-clip">
          <div className="mt-6 md:mt-8 mb-8 md:mb-10 flex items-center justify-between">
            <ReactionsBar
              slug={article.slug}
              likeCount={article.likeCount}
              wowCount={article.wowCount}
              hmmCount={article.hmmCount}
            />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="ws-container">
        <div className="ws-article overflow-x-clip">
          <hr className="adbay-rule my-6 md:my-8" />
        </div>
      </div>

      {/* Affiliate pair */}
      <div className="ws-container">
        <div className="ws-article overflow-x-clip">
          <AffiliatePair
            left={{
              title: "NESQUICK CHOCOLATE POWDER 44.9OZ (2.81LBS)",
              href: "https://www.amazon.ca/dp/B09FTPGQ3B?tag=wheatandstone-20",
              imageSrc: "/NQ.png",
              badge: "Beast System",
              priceHint: "From $34.60",
            }}
            right={{
              title: "Avalon Organic Chocolate Milk",
              href: "mailto:tony@wheatandstone.ca?subject=Chocolate Milk Order&body=Hi%20Tony,%20I’d%20like%20to%20order%20Avalon%20Organic%20Chocolate%20Milk.%20Please%20send%20me%20the%20details.",
              imageSrc: "/AV.png",
              badge: "Health Pick",
              priceHint: "From $5.79",
            }}
          />
        </div>
      </div>

      {/* End rule */}
      <div className="ws-container">
        <div className="ws-article overflow-x-clip">
          <hr className="adbay-rule" />
        </div>
      </div>
    </>
  );
}
