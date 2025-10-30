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
        {!imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/tttr.png"
            alt={label}
            loading="lazy"
            decoding="async"
            sizes="100vw"
            className="block w-full h-auto max-w-none object-contain select-none pointer-events-none"
            style={{ maxHeight: Math.round(height * 0.46) }}
            onError={() => setImgError(true)}
            draggable={false}
          />
        ) : (
          <span className={["text-lg font-semibold", toneCls.text].join(" ")}>{label}</span>
        )}
      </a>
    </div>
  );
}
