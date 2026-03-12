import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const homePageStoriesQuery = {
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
    { publishedAt: "desc" },
    { createdAt: "desc" },
  ],
  select: {
    slug: true,
    title: true,
    excerpt: true,
    coverUrl: true,
    publishedAt: true,
    author: {
      select: {
        id: true,
        name: true,
      },
    },
    reviewProfile: {
      select: {
        reviewScore: true,
        productName: true,
        category: true,
        organicStatus: true,
      },
    },
  },
  take: 6,
} satisfies Prisma.ArticleFindManyArgs;

export type HomePageStory = Prisma.ArticleGetPayload<{
  select: typeof homePageStoriesQuery.select;
}>;

function isRecoverableStoryQueryError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientInitializationError;
}

export async function getHomePageStories() {
  try {
    return await prisma.article.findMany(homePageStoriesQuery) as HomePageStory[];
  } catch (error) {
    if (isRecoverableStoryQueryError(error)) {
      console.warn("home_page_stories_unavailable", {
        message: error instanceof Error ? error.message : String(error),
      });
      return [];
    }

    throw error;
  }
}
