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

  const base =
    "relative inline-flex items-center justify-center rounded-2xl " +
    "w-28 h-28 md:w-32 md:h-32 focus:outline-none disabled:opacity-60 " +
    "disabled:pointer-events-none select-none";

  return (
    <section className="ws-container mx-auto w-full mt-3 md:mt-4 mb-0 md:mb-0">
      <div className="flex items-center justify-center gap-16 md:gap-22 xl:gap-30">
        {/* Thumbs Up */}
        <button
          type="button"
          aria-label="Thumbs up"
          title="I like this"
          className={`${base} thumb thumb--like cursor-pointer`}
          onClick={() => react("like")}
          disabled={!!busy}
        >
          {/* halo & tint layers */}
          <span aria-hidden className="halo" />
          <span aria-hidden className="tint" />

          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            role="img"
            aria-hidden="true"
            className="icon text-emerald-500"
          >
            <path
              d="M7 22H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h2v11Z
                 M22 10a2 2 0 0 0-2-2h-5.28a1 1 0 0 1-.95-.68l-.57-1.71A3 3 0 0 0 10.35 3L9 8v11h8.35a2 2 0 0 0 1.94-1.52l1.13-5.09c.04-.17.06-.35.06-.53V10Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* Thumbs Down */}
        <button
          type="button"
          aria-label="Thumbs down"
          title="Not for me"
          className={`${base} thumb thumb--boo mt-[6px] cursor-pointer`}
          onClick={() => react("boo")}
          disabled={!!busy}
        >
          <span aria-hidden className="halo" />
          <span aria-hidden className="tint" />

          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            role="img"
            aria-hidden="true"
            className="icon text-rose-500"
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

      {/* Hover effects via CSS so it works regardless of Tailwind variant generation */}
      <style jsx>{`
        .thumb {
          transition: transform 0.2s ease;
        }
        .thumb:where(:hover, :focus-visible) {
          transform: translateY(-2px);
        }
        .thumb .icon {
          transition: transform 0.2s ease, color 0.2s ease, filter 0.2s ease;
          filter: drop-shadow(0 0 0 rgba(0, 0, 0, 0));
        }
        .thumb:active .icon {
          transform: scale(0.95);
        }

        /* HALO + TINT layers */
        .thumb .halo,
        .thumb .tint {
          position: absolute;
          inset: 0;
          border-radius: 1rem;
          pointer-events: none;
          transition: opacity 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
        }
        .thumb .halo {
          opacity: 0;
        }
        .thumb .tint {
          background: transparent;
        }

        /* Like state */
        .thumb--like:hover .icon,
        .thumb--like:focus-visible .icon {
          transform: scale(1.1);
          color: #34d399; /* emerald-400 */
          filter: drop-shadow(0 0 18px rgba(16, 185, 129, 0.55));
        }
        .thumb--like:hover .halo,
        .thumb--like:focus-visible .halo {
          opacity: 1;
          box-shadow: 0 0 32px 8px rgba(16, 185, 129, 0.25);
        }
        .thumb--like:hover .tint,
        .thumb--like:focus-visible .tint {
          background: rgba(16, 185, 129, 0.05);
        }

        /* Boo state */
        .thumb--boo:hover .icon,
        .thumb--boo:focus-visible .icon {
          transform: scale(1.1);
          color: #fb7185; /* rose-400 */
          filter: drop-shadow(0 0 18px rgba(244, 63, 94, 0.55));
        }
        .thumb--boo:hover .halo,
        .thumb--boo:focus-visible .halo {
          opacity: 1;
          box-shadow: 0 0 32px 8px rgba(244, 63, 94, 0.25);
        }
        .thumb--boo:hover .tint,
        .thumb--boo:focus-visible .tint {
          background: rgba(244, 63, 94, 0.05);
        }
      `}</style>
    </section>
  );
}
