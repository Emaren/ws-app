// src/components/article/AdFullWidth.tsx

type Tone = "neutral" | "zinc" | "slate" | "stone" | "amber" | "indigo";

function toneClasses(tone: Tone) {
  switch (tone) {
    case "zinc":
      return {
        bg: "bg-zinc-50 dark:bg-zinc-900",
        border: "border-zinc-200 dark:border-zinc-800",
        text: "text-zinc-600 dark:text-zinc-300",
      };
    case "slate":
      return {
        bg: "bg-slate-50 dark:bg-slate-900",
        border: "border-slate-200 dark:border-slate-800",
        text: "text-slate-600 dark:text-slate-300",
      };
    case "stone":
      return {
        bg: "bg-stone-50 dark:bg-stone-900",
        border: "border-stone-200 dark:border-stone-800",
        text: "text-stone-600 dark:text-stone-300",
      };
    case "amber":
      return {
        bg: "bg-amber-50 dark:bg-stone-900",
        border: "border-amber-100 dark:border-stone-800",
        text: "text-amber-700 dark:text-stone-200",
      };
    case "indigo":
      return {
        bg: "bg-indigo-50 dark:bg-zinc-900",
        border: "border-indigo-100 dark:border-zinc-800",
        text: "text-indigo-700 dark:text-zinc-200",
      };
    case "neutral":
    default:
      return {
        bg: "bg-neutral-900",
        border: "border-neutral-800",
        text: "text-neutral-300",
      };
  }
}

export default function AdFullWidth({
  label = "TokenTap.ca",
  tone = "neutral",
  height = 256, // visual cap (we keep your sizing)
}: {
  label?: string;
  tone?: Tone;
  height?: number;
}) {
  const toneCls = toneClasses(tone);
  const [imgError, setImgError] = useState(false);

  return (
    // Full-width rail with safe-area gutters; keep your existing top margins
    <div className="w-full mt-12 md:mt-16 lg:mt-20 px-[max(env(safe-area-inset-left),0px)] pr-[max(env(safe-area-inset-right),0px)]">
      <a
        href="https://tokentap.ca"
        target="_blank"
        rel="noopener noreferrer external"
        aria-label={`Visit ${label}`}
        className={[
          "w-full rounded-2xl border block overflow-hidden",
          toneCls.bg,
          toneCls.border,
          "focus:outline-none focus:ring-0 active:outline-none active:ring-0",
          "flex items-center justify-center",
        ].join(" ")}
        // Fixed height as before (don’t change layout), but allow the box to shrink
        // slightly on very small screens so it never overwhelms the viewport.
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
            className="object-contain outline-none pointer-events-none select-none"
            style={{
              // Keep your original visual ratio (about 46% of container height)
              height: `${Math.round(height * 0.46)}px`,
              width: "auto",
              maxWidth: "95%",
            }}
            onError={() => setImgError(true)}
            draggable={false}
          />
        ) : (
          // Graceful fallback if the image 404s
          <span className={["text-lg font-semibold", toneCls.text].join(" ")}>
            {label}
          </span>
        )}
      </a>
    </div>
  );
}

import { useState } from "react";
