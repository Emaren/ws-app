// src/components/article/CommentsSection.tsx
"use client";

import type { Article } from "@prisma/client";
import ReactionsBar from "./ReactionsBar";

type Props = { article: Article };

// Build the FB comments plugin URL (iframe version; no SDK)
function buildCommentsSrc(href: string, numPosts = 10, width: number | string = "100%") {
  const w = typeof width === "number" ? String(width) : width;
  const params = new URLSearchParams({
    href,
    numposts: String(numPosts),
    width: w,
  });
  // You can add color scheme here if you prefer:
  // params.set("colorscheme", "dark");
  return `https://www.facebook.com/plugins/comments.php?${params.toString()}`;
}

export default function CommentsSection({ article }: Props) {
  const articleUrl = `https://wheatandstone.ca/articles/${article.slug}`;
  const src = buildCommentsSrc(articleUrl, 10, "100%");

  return (
    // padding-bottom only (no margin collapsing) + isolation just like before
    <section className="pt-12 space-y-6 pb-16 md:pb-20 lg:pb-24 relative z-10 isolation-isolate">
      <div className="flex items-center justify-between">
        <ReactionsBar
          slug={article.slug}
          likeCount={article.likeCount}
          wowCount={article.wowCount}
          hmmCount={article.hmmCount}
        />
      </div>

      {/* Rounded container that matches your previous style */}
      <div className="bg-black/70 dark:bg-black border border-neutral-800 p-4 md:p-6 rounded-2xl shadow-sm overflow-hidden">
        <iframe
          title="Facebook Comments"
          src={src}
          // Note: FB iframes typically resize themselves; set a sensible starting height.
          style={{ width: "100%", height: 420, border: "none", overflow: "hidden" }}
          scrolling="no"
          loading="lazy"
          // Key bit: explicitly allow `unload` so the third-party frame won’t trigger the violation in Chrome.
          // We also allow a few other harmless capabilities commonly requested by FB embeds.
          allow="unload *; clipboard-write; encrypted-media; picture-in-picture; web-share"
          // Tighten referrer policy for third-party
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>

      {/* Spacer to keep distance from whatever follows */}
      <div aria-hidden className="h-56 md:h-8 lg:h-10" />
    </section>
  );
}
