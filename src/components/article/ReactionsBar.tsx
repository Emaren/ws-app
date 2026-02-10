// src/components/article/ReactionsBar.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  slug: string;
  likeCount: number;
  wowCount: number;
  hmmCount: number;
};

type ArticleReactionType = "LIKE" | "WOW" | "HMM";

type Counts = {
  like: number;
  wow: number;
  hmm: number;
};

type ApiResponse = {
  counts?: Partial<Counts>;
  selected?: "like" | "wow" | "hmm" | null;
};

function toClientType(type: ArticleReactionType): "like" | "wow" | "hmm" {
  if (type === "LIKE") return "like";
  if (type === "WOW") return "wow";
  return "hmm";
}

function updateCounts(
  current: Counts,
  previous: ArticleReactionType | null,
  next: ArticleReactionType,
): Counts {
  const updated = { ...current };

  if (previous === "LIKE") updated.like = Math.max(0, updated.like - 1);
  if (previous === "WOW") updated.wow = Math.max(0, updated.wow - 1);
  if (previous === "HMM") updated.hmm = Math.max(0, updated.hmm - 1);

  if (next === "LIKE") updated.like += 1;
  if (next === "WOW") updated.wow += 1;
  if (next === "HMM") updated.hmm += 1;

  return updated;
}

export default function ReactionsBar({ slug, likeCount, wowCount, hmmCount }: Props) {
  const [counts, setCounts] = useState<Counts>({ like: likeCount, wow: wowCount, hmm: hmmCount });
  const [selected, setSelected] = useState<ArticleReactionType | null>(null);
  const [animating, setAnimating] = useState<ArticleReactionType | null>(null);
  const [sending, setSending] = useState(false);

  const endpoint = useMemo(
    () => `/api/articles/${encodeURIComponent(slug)}/reactions?scope=article`,
    [slug],
  );

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch(endpoint, { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as ApiResponse;
        if (!active) return;

        setCounts({
          like: Math.max(0, Number(data.counts?.like ?? likeCount)),
          wow: Math.max(0, Number(data.counts?.wow ?? wowCount)),
          hmm: Math.max(0, Number(data.counts?.hmm ?? hmmCount)),
        });

        if (data.selected === "like") setSelected("LIKE");
        else if (data.selected === "wow") setSelected("WOW");
        else if (data.selected === "hmm") setSelected("HMM");
        else setSelected(null);
      } catch {
        // Keep server-rendered counts if hydration sync fails.
      }
    })();

    return () => {
      active = false;
    };
  }, [endpoint, likeCount, wowCount, hmmCount]);

  useEffect(() => {
    if (!animating) return;
    const timer = window.setTimeout(() => setAnimating(null), 260);
    return () => window.clearTimeout(timer);
  }, [animating]);

  async function react(type: ArticleReactionType) {
    if (sending) return;

    setAnimating(type);
    if (selected === type) {
      return;
    }

    const previousSelected = selected;
    const previousCounts = counts;

    setSelected(type);
    setCounts(updateCounts(previousCounts, previousSelected, type));
    setSending(true);

    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
        cache: "no-store",
        keepalive: true,
      });

      if (res.status === 401) {
        throw new Error("Sign in required to react");
      }

      if (!res.ok) {
        throw new Error(`Reaction update failed (${res.status})`);
      }

      const data = (await res.json()) as ApiResponse;
      setCounts({
        like: Math.max(0, Number(data.counts?.like ?? 0)),
        wow: Math.max(0, Number(data.counts?.wow ?? 0)),
        hmm: Math.max(0, Number(data.counts?.hmm ?? 0)),
      });

      if (data.selected === "like") setSelected("LIKE");
      else if (data.selected === "wow") setSelected("WOW");
      else if (data.selected === "hmm") setSelected("HMM");
      else setSelected(type);
    } catch (error) {
      setSelected(previousSelected);
      setCounts(previousCounts);
      if (error instanceof Error && error.message.includes("Sign in required")) {
        alert("Please sign in to react.");
      } else {
        alert("Network error — could not register reaction.");
      }
    } finally {
      setSending(false);
    }
  }

  const buttonClass =
    "reaction-btn inline-flex items-center gap-2 border-0 bg-transparent px-2 py-2 " +
    "cursor-pointer select-none focus:outline-none disabled:opacity-50";

  const countClass = "tabular-nums text-lg md:text-xl font-medium";

  return (
    <div className="w-full flex justify-center">
      <div className="inline-flex items-center gap-12 sm:gap-16 md:gap-20">
        <button
          type="button"
          className={`${buttonClass} ${selected === "LIKE" ? "is-selected" : ""} ${animating === "LIKE" ? "is-popping" : ""}`}
          onClick={() => react("LIKE")}
          disabled={sending}
          aria-pressed={selected === "LIKE"}
          title="Like"
        >
          <span role="img" aria-label="Like" className="reaction-emoji">👍</span>
          <span className={countClass} aria-live="polite">{counts.like}</span>
        </button>

        <button
          type="button"
          className={`${buttonClass} ${selected === "WOW" ? "is-selected" : ""} ${animating === "WOW" ? "is-popping" : ""}`}
          onClick={() => react("WOW")}
          disabled={sending}
          aria-pressed={selected === "WOW"}
          title="Wow"
        >
          <span role="img" aria-label="Wow" className="reaction-emoji">😮</span>
          <span className={countClass} aria-live="polite">{counts.wow}</span>
        </button>

        <button
          type="button"
          className={`${buttonClass} ${selected === "HMM" ? "is-selected" : ""} ${animating === "HMM" ? "is-popping" : ""}`}
          onClick={() => react("HMM")}
          disabled={sending}
          aria-pressed={selected === "HMM"}
          title="Hmm"
        >
          <span role="img" aria-label="Hmm" className="reaction-emoji">🤔</span>
          <span className={countClass} aria-live="polite">{counts.hmm}</span>
        </button>
      </div>

      <style jsx>{`
        @keyframes reaction-pop {
          0% { transform: scale(1); }
          55% { transform: scale(1.18); }
          100% { transform: scale(1); }
        }

        :global(.reaction-btn) {
          transition: transform 160ms ease, filter 160ms ease;
        }

        :global(.reaction-btn .reaction-emoji) {
          font-size: 2rem;
          line-height: 1;
          transition: transform 160ms ease, filter 160ms ease;
        }

        :global(.reaction-btn:hover .reaction-emoji),
        :global(.reaction-btn:focus-visible .reaction-emoji),
        :global(.reaction-btn.is-selected .reaction-emoji) {
          transform: scale(1.08);
          filter: drop-shadow(0 0 12px rgba(250, 204, 21, 0.6));
        }

        :global(.reaction-btn.is-popping .reaction-emoji) {
          animation: reaction-pop 260ms cubic-bezier(0.2, 0.7, 0.2, 1);
        }

        @media (prefers-reduced-motion: reduce) {
          :global(.reaction-btn),
          :global(.reaction-btn .reaction-emoji) {
            transition: none;
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
