// src/components/article/CommentsSection.tsx
import type { Article } from "@prisma/client";

export default function CommentsSection({ article }: { article: Article }) {
  return (
    <div className="pt-12">
      <h2 className="text-xl font-semibold mb-4">Comments</h2>

      <div className="bg-white border p-6 rounded-xl space-y-4">
        {/* Placeholder for reaction UI */}
        <div className="flex gap-4">
          <button>👍 Like</button>
          <button>😮 Wow</button>
          <button>🤔 Hmm</button>
        </div>

        {/* Placeholder for Facebook Comments */}
        <div className="pt-6 border-t">
          {/* Replace href below with your actual domain */}
          <div
            className="fb-comments"
            data-href={`https://wheatandstone.ca/articles/${article.slug}`}
            data-width="100%"
            data-numposts="5"
          ></div>
        </div>
      </div>
    </div>
  );
}
