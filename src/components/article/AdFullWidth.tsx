// src/components/article/AdFullWidth.tsx
"use client";

import { useState } from "react";

type Tone = "neutral" | "zinc" | "slate" | "stone" | "amber" | "indigo";

type ImageStage = "primary" | "fallback" | "none";

function toneClasses(tone: Tone) {
  switch (tone) {
    case "zinc":
      return {
        border: "border-zinc-200/80 dark:border-zinc-700/60",
        gradient: "from-zinc-100 via-zinc-50 to-zinc-200 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-900",
      };
    case "slate":
      return {
        border: "border-slate-200/80 dark:border-slate-700/60",
        gradient: "from-slate-100 via-slate-50 to-slate-200 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900",
      };
    case "stone":
      return {
        border: "border-stone-200/80 dark:border-stone-700/60",
        gradient: "from-stone-100 via-stone-50 to-stone-200 dark:from-stone-900 dark:via-stone-950 dark:to-stone-900",
      };
    case "amber":
      return {
        border: "border-amber-200/80 dark:border-amber-700/50",
        gradient: "from-amber-100 via-amber-50 to-orange-100 dark:from-stone-950 dark:via-zinc-950 dark:to-stone-900",
      };
    case "indigo":
      return {
        border: "border-indigo-200/80 dark:border-indigo-700/50",
        gradient: "from-indigo-100 via-indigo-50 to-sky-100 dark:from-slate-950 dark:via-zinc-950 dark:to-indigo-950",
      };
    default:
      return {
        border: "border-neutral-700/70",
        gradient: "from-neutral-900 via-neutral-950 to-neutral-900",
      };
  }
}

export default function AdFullWidth({
  label = "TokenTap.ca",
  href = "https://tokentap.ca",
  tone = "amber",
  height = 248,
  imageSrc = "/tttr.png",
  fallbackImageSrc = "/tt.png",
}: {
  label?: string;
  href?: string;
  tone?: Tone;
  height?: number;
  imageSrc?: string;
  fallbackImageSrc?: string;
}) {
  const toneCls = toneClasses(tone);
  const [imageStage, setImageStage] = useState<ImageStage>("primary");
  const [imageReady, setImageReady] = useState(false);

  const activeImageSrc =
    imageStage === "primary"
      ? imageSrc
      : imageStage === "fallback"
        ? fallbackImageSrc
        : null;

  return (
    <section className="bleed my-[var(--section-gap-sm)]" data-ad-slot="slot-3-bottom">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer external"
        aria-label={`Visit ${label}`}
        className={[
          "group relative block w-full overflow-hidden rounded-2xl border",
          toneCls.border,
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50",
        ].join(" ")}
        style={{ minHeight: `max(196px, ${height}px)` }}
      >
        <div
          className={[
            "absolute inset-0 bg-gradient-to-br",
            toneCls.gradient,
          ].join(" ")}
          aria-hidden
        />

        <div className="absolute inset-0 bg-black/10 dark:bg-black/45" aria-hidden />

        <div className="absolute inset-x-3 top-3 z-10 flex items-center justify-between md:inset-x-5 md:top-4">
          <span className="rounded-full border border-amber-400/40 bg-black/60 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-300">
            Local Partner
          </span>
          <span className="hidden text-xs text-neutral-200 sm:inline">Trade smarter in 30 seconds</span>
        </div>

        <div className="absolute inset-x-4 top-[48px] z-10 md:inset-x-6 md:top-[56px]">
          <p className="text-lg font-semibold text-white drop-shadow md:text-xl">{label}</p>
          <p className="mt-1 text-xs text-white/85 md:text-sm">Smart local crypto tools and business growth automation.</p>
        </div>

        <div className="relative z-[2] flex h-full min-h-[196px] items-center justify-center px-3 py-12 md:min-h-[248px] md:px-6 md:py-14">
          {activeImageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={activeImageSrc}
              alt={label}
              loading="lazy"
              decoding="async"
              sizes="100vw"
              className={[
                "block h-full w-full select-none object-contain transition-opacity duration-300",
                imageReady ? "opacity-100" : "opacity-0",
              ].join(" ")}
              onLoad={() => setImageReady(true)}
              onError={() => {
                setImageReady(false);
                setImageStage((previous) => {
                  if (previous === "primary" && fallbackImageSrc) {
                    return "fallback";
                  }
                  return "none";
                });
              }}
              draggable={false}
            />
          ) : (
            <div className="rounded-xl border border-white/20 bg-black/35 px-4 py-3 text-center text-sm font-semibold text-white md:text-base">
              {label}
            </div>
          )}
        </div>

        <div className="absolute inset-x-3 bottom-3 z-10 flex justify-end md:inset-x-5 md:bottom-4">
          <span className="rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-semibold text-black transition group-hover:opacity-90">
            Visit TokenTap.ca
          </span>
        </div>
      </a>
    </section>
  );
}
