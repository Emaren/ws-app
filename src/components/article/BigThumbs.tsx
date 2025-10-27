// src/components/article/BigThumbs.tsx
"use client";

import React from "react";

type Props = { slug: string };

export default function BigThumbs({ slug }: Props) {
  const [busy, setBusy] = React.useState<"like" | "boo" | null>(null);

  async function react(type: "like" | "boo") {
    if (busy) return;
    setBusy(type);
    try {
      await fetch(`/api/articles/${encodeURIComponent(slug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "react", type }),
        cache: "no-store",
      });
    } finally {
      setBusy(null);
    }
  }

  // Base button (transparent)
  const btnBase =
    "inline-flex items-center justify-center rounded-2xl " +
    "transition-colors shadow-sm focus:outline-none " +
    "w-28 h-28 md:w-32 md:h-32 disabled:opacity-60 disabled:pointer-events-none " +
    "bg-transparent hover:bg-transparent active:bg-transparent";

  // Keep only the colored focus ring — no background fills
  const likeBtn = btnBase + " focus-visible:ring-2 focus-visible:ring-emerald-500/40";
  const booBtn  = btnBase + " focus-visible:ring-2 focus-visible:ring-rose-500/40";

  return (
    <section className="ws-container mx-auto w-full mt-12 md:mt-16 mb-6 md:mb-8">
      <div className="flex items-center justify-center gap-16 md:gap-24 xl:gap-32">
        {/* Thumbs Up */}
        <button
          type="button"
          aria-label="Thumbs up"
          className={likeBtn}
          onClick={() => react("like")}
          disabled={!!busy}
          title="I like this"
        >
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            role="img"
            aria-hidden="true"
            className="text-emerald-500 opacity-90 cursor-pointer"
          >
            <path
              d="M7 22H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h2v11Z
                 M22 10a2 2 0 0 0-2-2h-5.28a1 1 0 0 1-.95-.68l-.57-1.71A3 3 0 0 0 10.35 3L9 8v11h8.35a2 2 0 0 0 1.94-1.52l1.13-5.09c.04-.17.06-.35.06-.53V10Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* Thumbs Down */}
        <button
          type="button"
          aria-label="Thumbs down"
          className={`${booBtn} mt-[6px]`}
          onClick={() => react("boo")}
          disabled={!!busy}
          title="Not for me"
        >
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            role="img"
            aria-hidden="true"
            className="text-rose-500 opacity-90 cursor-pointer"
          >
            <path
              d="M7 2H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2V2Z
                 M22 14a2 2 0 0 1-2 2h-5.28a1 1 0 0 0-.95.68l-.57 1.71A3 3 0 0 1 10.35 21L9 16V5h8.35a2 2 0 0 1 1.94 1.52l1.13 5.09c.04.17.06.35.06.53V14Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </section>
  );
}
