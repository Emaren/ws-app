import { prisma } from "@/lib/prisma";
import { isPubliclyVisibleArticle, normalizeArticleStatus } from "@/lib/articleLifecycle";
import {
  ARTICLE_COMMENT_LIST_LIMIT,
  nestPublicArticleComments,
  type PublicArticleComment,
} from "@/lib/articleCommentsShared";

const mountainFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Edmonton",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZoneName: "shortGeneric",
});

type CommentRow = {
  id: string;
  userId: string | null;
  parentId: string | null;
  authorName: string | null;
  body: string;
  createdAt: Date;
  author: {
    name: string | null;
    email: string | null;
  } | null;
};

function formatMountainTime(value: Date | string): string {
  const dateValue = typeof value === "string" ? new Date(value) : value;
  const parts = mountainFormatter.formatToParts(dateValue);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const dayPeriod = (lookup.dayPeriod ?? "").replace(/\./g, "").toLowerCase();
  return `${lookup.year}-${lookup.month}-${lookup.day} ${lookup.hour}:${lookup.minute}${dayPeriod} ${lookup.timeZoneName ?? "MT"}`;
}

function resolveDisplayName(row: CommentRow): string {
  const userName = row.author?.name?.trim();
  if (userName) {
    return userName;
  }

  const userEmail = row.author?.email?.trim();
  if (userEmail) {
    return userEmail.split("@")[0] || "Member";
  }

  const guestName = row.authorName?.trim();
  if (guestName) {
    return guestName;
  }

  return row.userId ? "Member" : "Anonymous Reader";
}

export function toPublicArticleComment(row: CommentRow): PublicArticleComment {
  return {
    id: row.id,
    parentId: row.parentId,
    authorName: resolveDisplayName(row),
    authorKind: row.userId ? "member" : "guest",
    body: row.body,
    createdAtISOString: row.createdAt.toISOString(),
    createdAtLabel: formatMountainTime(row.createdAt),
    replies: [],
  };
}

export async function listPublicArticleCommentsForArticle(
  articleId: string,
  limit = ARTICLE_COMMENT_LIST_LIMIT,
): Promise<PublicArticleComment[]> {
  const rows = await prisma.comment.findMany({
    where: { articleId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
    select: {
      id: true,
      userId: true,
      parentId: true,
      authorName: true,
      body: true,
      createdAt: true,
      author: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  return nestPublicArticleComments([...rows].reverse().map(toPublicArticleComment));
}

export async function getVisiblePublicArticleBySlug(slug: string) {
  const article = await prisma.article.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      status: true,
      publishedAt: true,
    },
  });

  if (!article) {
    return null;
  }

  const status = normalizeArticleStatus(article.status);
  if (!status || !isPubliclyVisibleArticle(status, article.publishedAt)) {
    return null;
  }

  return article;
}
