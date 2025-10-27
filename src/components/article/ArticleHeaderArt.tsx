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

  // Same visual recipe; full-bleed grid so the art doesn’t get clamped by .ws-container
  return (
    <>
      {/* md+ layout: badge left, bottle right, spanning full width */}
      <div
        className="mt-6 hidden md:grid items-stretch"
        style={{ gridTemplateColumns: "1fr 220px 24px minmax(0,560px) 1fr" }}
      >
        {/* Badge + legend */}
        <div
          className="flex h-full items-end justify-center"
          style={{ gridColumn: 2, transform: "translate(-23px, 3px)" }}
        >
          <div className="flex flex-col items-center justify-end">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/WSNI.png"
              alt="Product score indicator"
              width={220}
              height={220}
              style={{
                width: "100%",
                height: "auto",
                maxWidth: 220,
                filter: "drop-shadow(0 2px 8px rgba(0,0,0,.35))",
              }}
              loading="lazy"
              decoding="async"
            />
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

        {/* Bottle */}
        <div style={{ gridColumn: 4 }} className="min-w-0 flex justify-center">
          <div className="w-full max-w-[560px] translate-x-[10px] flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={headerImageUrl}
              alt=""
              width={560}
              height={200}
              className="block rounded-2xl object-contain w-auto h-[160px] md:h-[180px] lg:h-[200px]"
              loading="lazy"
              decoding="async"
            />
          </div>
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
          style={{ width: "100%", height: "auto", maxWidth: 560, transform: "translateX(10px)" }}
          loading="lazy"
          decoding="async"
        />
      </div>
    </>
  );
}
