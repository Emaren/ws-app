// src/components/article/CommentsSection.tsx
"use client";

import { useEffect, useRef } from "react";
import type { Article } from "@prisma/client";
import ReactionsBar from "./ReactionsBar";

export default function CommentsSection({ article }: { article: Article }) {
  const fbWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parseFB = () => {
      try {
        (window as any)?.FB?.XFBML?.parse(fbWrapRef.current || undefined);
      } catch {}
    };

    // If SDK already present, just (re)parse this subtree
    if (document.getElementById("facebook-jssdk")) {
      parseFB();
      return;
    }

    // Ensure fb-root exists
    if (!document.getElementById("fb-root")) {
      const fbRoot = document.createElement("div");
      fbRoot.id = "fb-root";
      document.body.appendChild(fbRoot);
    }

    // Inject SDK and parse on load
    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src = "https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v19.0";
    script.onload = parseFB;
    document.body.appendChild(script);
  }, [article.slug]);

  return (
    // Padding-bottom (no mb-*) avoids sibling margin-collapsing.
    // isolation-isolate creates a stacking context so this paints above later siblings iframes overlap.
    <section className="pt-12 space-y-6 pb-16 md:pb-20 lg:pb-24 relative z-10 isolation-isolate">
      <div className="flex items-center justify-between">
        <ReactionsBar
          slug={article.slug}
          likeCount={article.likeCount}
          wowCount={article.wowCount}
          hmmCount={article.hmmCount}
        />
      </div>

      {/* The FB plugin lives inside a rounded dark container */}
      <div className="bg-black/70 dark:bg-black border border-neutral-800 p-4 md:p-6 rounded-2xl shadow-sm overflow-hidden">
        <div ref={fbWrapRef}>
          <div
            className="fb-comments"
            data-href={`https://wheatandstone.ca/articles/${article.slug}`}
            data-width="100%"
            data-numposts="5"
            data-colorscheme="dark"
          />
        </div>
      </div>

      {/* Internal spacer ensures clear visual separation from whatever follows */}
      <div aria-hidden className="h-56 md:h-8 lg:h-10" />
    </section>
  );
}
