// src/lib/getLatestArticle.ts
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const latestArticleQuery = {
  where: {
    OR: [
      { status: "PUBLISHED" },
      {
        AND: [
          { status: { in: ["DRAFT", "REVIEW"] } },
          { publishedAt: { not: null } },
        ],
      },
    ],
  },
  orderBy: [
    { publishedAt: "desc" }, // prefer newest by published date
    { createdAt: "desc" }, // fallback if publishedAt is null/missing
  ],
  include: {
    author: {
      select: {
        id: true,
        name: true,
      },
    },
    reviewProfile: {
      include: {
        product: {
          include: {
            brand: true,
          },
        },
      },
    },
    commerceModules: {
      where: { isEnabled: true },
      orderBy: [{ placement: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        business: {
          include: {
            storeProfile: true,
          },
        },
        offer: true,
        inventoryItem: true,
      },
    },
  },
} satisfies Prisma.ArticleFindFirstArgs;

export type LatestArticle = Prisma.ArticleGetPayload<{
  include: typeof latestArticleQuery.include;
}>;
type FindLatestArticle = (args: Prisma.ArticleFindFirstArgs) => Promise<LatestArticle | null>;

function isRecoverableLatestArticleError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientInitializationError;
}

export async function getLatestArticle(options?: {
  findLatestArticle?: FindLatestArticle;
}) {
  const findLatestArticle =
    options?.findLatestArticle ??
    ((args) => prisma.article.findFirst(args) as Promise<LatestArticle | null>);

  try {
    return await findLatestArticle(latestArticleQuery);
  } catch (error) {
    if (isRecoverableLatestArticleError(error)) {
      console.warn("latest_article_unavailable", {
        message: error instanceof Error ? error.message : String(error),
      });
      return null;
    }

    throw error;
  }
}
