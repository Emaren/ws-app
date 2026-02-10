// src/components/article/AdFullWidth.tsx
"use client";

import { useState } from "react";

type Tone = "neutral" | "zinc" | "slate" | "stone" | "amber" | "indigo";

function toneClasses(tone: Tone) {
  switch (tone) {
    case "zinc":   return { bg: "bg-zinc-50 dark:bg-zinc-900",   border: "border-zinc-200 dark:border-zinc-800",   text: "text-zinc-600 dark:text-zinc-300" };
    case "slate":  return { bg: "bg-slate-50 dark:bg-slate-900", border: "border-slate-200 dark:border-slate-800", text: "text-slate-600 dark:text-slate-300" };
    case "stone":  return { bg: "bg-stone-50 dark:bg-stone-900", border: "border-stone-200 dark:border-stone-800", text: "text-stone-600 dark:text-stone-300" };
    case "amber":  return { bg: "bg-amber-50 dark:bg-stone-900", border: "border-amber-100 dark:border-stone-800", text: "text-amber-700 dark:text-stone-200" };
    case "indigo": return { bg: "bg-indigo-50 dark:bg-zinc-900", border: "border-indigo-100 dark:border-zinc-800", text: "text-indigo-700 dark:text-zinc-200" };
    default:       return { bg: "bg-neutral-900", border: "border-neutral-800", text: "text-neutral-300" };
  }
}

export default function AdFullWidth({
  label = "TokenTap.ca",
  tone = "neutral",
  height = 256,
}: {
  label?: string;
  tone?: Tone;
  height?: number;
}) {
  const toneCls = toneClasses(tone);
  const [imgError, setImgError] = useState(false);

  return (
    <div className="bleed my-[var(--section-gap-sm)]">
      <a
        href="https://tokentap.ca"
        target="_blank"
        rel="noopener noreferrer external"
        aria-label={`Visit ${label}`}
        className={[
          "block w-full rounded-2xl border overflow-hidden",
          toneCls.bg,
          toneCls.border,
          "focus:outline-none focus:ring-0 active:outline-none active:ring-0",
          "flex items-center justify-center",
        ].join(" ")}
        style={{ height: `max(180px, ${height}px)` }}
      >
        <div className="relative w-full h-full">
          {!imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/tttr.png"
              alt={label}
              loading="lazy"
              decoding="async"
              sizes="100vw"
              className="block w-full h-full object-contain select-none pointer-events-none p-3 md:p-5"
              onError={() => setImgError(true)}
              draggable={false}
            />
          ) : (
            <span className={["absolute inset-0 grid place-items-center text-lg font-semibold", toneCls.text].join(" ")}>
              {label}
            </span>
          )}

          <div className="absolute inset-x-3 top-3 md:inset-x-5 md:top-4 flex items-center justify-between pointer-events-none">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-black/60 text-amber-300 border border-amber-400/30">
              Local Partner
            </span>
            <span className="hidden sm:inline text-xs text-neutral-300">Trade smarter in 30 seconds</span>
          </div>

          <div className="absolute inset-x-3 bottom-3 md:inset-x-5 md:bottom-4 flex justify-end pointer-events-none">
            <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-400 text-black">
              Visit TokenTap.ca
            </span>
          </div>
        </div>
      </a>
    </div>
  );
}
