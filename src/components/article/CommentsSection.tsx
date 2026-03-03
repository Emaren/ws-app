// src/components/article/CommentsSection.tsx
"use client";

import React from "react";
import type { Article } from "@prisma/client";

type Props = { article: Article };

function buildCommentsSrc(href: string, widthPx: number, numPosts = 10, dark = false) {
  const width = String(Math.max(320, Math.min(widthPx, 1200)));
  const params = new URLSearchParams({
    href,
    numposts: String(numPosts),
    width,
    order_by: "reverse_time",
    lazy: "true",
    adapt_container_width: "true",
  });
  if (dark) params.set("colorscheme", "dark");
  return `https://www.facebook.com/plugins/feedback.php?${params.toString()}`;
}

// Prefer a public origin Facebook can fetch; ignore localhost/127.0.0.1/.local
function getPublicOrigin() {
  let env = process.env.NEXT_PUBLIC_SITE_ORIGIN?.trim();
  try {
    if (env) {
      const u = new URL(env);
      const host = u.hostname;
      const isLocal = host === "localhost" || host === "127.0.0.1" || host.endsWith(".local");
      if (!isLocal && (u.protocol === "https:" || u.protocol === "http:")) return u.origin;
    }
  } catch {
    /* ignore */
  }
  return "https://wheatandstone.ca";
}

export default function CommentsSection({ article }: Props) {
  const origin = getPublicOrigin();
  const articleUrl = `${origin}/articles/${encodeURIComponent(article.slug)}`;

  const wrapRef = React.useRef<HTMLDivElement>(null);
  const [w, setW] = React.useState(680);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [showFallback, setShowFallback] = React.useState(false);

  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const set = () => setW(Math.round(el.clientWidth));
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    addEventListener("resize", set);
    return () => {
      ro.disconnect();
      removeEventListener("resize", set);
    };
  }, []);

  const commentsSrc = buildCommentsSrc(articleUrl, w, 10, true);
  const commentsPopup = `https://www.facebook.com/plugins/feedback.php?href=${encodeURIComponent(articleUrl)}`;

  React.useEffect(() => {
    setIsLoaded(false);
    setShowFallback(false);
    const timer = window.setTimeout(() => {
      setShowFallback(true);
    }, 5200);
    return () => window.clearTimeout(timer);
  }, [commentsSrc]);

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log("[FB comments] href =", articleUrl);
  }

  // no bottom margin here — ActionLinks owns the symmetric spacing
  return (
    <section className="pt-6 md:pt-8 relative z-10 isolation-isolate">
      <div
        ref={wrapRef}
        className="relative bg-black/70 dark:bg-black border border-neutral-800 p-4 md:p-5 rounded-2xl shadow-sm overflow-hidden"
      >
        <div className="mb-2 flex justify-end">
          <a
            href={commentsPopup}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-md border border-neutral-600 bg-neutral-900/80 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-neutral-100 hover:bg-neutral-800"
          >
            Open Comments In Facebook
          </a>
        </div>

        {!isLoaded && !showFallback && (
          <div className="absolute inset-x-4 md:inset-x-5 top-4 md:top-5 z-10 rounded-xl border border-neutral-700 bg-neutral-950/80 px-3 py-2 text-[12px] text-neutral-300">
            Loading Facebook comments...
          </div>
        )}

        {showFallback && !isLoaded && (
          <div className="absolute inset-0 z-20 bg-neutral-950/92 backdrop-blur-[1px] p-4 md:p-5 flex items-center justify-center">
            <div className="w-full max-w-[620px] rounded-2xl border border-neutral-700 bg-neutral-900/95 p-4 md:p-5 text-neutral-100">
              <p className="text-sm md:text-base font-semibold">Facebook embed is blocked in this browser session.</p>
              <p className="mt-2 text-xs md:text-sm text-neutral-300">
                This is usually caused by privacy shields, tracker blocking, or third-party cookie restrictions.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={commentsPopup}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-lg border border-amber-300/50 bg-amber-300/10 px-3 py-2 text-xs md:text-sm font-semibold text-amber-100 hover:bg-amber-300/20"
                >
                  Open Comments In New Tab
                </a>
                <a
                  href={articleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-lg border border-neutral-500/70 bg-neutral-800/80 px-3 py-2 text-xs md:text-sm font-semibold text-neutral-100 hover:bg-neutral-700/90"
                >
                  Open Article URL (FB target)
                </a>
              </div>
            </div>
          </div>
        )}

        <iframe
          key={commentsSrc}
          title="Facebook Comments"
          src={commentsSrc}
          style={{ width: "100%", minHeight: 420, border: "none", overflow: "hidden" }}
          scrolling="no"
          loading="lazy"
          allow="clipboard-write; encrypted-media; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={() => setIsLoaded(true)}
          onError={() => setShowFallback(true)}
        />
        <p className="mt-2 text-[12px] text-neutral-300">
          If you don’t see comments, a privacy extension or browser setting may be blocking Facebook embeds{" "}
          <a
            href={commentsPopup}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 cursor-pointer"
          >
            — open comments in a new tab
          </a>
          .
        </p>
      </div>
    </section>
  );
}
