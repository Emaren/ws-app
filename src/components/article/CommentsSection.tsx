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
  return `https://www.facebook.com/plugins/comments.php?${params.toString()}`;
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

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log("[FB comments] href =", articleUrl);
  }

  // no bottom margin here — ActionLinks owns the symmetric spacing
  return (
    <section className="pt-6 md:pt-8 relative z-10 isolation-isolate">
      <div
        ref={wrapRef}
        className="bg-black/70 dark:bg-black border border-neutral-800 p-4 md:p-5 rounded-2xl shadow-sm overflow-hidden"
      >
        <iframe
          key={commentsSrc}
          title="Facebook Comments"
          src={commentsSrc}
          style={{ width: "100%", minHeight: 420, border: "none", overflow: "hidden" }}
          scrolling="no"
          loading="eager"
          allow="clipboard-write; encrypted-media; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
        />
        <p className="mt-2 text-[12px] text-neutral-300">
          If you don’t see comments, a privacy extension or browser setting may be blocking Facebook embeds.{" "}
          <a
            href={commentsSrc}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 cursor-pointer"
          >
            Open comments in a new tab
          </a>
          .
        </p>
      </div>
    </section>
  );
}
