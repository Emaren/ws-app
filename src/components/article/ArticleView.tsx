// src/components/article/ArticleView.tsx
import type { Article } from "@prisma/client";
import Link from "next/link";
import WysiwygStyle from "./WysiwygStyle";

type Props = { article: Article; variant: "summary" | "full" };

export default function ArticleView({ article, variant }: Props) {
  if (variant === "summary") {
    // unchanged
    ...
  }

  return (
    <article>
      <WysiwygStyle />  {/* inject shared CSS once */}
      {article.coverUrl && (
        <img src={article.coverUrl} alt="" className="w-full h-[340px] object-cover rounded-2xl mb-6" />
      )}
      <header className="mb-4">
        <h1 className="text-3xl font-semibold tracking-tight">{article.title}</h1>
        <div className="text-sm opacity-60 mt-1">
          {article.publishedAt ? new Date(article.publishedAt).toLocaleString() : "Unpublished"}
        </div>
      </header>
      <div className="wysiwyg" dangerouslySetInnerHTML={{ __html: article.content }} />
    </article>
  );
}
