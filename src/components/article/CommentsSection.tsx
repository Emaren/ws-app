// src/components/article/CommentsSection.tsx
"use client";

import { useEffect } from "react";
import type { Article } from "@prisma/client";
import ReactionsBar from "./ReactionsBar";

export default function CommentsSection({ article }: { article: Article }) {
  // Load Facebook SDK once
  useEffect(() => {
    if (document.getElementById("fb-root")) return;
    const fbRoot = document.createElement("div");
    fbRoot.id = "fb-root";
    document.body.appendChild(fbRoot);

    const script = document.createElement("script");
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src = "https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v19.0";
    document.body.appendChild(script);
  }, []);

  return (
    <section className="pt-12 space-y-6">
      <div className="flex items-center justify-between">
        
        <ReactionsBar
          slug={article.slug}
          likeCount={article.likeCount}
          wowCount={article.wowCount}
          hmmCount={article.hmmCount}
        />
      </div>

      <div className="bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 p-6 rounded-2xl">
        <div
          className="fb-comments"
          data-href={`https://wheatandstone.ca/articles/${article.slug}`}
          data-width="100%"
          data-numposts="5"
        />
      </div>
    </section>
  );
}
