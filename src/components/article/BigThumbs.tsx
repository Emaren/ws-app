// src/components/article/BigThumbs.tsx
"use client";

import React from "react";

type Props = { slug: string };
type ProductReactionType = "like" | "hmm";
type ProductReactionCounts = { like: number; hmm: number };

type ProductReactionResponse = {
  counts?: Partial<ProductReactionCounts>;
  selected?: ProductReactionType | null;
};

function updateProductCounts(
  current: ProductReactionCounts,
  previous: ProductReactionType | null,
  next: ProductReactionType,
): ProductReactionCounts {
  const updated = { ...current };
  if (previous === "like") {
    updated.like = Math.max(0, updated.like - 1);
  }
  if (previous === "hmm") {
    updated.hmm = Math.max(0, updated.hmm - 1);
  }
  if (next === "like") {
    updated.like += 1;
  }
  if (next === "hmm") {
    updated.hmm += 1;
  }
  return updated;
}

function ThumbIcon({ down, active }: { down?: boolean; active: boolean }) {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 24 24"
      role="img"
      aria-hidden="true"
      className="thumb-icon"
    >
      <path
        d={
          down
            ? "M7 2H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2V2Z M22 14a2 2 0 0 1-2 2h-5.28a1 1 0 0 0-.95.68l-.57 1.71A3 3 0 0 1 10.35 21L9 16V5h8.35a2 2 0 0 1 1.94 1.52l1.13 5.09c.04.17.06.35.06.53V14Z"
            : "M7 22H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h2v11Z M22 10a2 2 0 0 0-2-2h-5.28a1 1 0 0 1-.95-.68l-.57-1.71A3 3 0 0 0 10.35 3L9 8v11h8.35a2 2 0 0 0 1.94-1.52l1.13-5.09c.04-.17.06-.35.06-.53V10Z"
        }
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? 0.26 : 0}
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function BigThumbs({ slug }: Props) {
  const [busy, setBusy] = React.useState(false);
  const [selected, setSelected] = React.useState<ProductReactionType | null>(null);
  const [animating, setAnimating] = React.useState<ProductReactionType | null>(null);
  const [counts, setCounts] = React.useState<ProductReactionCounts>({ like: 0, hmm: 0 });

  const endpoint = React.useMemo(
    () => `/api/articles/${encodeURIComponent(slug)}/reactions?scope=product`,
    [slug],
  );

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch(endpoint, { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as ProductReactionResponse;
        if (!active) return;
        setCounts({
          like: Math.max(0, Number(data.counts?.like ?? 0)),
          hmm: Math.max(0, Number(data.counts?.hmm ?? 0)),
        });
        setSelected(data.selected === "like" || data.selected === "hmm" ? data.selected : null);
      } catch {
        // Keep zeroed defaults if hydration fetch fails.
      }
    })();

    return () => {
      active = false;
    };
  }, [endpoint]);

  React.useEffect(() => {
    if (!animating) {
      return;
    }
    const timer = window.setTimeout(() => setAnimating(null), 280);
    return () => window.clearTimeout(timer);
  }, [animating]);

  async function react(type: ProductReactionType) {
    if (busy) return;
    setAnimating(type);
    if (selected === type) return;

    const previousSelection = selected;
    const previousCounts = counts;
    setSelected(type);
    setCounts(updateProductCounts(previousCounts, previousSelection, type));
    setBusy(true);

    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: type.toUpperCase() }),
        cache: "no-store",
      });

      if (response.status === 401) {
        throw new Error("Sign in required to react");
      }
      if (!response.ok) {
        throw new Error(`reaction request failed (${response.status})`);
      }

      const data = (await response.json()) as ProductReactionResponse;
      setCounts({
        like: Math.max(0, Number(data.counts?.like ?? 0)),
        hmm: Math.max(0, Number(data.counts?.hmm ?? 0)),
      });
      setSelected(data.selected === "like" || data.selected === "hmm" ? data.selected : type);
    } catch (error) {
      setSelected(previousSelection);
      setCounts(previousCounts);
      if (error instanceof Error && error.message.includes("Sign in required")) {
        alert("Please sign in to react.");
      } else {
        console.warn("Product reaction update failed", error);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="ws-container mx-auto w-full mt-3 md:mt-4 mb-0 md:mb-0">
      <div className="thumbs-wrap" role="group" aria-label="Product reactions">
        <button
          type="button"
          aria-label="Thumbs up"
          aria-pressed={selected === "like"}
          title="I like this"
          className={`thumb-vote thumb-vote-like ${selected === "like" ? "is-selected" : ""} ${animating === "like" ? "is-popping" : ""}`}
          onClick={() => react("like")}
          disabled={busy}
        >
          <ThumbIcon active={selected === "like"} />
          <span className="thumb-count" aria-live="polite">{counts.like}</span>
        </button>

        <button
          type="button"
          aria-label="Thumbs down"
          aria-pressed={selected === "hmm"}
          title="Not for me"
          className={`thumb-vote thumb-vote-hmm ${selected === "hmm" ? "is-selected" : ""} ${animating === "hmm" ? "is-popping" : ""}`}
          onClick={() => react("hmm")}
          disabled={busy}
        >
          <ThumbIcon down active={selected === "hmm"} />
          <span className="thumb-count" aria-live="polite">{counts.hmm}</span>
        </button>
      </div>

      <style jsx>{`
        @keyframes vote-pop {
          0% { transform: scale(1); }
          55% { transform: scale(1.18); }
          100% { transform: scale(1); }
        }

        .thumbs-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: clamp(2rem, 8vw, 7rem);
        }

        .thumb-vote {
          border: 0;
          background: transparent;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.55rem;
          color: rgba(115, 115, 115, 0.95);
          transition:
            color 140ms ease,
            filter 180ms ease,
            transform 180ms ease;
        }

        .thumb-vote:disabled {
          cursor: default;
          opacity: 0.64;
        }

        .thumb-vote :global(.thumb-icon) {
          transition:
            color 160ms ease,
            filter 180ms ease,
            transform 180ms ease;
          transform-origin: center;
        }

        .thumb-vote-like:hover,
        .thumb-vote-like:focus-visible,
        .thumb-vote-like.is-selected {
          color: #34d399;
          filter: drop-shadow(0 0 14px rgba(16, 185, 129, 0.55));
        }

        .thumb-vote-hmm:hover,
        .thumb-vote-hmm:focus-visible,
        .thumb-vote-hmm.is-selected {
          color: #fb7185;
          filter: drop-shadow(0 0 14px rgba(244, 63, 94, 0.55));
        }

        .thumb-vote.is-selected :global(.thumb-icon),
        .thumb-vote:hover :global(.thumb-icon),
        .thumb-vote:focus-visible :global(.thumb-icon) {
          transform: scale(1.06);
        }

        .thumb-vote.is-popping :global(.thumb-icon) {
          animation: vote-pop 280ms cubic-bezier(0.2, 0.7, 0.2, 1);
        }

        .thumb-count {
          min-width: 1.5rem;
          font-size: clamp(1.1rem, 2vw, 1.35rem);
          font-weight: 700;
          line-height: 1;
          text-align: left;
          font-variant-numeric: tabular-nums;
        }

        @media (max-width: 640px) {
          .thumb-vote :global(.thumb-icon) {
            width: 56px;
            height: 56px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .thumb-vote,
          .thumb-vote :global(.thumb-icon) {
            transition: none;
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}
