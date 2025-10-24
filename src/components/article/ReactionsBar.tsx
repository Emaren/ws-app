// src/components/article/ReactionsBar.tsx
"use client";

import { useState, useTransition } from "react";

type Props = {
  slug: string;
  likeCount: number;
  wowCount: number;
  hmmCount: number;
};

export default function ReactionsBar({ slug, likeCount, wowCount, hmmCount }: Props) {
  const [isPending] = useTransition();
  const [counts, setCounts] = useState({ like: likeCount, wow: wowCount, hmm: hmmCount });
  const [voted, setVoted] = useState<null | "LIKE" | "WOW" | "HMM">(null);

  async function react(type: "LIKE" | "WOW" | "HMM") {
    if (isPending) return;
    if (voted === type) return; // simple client-side guard
    const prev = { ...counts };

    // optimistic bump
    setCounts((c) => ({
      like: c.like + (type === "LIKE" ? 1 : 0),
      wow:  c.wow  + (type === "WOW"  ? 1 : 0),
      hmm:  c.hmm  + (type === "HMM"  ? 1 : 0),
    }));
    setVoted(type);

    const res = await fetch(`/api/articles/${encodeURIComponent(slug)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "react", type }),
    });

    if (!res.ok) {
      // rollback on failure
      setCounts(prev);
      setVoted(null);
      const txt = await res.text().catch(() => "");
      alert(`Could not register reaction: ${res.status}${txt ? ` — ${txt}` : ""}`);
    }
  }

  const btnCls =
    "rounded-full px-3 py-1 border text-sm disabled:opacity-50 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition";

  return (
    <div className="flex items-center gap-3">
      <button
        className={btnCls}
        onClick={() => react("LIKE")}
        disabled={isPending}
        aria-pressed={voted === "LIKE"}
        title="Like"
      >
        👍 <span className="ml-1 tabular-nums">{counts.like}</span>
      </button>
      <button
        className={btnCls}
        onClick={() => react("WOW")}
        disabled={isPending}
        aria-pressed={voted === "WOW"}
        title="Wow"
      >
        😮 <span className="ml-1 tabular-nums">{counts.wow}</span>
      </button>
      <button
        className={btnCls}
        onClick={() => react("HMM")}
        disabled={isPending}
        aria-pressed={voted === "HMM"}
        title="Hmm"
      >
        🤔 <span className="ml-1 tabular-nums">{counts.hmm}</span>
      </button>
    </div>
  );
}
