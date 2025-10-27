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
  // If you prefer dark mode for the plugin, uncomment:
  // params.set("colorscheme", "dark");
  return `https://www.facebook.com/plugins/comments.php?${params.toString()}`;
}

// Prefer a public origin (so FB can fetch it), never localhost.
function getPublicOrigin() {
  // Allow override via env; otherwise default to production site.
  const envOrigin = process.env.NEXT_PUBLIC_SITE_ORIGIN?.trim();
  if (envOrigin) return envOrigin.replace(/\/+$/, ""); // drop trailing slash
  return "https://wheatandstone.ca";
}

export default function CommentsSection({ article }: Props) {
  const origin = getPublicOrigin();
  const articleUrl = `${origin}/articles/${encodeURIComponent(article.slug)}`;
  const commentsSrc = buildCommentsSrc(articleUrl, 10, "100%");

  return (
    // Keep existing spacing; isolation prevents z-index bleed from floats/ads
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
          key={commentsSrc} // ensure proper reload if slug changes
          title="Facebook Comments"
          src={commentsSrc}
          // FB iframes set their own height internally; this is just a sensible starting height.
          style={{ width: "100%", height: 420, border: "none", overflow: "hidden" }}
          scrolling="no"
          loading="lazy"
          // Minimal allow list commonly requested by FB embeds
          allow="unload *; clipboard-write; encrypted-media; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
        />
        <noscript>
          <div className="mt-3 text-sm text-neutral-300">
            Comments require JavaScript.{" "}
            <a
              href={articleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              View this post on Facebook
            </a>
            .
          </div>
        </noscript>
      </div>

      {/* Spacer to keep distance from whatever follows (unchanged) */}
      <div aria-hidden className="h-56 md:h-8 lg:h-10" />
    </section>
  );
}
