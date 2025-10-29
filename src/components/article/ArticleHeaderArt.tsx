// src/components/article/ArticleHeaderArt.tsx
"use client";

import React from "react";

function extractFirstImageSrc(html: string | null | undefined): string | null {
  if (!html) return null;
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

export default function ArticleHeaderArt({
  title,
  slug,
  coverUrl,
  headerImageUrl: explicitHeader,
  contentHtml,
}: {
  title?: string | null;
  slug?: string | null;
  coverUrl?: string | null;
  headerImageUrl?: string | null;
  contentHtml?: string | null;
}) {
  const isAvalon =
    !!(slug && slug.toLowerCase().includes("avalon")) ||
    !!(title && title.toLowerCase().includes("avalon"));

  const contentImg = extractFirstImageSrc(contentHtml);
  const headerImageUrl =
    explicitHeader ||
    (isAvalon ? "/ECAvalon.jpg" : undefined) ||
    contentImg ||
    coverUrl ||
    null;

  if (!headerImageUrl) return null;

  return (
    <>
      {/* md+ layout: badge (fixed 220) + bottle (fills strip, capped by --header-media-max) */}
      <div
        className="mt-6 hidden md:grid w-full items-start"
        style={{
          gridTemplateColumns: "220px minmax(0, 1fr)",
          columnGap: 24,
        }}
      >
        {/* Badge + legend */}
        <div className="flex items-start justify-center">
          <div className="flex flex-col items-center justify-end" style={{ marginTop: -15, height: "100%" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/WSNI.png"
              alt="Product score indicator"
              width={220}
              height={220}
              style={{
                width: "90%",
                height: "auto",
                maxWidth: 220,
                filter: "drop-shadow(0 2px 8px rgba(0,0,0,.35))",
              }}
              loading="lazy"
              decoding="async"
            />

            <div
              className="mt-5 text-[12px] leading-[1.05] tracking-tight text-center select-none space-y-0.5"
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

        {/* Bottle — fills remaining width up to --header-media-max */}
        <div className="min-w-0 justify-self-end">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={headerImageUrl}
            alt=""
            className="block rounded-2xl"
            style={{
              width: "100%",
              maxWidth: "var(--header-media-max, 600px)",
              height: "auto",
            }}
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>

      {/* Mobile: stack badge + bottle */}
      <div className="mt-6 md:hidden flex flex-col items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/WSNI.png"
          alt="Product score indicator"
          width={180}
          height={180}
          className="w-[180px] h-auto"
          loading="lazy"
          decoding="async"
        />
        <div className="text-[13px] leading-snug font-medium text-amber-700 dark:text-amber-300/90 tracking-tight text-center select-none -mt-2">
          🏅 Trusted Classic
        </div>
        <div className="opacity-80">🍫 Honest&nbsp;Indulgence</div>
        <div className="opacity-75 text-emerald-600 dark:text-emerald-300 font-medium">
          🌿 Modern Nourishment
        </div>
        <div className="opacity-75">🥛 Whole Dairy, Honestly Made</div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={headerImageUrl}
          alt=""
          width={560}
          height={200}
          className="block rounded-2xl object-contain"
          style={{
            width: "100%",
            height: "auto",
            maxWidth: "min(560px, var(--header-media-max, 600px))",
          }}
          loading="lazy"
          decoding="async"
        />
      </div>
    </>
  );
}
