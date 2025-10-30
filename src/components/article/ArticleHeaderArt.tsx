// src/components/article/ArticleHeaderArt.tsx
"use client";

/* eslint-disable @next/next/no-img-element */
import React from "react";

function extractFirstImageSrc(html: string | null | undefined): string | null {
  if (!html) return null;
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

type Props = {
  title?: string | null;
  slug?: string | null;
  coverUrl?: string | null;
  headerImageUrl?: string | null;
  contentHtml?: string | null;
};

export default function ArticleHeaderArt({
  title,
  slug,
  coverUrl,
  headerImageUrl: explicitHeader,
  contentHtml,
}: Props) {
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
    <section className="mt-4 md:mt-6 w-full overflow-hidden">
      {/* ===== md+ : badge + bottle ===== */}
      <div
        className="hidden md:grid w-full items-start gap-6 overflow-hidden"
        style={{ gridTemplateColumns: "220px minmax(0,1fr)" }}
      >
        {/* Badge + lines (no bullets) */}
        <div className="flex items-start justify-center overflow-hidden">
          <div className="flex flex-col items-center justify-end h-full overflow-hidden">
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
                display: "block",
              }}
              loading="lazy"
              decoding="async"
              draggable={false}
            />

            <ul className="mt-4 list-none p-0 m-0 text-[12px] leading-[1.1] tracking-tight text-center select-none space-y-1">
              <li className="opacity-80">🏅 Trusted Classic</li>
              <li className="opacity-75 text-emerald-600 dark:text-emerald-300 font-medium">
                🍫 Honest&nbsp;Indulgence
              </li>
              <li className="opacity-75">🌿 Modern Nourishment</li>
              <li className="opacity-75">🥛 Whole Dairy, Honestly Made</li>
            </ul>
          </div>
        </div>

        {/* Bottle (desktop) */}
        <div className="min-w-0 justify-self-end overflow-hidden">
          <img
            src={headerImageUrl}
            alt=""
            className="block rounded-2xl"
            style={{
              inlineSize: "min(100%, 420px)",
              maxInlineSize: "100%",
              blockSize: "auto",
              display: "block",
            }}
            loading="lazy"
            decoding="async"
            sizes="(min-width: 768px) 420px, 92vw"
            draggable={false}
          />
        </div>
      </div>

      {/* ===== Mobile: WSNI + bottle, then 2×2 legend ===== */}
      <div className="md:hidden w-full overflow-hidden">
        {/* row: wsni | bottle */}
        <div
          className="grid items-start gap-3 overflow-hidden"
          style={{ gridTemplateColumns: "116px minmax(0,1fr)" }}
        >
          <img
            src="/WSNI.png"
            alt="Product score indicator"
            width={116}
            height={116}
            className="block w-[116px] h-auto"
            loading="lazy"
            decoding="async"
            draggable={false}
          />

          <div className="min-w-0 overflow-hidden">
            <img
              src={headerImageUrl}
              alt=""
              className="block rounded-2xl mx-auto"
              style={{
                inlineSize: "min(100%, 220px)", // hard cap small on phones
                maxInlineSize: "100%",
                blockSize: "auto",
                display: "block",
              }}
              loading="eager"
              decoding="async"
              draggable={false}
            />
          </div>
        </div>

        {/* 2×2 points under the row */}
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[13px] leading-snug tracking-tight text-center select-none">
          <div className="opacity-90">🏅 Trusted Classic</div>
          <div className="opacity-90">🍫 Honest&nbsp;Indulgence</div>
          <div className="opacity-90">🌿 Modern Nourishment</div>
          <div className="opacity-90">🥛 Whole Dairy, Honestly Made</div>
        </div>
      </div>
    </section>
  );
}
