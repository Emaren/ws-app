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
  next: ProductReactionType | null,
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
    const timer = window.setTimeout(() => setAnimating(null), 460);
    return () => window.clearTimeout(timer);
  }, [animating]);

  async function react(type: ProductReactionType) {
    if (busy) return;
    setAnimating(type);

    const previousSelection = selected;
    const previousCounts = counts;
    const nextSelection = selected === type ? null : type;
    setSelected(nextSelection);
    setCounts(updateProductCounts(previousCounts, previousSelection, nextSelection));
    setBusy(true);

    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: type.toUpperCase() }),
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`reaction request failed (${response.status})`);
      }

      const data = (await response.json()) as ProductReactionResponse;
      setCounts({
        like: Math.max(0, Number(data.counts?.like ?? 0)),
        hmm: Math.max(0, Number(data.counts?.hmm ?? 0)),
      });
      setSelected(data.selected === "like" || data.selected === "hmm" ? data.selected : null);
      window.dispatchEvent(new Event("ws-refresh-token-balances"));
    } catch (error) {
      setSelected(previousSelection);
      setCounts(previousCounts);
      console.warn("Product reaction update failed", error);
      alert("Could not register reaction right now. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="ws-container mx-auto w-full mt-4 md:mt-5 mb-1 md:mb-1">
      <div className="thumbs-wrap" role="group" aria-label="Product reactions">
        {selected === "like" ? (
          <button
            type="button"
            aria-label="Thumbs up"
            aria-pressed="true"
            title="I like this"
            className={`thumb-vote thumb-vote-like is-selected ${animating === "like" ? "is-popping" : ""}`}
            onClick={() => react("like")}
            disabled={busy}
          >
            <span className="thumb-shell" aria-hidden="true">
              <span className="thumb-halo" />
              <span className="thumb-burst" />
              <ThumbIcon active />
            </span>
            <span className="thumb-count" data-count={counts.like} aria-live="polite">{counts.like}</span>
          </button>
        ) : (
          <button
            type="button"
            aria-label="Thumbs up"
            aria-pressed="false"
            title="I like this"
            className={`thumb-vote thumb-vote-like ${animating === "like" ? "is-popping" : ""}`}
            onClick={() => react("like")}
            disabled={busy}
          >
            <span className="thumb-shell" aria-hidden="true">
              <span className="thumb-halo" />
              <span className="thumb-burst" />
              <ThumbIcon active={false} />
            </span>
            <span className="thumb-count" data-count={counts.like} aria-live="polite">{counts.like}</span>
          </button>
        )}

        {selected === "hmm" ? (
          <button
            type="button"
            aria-label="Thumbs down"
            aria-pressed="true"
            title="Not for me"
            className={`thumb-vote thumb-vote-hmm is-selected ${animating === "hmm" ? "is-popping" : ""}`}
            onClick={() => react("hmm")}
            disabled={busy}
          >
            <span className="thumb-shell" aria-hidden="true">
              <span className="thumb-halo" />
              <span className="thumb-burst" />
              <ThumbIcon down active />
            </span>
            <span className="thumb-count" data-count={counts.hmm} aria-live="polite">{counts.hmm}</span>
          </button>
        ) : (
          <button
            type="button"
            aria-label="Thumbs down"
            aria-pressed="false"
            title="Not for me"
            className={`thumb-vote thumb-vote-hmm ${animating === "hmm" ? "is-popping" : ""}`}
            onClick={() => react("hmm")}
            disabled={busy}
          >
            <span className="thumb-shell" aria-hidden="true">
              <span className="thumb-halo" />
              <span className="thumb-burst" />
              <ThumbIcon down active={false} />
            </span>
            <span className="thumb-count" data-count={counts.hmm} aria-live="polite">{counts.hmm}</span>
          </button>
        )}
      </div>

      <style jsx>{`
        @keyframes vote-pop {
          0% { transform: scale(1) rotate(0deg); }
          36% { transform: scale(1.22) rotate(-7deg); }
          72% { transform: scale(0.95) rotate(4deg); }
          100% { transform: scale(1) rotate(0deg); }
        }

        @keyframes halo-pulse {
          0% { transform: scale(0.78); opacity: 0.2; }
          35% { transform: scale(1.08); opacity: 0.6; }
          100% { transform: scale(1.22); opacity: 0; }
        }

        @keyframes burst-ring {
          0% { transform: scale(0.55); opacity: 0; }
          25% { transform: scale(0.85); opacity: 0.85; }
          100% { transform: scale(1.9); opacity: 0; }
        }

        @keyframes count-bump {
          0% { transform: translateY(0) scale(1); }
          40% { transform: translateY(-4px) scale(1.2); }
          100% { transform: translateY(0) scale(1); }
        }

        .thumbs-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: clamp(2rem, 8vw, 7rem);
          padding-block: clamp(2px, 0.35vw, 5px);
        }

        .thumb-vote {
          --vote-main: #94a3b8;
          --vote-soft: #d7dfe8;
          --vote-glow: rgba(148, 163, 184, 0.28);
          --vote-chip: rgba(17, 24, 39, 0.35);
          --vote-chip-border: rgba(148, 163, 184, 0.35);
          border: 0;
          background: transparent;
          border-radius: 0;
          padding: 0;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          color: var(--vote-main);
          transition:
            color 180ms ease,
            filter 220ms ease,
            transform 200ms ease,
            background-color 180ms ease;
          position: relative;
        }

        .thumb-vote:disabled {
          cursor: default;
          opacity: 0.64;
        }

        .thumb-shell {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .thumb-halo {
          position: absolute;
          inset: 9px;
          border-radius: 999px;
          background: radial-gradient(circle at 45% 35%, color-mix(in oklab, var(--vote-main) 78%, #fff) 0%, var(--vote-main) 38%, transparent 72%);
          opacity: 0;
          pointer-events: none;
          z-index: 0;
          transform: scale(0.9);
          filter: blur(0.5px);
        }

        .thumb-burst {
          position: absolute;
          width: 62px;
          height: 62px;
          border-radius: 999px;
          border: 2px solid color-mix(in oklab, var(--vote-main) 92%, #fff);
          opacity: 0;
          pointer-events: none;
          z-index: 0;
        }

        .thumb-vote :global(.thumb-icon) {
          transition:
            color 160ms ease,
            filter 220ms ease,
            transform 180ms ease;
          transform-origin: center;
          position: relative;
          z-index: 1;
        }

        .thumb-vote-like {
          --vote-main: #086000;
          --vote-soft: #b8e6cf;
          --vote-glow: rgba(17, 0, 78, 0.42);
          --vote-chip: rgba(15, 36, 16, 0.44);
          --vote-chip-border: rgba(47, 125, 89, 0.3);
        }

        .thumb-vote-hmm {
          --vote-main: #78000a;
          --vote-soft: #f6bec2;
          --vote-glow: rgba(140, 1, 13, 0.43);
          --vote-chip: rgba(42, 16, 19, 0.44);
          --vote-chip-border: rgba(136, 0, 11, 0.32);
        }

        .thumb-vote-like:hover,
        .thumb-vote-like:focus-visible,
        .thumb-vote-like.is-selected,
        .thumb-vote-hmm:hover,
        .thumb-vote-hmm:focus-visible,
        .thumb-vote-hmm.is-selected {
          color: var(--vote-main);
          filter: drop-shadow(0 0 20px var(--vote-glow));
          transform: translateY(-1px);
        }

        .thumb-vote.is-selected :global(.thumb-icon),
        .thumb-vote:hover :global(.thumb-icon),
        .thumb-vote:focus-visible :global(.thumb-icon) {
          transform: scale(1.08);
        }

        .thumb-vote.is-popping :global(.thumb-icon) {
          animation: vote-pop 460ms cubic-bezier(0.2, 0.74, 0.2, 1);
        }

        .thumb-vote.is-popping .thumb-halo {
          animation: halo-pulse 420ms cubic-bezier(0.2, 0.74, 0.2, 1);
        }

        .thumb-vote.is-popping .thumb-burst {
          animation: burst-ring 420ms cubic-bezier(0.18, 0.72, 0.21, 1);
        }

        .thumb-count {
          position: relative;
          z-index: 0;
          display: inline-block;
          min-width: 1.5rem;
          font-size: clamp(1.1rem, 2vw, 1.35rem);
          font-weight: 700;
          line-height: 1;
          text-align: left;
          font-variant-numeric: tabular-nums;
          color: color-mix(in oklab, var(--vote-main) 84%, #fff);
          transform-origin: center;
          background: transparent;
          border: 0;
          border-radius: 0;
          padding: 0;
          box-shadow: none;
        }

        .thumb-count::after {
          content: attr(data-count);
          position: absolute;
          inset: 0;
          z-index: -1;
          color: color-mix(in oklab, var(--vote-main) 34%, transparent);
          opacity: 0.34;
          transform: translate(0.32rem, 0.48rem) scaleY(0.28) scaleX(1.08);
          transform-origin: 50% 100%;
          filter: blur(6px);
          pointer-events: none;
        }

        .thumb-vote.is-popping .thumb-count {
          animation: count-bump 360ms cubic-bezier(0.2, 0.74, 0.2, 1);
        }

        @media (max-width: 640px) {
          .thumb-vote :global(.thumb-icon) {
            width: 56px;
            height: 56px;
          }
          .thumb-burst {
            width: 56px;
            height: 56px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .thumb-vote,
          .thumb-vote :global(.thumb-icon),
          .thumb-halo,
          .thumb-burst,
          .thumb-count {
            transition: none;
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}
