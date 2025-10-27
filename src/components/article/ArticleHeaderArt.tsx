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

  // Choose bottle art if any; we *never* early-return so the badge always shows.
  const bottleSrc =
    explicitHeader ||
    (isAvalon ? "/ECAvalon.jpg" : undefined) ||
    contentImg ||
    coverUrl ||
    null;

  // Reader strip cap (fallback keeps it stable even if CSS var isn't present)
  const READER_CAP = "var(--reader-cap, 720px)";

  // Dialed-in, smaller art sizes
  const BADGE_MAX = 170; // down from 220
  const BOTTLE_MAX = 500; // down from 560
  const GUTTER = 18; // down from 24

  return (
    <div className="mt-6">
      <div className="mx-auto px-4 md:px-0" style={{ maxWidth: `min(100%, ${READER_CAP})` }}>
        {/* One markup: stacks on mobile (flex-col), becomes a 5-col grid at md+ */}
        <div
          className="flex flex-col items-center gap-4 md:grid md:items-stretch md:gap-0"
          // When this element turns into a grid at md+, these columns take effect.
          style={{
            gridTemplateColumns: `1fr ${BADGE_MAX}px ${GUTTER}px minmax(0, ${BOTTLE_MAX}px) 1fr`,
          }}
        >
          {/* Badge + legend */}
          <div
            // On mobile this “order-1” keeps badge above bottle; at md+ the grid placement applies.
            className="order-1 flex items-end justify-center md:order-none"
            style={{ gridColumn: 2, transform: "translateX(-8px)" }}
          >
            <div className="flex flex-col items-center justify-end">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/WSNI.png"
                alt="Product score indicator"
                width={BADGE_MAX}
                height={BADGE_MAX}
                style={{
                  width: "100%",
                  height: "auto",
                  maxWidth: BADGE_MAX,
                  filter: "drop-shadow(0 2px 8px rgba(0,0,0,.35))",
                }}
                loading="lazy"
                decoding="async"
              />
              <div
                className="mt-1.5 text-[11px] leading-[1.05] tracking-tight text-center select-none space-y-0.5"
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

          {/* Bottle (or spacer to keep rhythm if missing) */}
          <div
            className="order-2 w-full md:order-none min-w-0 flex justify-center"
            style={{ gridColumn: 4 }}
          >
            <div className="w-full max-w-[500px] translate-x-[6px] flex justify-center">
              {bottleSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={bottleSrc}
                  alt=""
                  width={BOTTLE_MAX}
                  height={180}
                  className="block rounded-2xl object-contain w-auto h-[150px] md:h-[170px]"
                  style={{ maxWidth: BOTTLE_MAX }}
                  sizes="(min-width: 768px) 500px, 92vw"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div style={{ height: 150 }} aria-hidden />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
