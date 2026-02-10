// src/components/article/BigThumbs.tsx
"use client";

import React from "react";

type Props = { slug: string };
type ReactionType = "like" | "hmm";

function getReactionStorageKey(slug: string): string {
  return `ws:article-reaction:${slug}`;
}

export default function BigThumbs({ slug }: Props) {
  const [busy, setBusy] = React.useState<ReactionType | null>(null);
  const [selected, setSelected] = React.useState<ReactionType | null>(null);
  const [animating, setAnimating] = React.useState<ReactionType | null>(null);

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(getReactionStorageKey(slug));
      if (stored === "like" || stored === "hmm") {
        setSelected(stored);
      } else {
        setSelected(null);
      }
    } catch {
      setSelected(null);
    }
  }, [slug]);

  React.useEffect(() => {
    if (!animating) {
      return;
    }

    const timer = window.setTimeout(() => {
      setAnimating(null);
    }, 320);

    return () => {
      window.clearTimeout(timer);
    };
  }, [animating]);

  async function react(type: ReactionType) {
    if (busy) return;
    const previous = selected;
    setSelected(type);
    setAnimating(type);
    setBusy(type);
    try {
      const response = await fetch(`/api/articles/${encodeURIComponent(slug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "react", type }),
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`reaction request failed (${response.status})`);
      }

      try {
        window.localStorage.setItem(getReactionStorageKey(slug), type);
      } catch {}
    } catch (error) {
      setSelected(previous);
      try {
        if (previous) {
          window.localStorage.setItem(getReactionStorageKey(slug), previous);
        } else {
          window.localStorage.removeItem(getReactionStorageKey(slug));
        }
      } catch {}
      console.warn("Reaction update failed", error);
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
          aria-pressed={selected === "like"}
          title="I like this"
          className={`${base} thumb thumb--like cursor-pointer ${
            selected === "like" ? "thumb--selected" : ""
          } ${animating === "like" ? "thumb--pulse" : ""}`}
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
              fill={selected === "like" ? "currentColor" : "none"}
              fillOpacity={selected === "like" ? 0.22 : 0}
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
          aria-pressed={selected === "hmm"}
          title="Not for me"
          className={`${base} thumb thumb--boo mt-[6px] cursor-pointer ${
            selected === "hmm" ? "thumb--selected" : ""
          } ${animating === "hmm" ? "thumb--pulse" : ""}`}
          onClick={() => react("hmm")}
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
              fill={selected === "hmm" ? "currentColor" : "none"}
              fillOpacity={selected === "hmm" ? 0.2 : 0}
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
        @keyframes thumb-pop {
          0% {
            transform: scale(1);
          }
          45% {
            transform: scale(1.14);
          }
          100% {
            transform: scale(1.06);
          }
        }

        @keyframes halo-pulse {
          0% {
            opacity: 0.25;
            transform: scale(0.9);
          }
          60% {
            opacity: 1;
            transform: scale(1.06);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

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
        .thumb--like.thumb--selected .icon,
        .thumb--like:hover .icon,
        .thumb--like:focus-visible .icon {
          transform: scale(1.06);
          color: #6ee7b7; /* emerald-300 */
          filter: drop-shadow(0 0 22px rgba(16, 185, 129, 0.72));
        }
        .thumb--like.thumb--selected .halo,
        .thumb--like:hover .halo,
        .thumb--like:focus-visible .halo {
          opacity: 1;
          box-shadow: 0 0 36px 12px rgba(16, 185, 129, 0.4);
        }
        .thumb--like.thumb--selected .tint,
        .thumb--like:hover .tint,
        .thumb--like:focus-visible .tint {
          background: rgba(16, 185, 129, 0.12);
        }

        /* Boo state */
        .thumb--boo.thumb--selected .icon,
        .thumb--boo:hover .icon,
        .thumb--boo:focus-visible .icon {
          transform: scale(1.06);
          color: #fda4af; /* rose-300 */
          filter: drop-shadow(0 0 22px rgba(244, 63, 94, 0.72));
        }
        .thumb--boo.thumb--selected .halo,
        .thumb--boo:hover .halo,
        .thumb--boo:focus-visible .halo {
          opacity: 1;
          box-shadow: 0 0 36px 12px rgba(244, 63, 94, 0.38);
        }
        .thumb--boo.thumb--selected .tint,
        .thumb--boo:hover .tint,
        .thumb--boo:focus-visible .tint {
          background: rgba(244, 63, 94, 0.1);
        }

        .thumb--pulse .icon {
          animation: thumb-pop 320ms cubic-bezier(0.2, 0.7, 0.2, 1) forwards;
        }
        .thumb--pulse .halo {
          animation: halo-pulse 320ms ease-out forwards;
        }

        @media (prefers-reduced-motion: reduce) {
          .thumb,
          .thumb .icon,
          .thumb .halo,
          .thumb .tint {
            transition: none;
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}
