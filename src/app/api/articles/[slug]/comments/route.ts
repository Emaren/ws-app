import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiAuthContext } from "@/lib/apiAuth";
import {
  getVisiblePublicArticleBySlug,
  listPublicArticleCommentsForArticle,
  toPublicArticleComment,
} from "@/lib/articleComments";
import {
  ARTICLE_COMMENT_AUTHOR_MAX_LENGTH,
  ARTICLE_COMMENT_BODY_MAX_LENGTH,
  ARTICLE_COMMENT_BODY_MIN_LENGTH,
  type ArticleCommentRewardOutcome,
} from "@/lib/articleCommentsShared";
import { grantArticleCommentReward } from "@/lib/localRewards";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function notFound(message = "Article not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}

function normalizeAuthorName(rawValue: unknown): string | null {
  const value = typeof rawValue === "string" ? rawValue.trim() : "";
  if (!value) {
    return null;
  }

  return value.slice(0, ARTICLE_COMMENT_AUTHOR_MAX_LENGTH);
}

function normalizeBody(rawValue: unknown): string {
  if (typeof rawValue !== "string") {
    return "";
  }

  return rawValue.replace(/\r\n/g, "\n").trim();
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const article = await getVisiblePublicArticleBySlug(slug);
  if (!article) {
    return notFound();
  }

  const comments = await listPublicArticleCommentsForArticle(article.id);
  return NextResponse.json({ comments });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const article = await getVisiblePublicArticleBySlug(slug);
  if (!article) {
    return notFound();
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    payload = {};
  }

  const body = normalizeBody(payload.body);
  if (body.length < ARTICLE_COMMENT_BODY_MIN_LENGTH) {
    return badRequest(`Comments need at least ${ARTICLE_COMMENT_BODY_MIN_LENGTH} characters.`);
  }
  if (body.length > ARTICLE_COMMENT_BODY_MAX_LENGTH) {
    return badRequest(`Comments must stay under ${ARTICLE_COMMENT_BODY_MAX_LENGTH} characters.`);
  }

  const auth = await getApiAuthContext(req);
  const localUserId = auth.userId
    ? (await prisma.user.findUnique({
        where: { id: auth.userId },
        select: { id: true },
      }))?.id ?? null
    : null;

  const authorName = localUserId ? null : normalizeAuthorName(payload.authorName);

  const commentRow = await prisma.comment.create({
    data: {
      articleId: article.id,
      userId: localUserId,
      authorName,
      body,
    },
    select: {
      id: true,
      userId: true,
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

  let reward: ArticleCommentRewardOutcome = {
    eligible: Boolean(localUserId),
    granted: false,
    dailyLimitReached: false,
    token: "STONE",
    amount: 1,
  };

  if (localUserId) {
    try {
      const grant = await grantArticleCommentReward({
        userId: localUserId,
        articleId: article.id,
        articleSlug: article.slug,
        commentId: commentRow.id,
      });
      reward = {
        eligible: true,
        granted: Boolean(grant),
        dailyLimitReached: !grant,
        token: "STONE",
        amount: 1,
      };
    } catch (error) {
      console.error("article_comment_reward_failed", {
        articleId: article.id,
        commentId: commentRow.id,
        userId: localUserId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return NextResponse.json(
    {
      comment: toPublicArticleComment(commentRow),
      reward,
    },
    { status: 201 },
  );
}
