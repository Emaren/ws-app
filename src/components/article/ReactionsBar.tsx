// src/components/article/ReactionsBar.tsx
"use client";

import { useState } from "react";

type Props = {
  slug: string;
  likeCount: number;
  wowCount: number;
  hmmCount: number;
};

export default function ReactionsBar({ slug, likeCount, wowCount, hmmCount }: Props) {
  const [counts, setCounts] = useState({ like: likeCount, wow: wowCount, hmm: hmmCount });
  const [voted, setVoted] = useState<null | "LIKE" | "WOW" | "HMM">(null);
  const [sending, setSending] = useState(false);

  async function react(type: "LIKE" | "WOW" | "HMM") {
    if (sending) return;
    if (voted === type) return;

    const prev = counts;
    setCounts({
      like: prev.like + (type === "LIKE" ? 1 : 0),
      wow: prev.wow + (type === "WOW" ? 1 : 0),
      hmm: prev.hmm + (type === "HMM" ? 1 : 0),
    });
    setVoted(type);
    setSending(true);

    try {
      const res = await fetch(`/api/articles/${encodeURIComponent(slug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "react", type }),
        cache: "no-store",
        keepalive: true,
      });
      if (!res.ok) {
        setCounts(prev);
        setVoted(null);
        const txt = await res.text().catch(() => "");
        alert(`Could not register reaction: ${res.status}${txt ? ` — ${txt}` : ""}`);
      }
    } catch {
      setCounts(prev);
      setVoted(null);
      alert("Network error — could not register reaction.");
    } finally {
      setSending(false);
    }
  }

  const btnCls =
    "inline-flex items-center gap-3 bg-transparent border-0 px-2 py-2 " +
    "text-2xl md:text-3xl cursor-pointer select-none " +
    "transition-transform hover:scale-110 active:scale-95 " +
    "focus:outline-none focus-visible:ring-0 disabled:opacity-50";

  const countCls = "tabular-nums text-lg md:text-xl font-medium";

  return (
    <div className="w-full flex justify-center">
      <div className="inline-flex items-center gap-16 sm:gap-20 md:gap-28">
        <button
          type="button"
          className={btnCls}
          onClick={() => react("LIKE")}
          disabled={sending}
          aria-pressed={voted === "LIKE"}
          title="Like"
        >
          <span role="img" aria-label="Like">👍</span>
          <span className={countCls}>{counts.like}</span>
        </button>

        <button
          type="button"
          className={btnCls}
          onClick={() => react("WOW")}
          disabled={sending}
          aria-pressed={voted === "WOW"}
          title="Wow"
        >
          <span role="img" aria-label="Wow">😮</span>
          <span className={countCls}>{counts.wow}</span>
        </button>

        <button
          type="button"
          className={btnCls}
          onClick={() => react("HMM")}
          disabled={sending}
          aria-pressed={voted === "HMM"}
          title="Hmm"
        >
          <span role="img" aria-label="Hmm">🤔</span>
          <span className={countCls}>{counts.hmm}</span>
        </button>
      </div>
    </div>
  );
}
