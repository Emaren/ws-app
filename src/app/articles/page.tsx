// src/app/articles/page.tsx
import type { ArticleStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function ArticlesPage(
  { searchParams }: { searchParams: Promise<{ page?: string }> }
) {
  const { page: pageParam } = await searchParams; // Next 15: searchParams is a Promise
  const page = Math.max(1, Number(pageParam ?? 1));
  const take = 10;
  const skip = (page - 1) * take;
  const legacyVisibleStatuses: ArticleStatus[] = ["DRAFT", "REVIEW"];
  const publicVisibilityWhere: Prisma.ArticleWhereInput = {
    OR: [
      { status: "PUBLISHED" },
      {
        AND: [
          { status: { in: legacyVisibleStatuses } },
          { publishedAt: { not: null } },
        ],
      },
    ],
  };

  const [items, total] = await Promise.all([
    prisma.article.findMany({
      where: publicVisibilityWhere,
      orderBy: { publishedAt: "desc" },
      select: { slug: true, title: true, excerpt: true, publishedAt: true },
      skip,
      take,
    }),
    prisma.article.count({
      where: publicVisibilityWhere,
    }),
  ]);

  return (
    <main className="mx-auto max-w-screen-xl px-4">
      <div className="mx-auto max-w-3xl py-8 space-y-6">
        <h1 className="text-2xl font-semibold">Articles</h1>

        {items.map((a) => (
          <article key={a.slug} className="border rounded-2xl p-5">
            <Link
              href={`/articles/${a.slug}`}
              className="text-xl font-medium hover:underline"
            >
              {a.title}
            </Link>
            {a.excerpt && <p className="mt-2 opacity-80">{a.excerpt}</p>}
          </article>
        ))}

        <div className="flex items-center justify-between pt-6">
          <Link
            href={`/articles?page=${Math.max(1, page - 1)}`}
            className={`underline ${page === 1 ? "pointer-events-none opacity-40" : ""}`}
          >
            Newer
          </Link>
          <span className="opacity-60">
            Page {page} / {Math.max(1, Math.ceil(total / take))}
          </span>
          <Link
            href={`/articles?page=${page + 1}`}
            className={`underline ${skip + take >= total ? "pointer-events-none opacity-40" : ""}`}
          >
            Older
          </Link>
        </div>
      </div>
    </main>
  );
}
