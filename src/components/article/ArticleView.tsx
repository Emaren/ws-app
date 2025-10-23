// src/components/article/ArticleView.tsx
import type { Article } from "@prisma/client";

export default function ArticleView({
  article,
  variant,
}: {
  article: Article;
  variant?: "full" | "summary";
}) {
  return (
    <article className="prose max-w-none">
      <h1 className={variant === "summary" ? "text-2xl mb-2" : ""}>
        {article.title}
      </h1>

      {variant === "full" && (
        <>
          {article.coverUrl && (
            <img
              src={article.coverUrl}
              alt={article.title}
              className="rounded-xl my-4"
            />
          )}
          <div dangerouslySetInnerHTML={{ __html: article.content }} />
        </>
      )}

      {variant === "summary" && article.excerpt && (
        <p className="text-gray-600">{article.excerpt}</p>
      )}
    </article>
  );
}
