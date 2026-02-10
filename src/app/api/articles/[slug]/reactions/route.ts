import { NextResponse, type NextRequest } from "next/server";
import { ReactionScope, ReactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isPubliclyVisibleArticle, normalizeArticleStatus } from "@/lib/articleLifecycle";
import { getApiAuthContext } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ClientArticleReaction = "like" | "wow" | "hmm";
type ClientProductReaction = "like" | "hmm";

const ARTICLE_REACTION_TYPES = [ReactionType.LIKE, ReactionType.WOW, ReactionType.HMM];
const PRODUCT_REACTION_TYPES = [ReactionType.LIKE, ReactionType.HMM];

function badRequest(message = "Bad Request") {
  return new NextResponse(message, { status: 400 });
}

function forbidden(message = "Forbidden") {
  return new NextResponse(message, { status: 403 });
}

function unauthorized(message = "Unauthorized") {
  return new NextResponse(message, { status: 401 });
}

function notFound(message = "Not found") {
  return new NextResponse(message, { status: 404 });
}

function getSearchParam(req: NextRequest, key: string): string | null {
  const rawUrl = (req as { url?: unknown }).url;
  const normalizedUrl =
    typeof rawUrl === "string"
      ? rawUrl
      : rawUrl instanceof URL
        ? rawUrl.toString()
        : rawUrl &&
            typeof rawUrl === "object" &&
            "href" in rawUrl &&
            typeof (rawUrl as { href?: unknown }).href === "string"
          ? (rawUrl as { href: string }).href
          : "http://localhost";

  try {
    return new URL(normalizedUrl).searchParams.get(key);
  } catch {
    return null;
  }
}

function parseScope(req: NextRequest): "article" | "product" {
  const raw = (getSearchParam(req, "scope") || "article").toLowerCase();
  return raw === "product" ? "product" : "article";
}

function toClientType(type: ReactionType): ClientArticleReaction {
  if (type === ReactionType.LIKE) return "like";
  if (type === ReactionType.WOW) return "wow";
  return "hmm";
}

function parseReactionType(
  rawValue: unknown,
  scope: "article" | "product",
): ReactionType | null {
  const raw = String(rawValue ?? "").trim().toUpperCase();
  const allowed = scope === "product" ? PRODUCT_REACTION_TYPES : ARTICLE_REACTION_TYPES;
  return allowed.includes(raw as ReactionType) ? (raw as ReactionType) : null;
}

async function getVisibleArticleBySlug(slug: string) {
  const article = await prisma.article.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      status: true,
      publishedAt: true,
      likeCount: true,
      wowCount: true,
      hmmCount: true,
    },
  });

  if (!article) {
    return { error: notFound(), article: null } as const;
  }

  const status = normalizeArticleStatus(article.status);
  if (!status || !isPubliclyVisibleArticle(status, article.publishedAt)) {
    return { error: forbidden(), article: null } as const;
  }

  return { error: null, article } as const;
}

function mapProductCounts(
  rows: Array<{ type: ReactionType; _count: { _all: number } }>,
): { like: number; hmm: number } {
  const counts = { like: 0, hmm: 0 };
  for (const row of rows) {
    if (row.type === ReactionType.LIKE) counts.like = row._count._all;
    if (row.type === ReactionType.HMM) counts.hmm = row._count._all;
  }
  return counts;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const scope = parseScope(req);

  const { article, error } = await getVisibleArticleBySlug(slug);
  if (!article) return error;

  const auth = await getApiAuthContext(req);
  const userId = auth.userId;

  if (scope === "product") {
    const [rows, mine] = await Promise.all([
      prisma.reaction.groupBy({
        by: ["type"],
        where: {
          articleId: article.id,
          scope: ReactionScope.PRODUCT,
          type: { in: PRODUCT_REACTION_TYPES },
        },
        _count: { _all: true },
      }),
      userId
        ? prisma.reaction.findMany({
            where: {
              articleId: article.id,
              userId,
              scope: ReactionScope.PRODUCT,
              type: { in: PRODUCT_REACTION_TYPES },
            },
            select: { type: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          })
        : Promise.resolve([]),
    ]);

    return NextResponse.json({
      scope,
      counts: mapProductCounts(rows),
      selected: mine[0] ? (toClientType(mine[0].type) as ClientProductReaction) : null,
    });
  }

  const mine = userId
    ? await prisma.reaction.findMany({
        where: {
          articleId: article.id,
          userId,
          scope: ReactionScope.ARTICLE,
          type: { in: ARTICLE_REACTION_TYPES },
        },
        select: { type: true },
      })
    : [];

  return NextResponse.json({
    scope,
    counts: {
      like: article.likeCount,
      wow: article.wowCount,
      hmm: article.hmmCount,
    },
    selected: mine.map((row) => toClientType(row.type)),
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await getApiAuthContext(req);
  if (!auth.userId) {
    return unauthorized("Sign in required to react");
  }

  const { slug } = await params;
  const scope = parseScope(req);

  const { article, error } = await getVisibleArticleBySlug(slug);
  if (!article) return error;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const reactionType = parseReactionType(body.type, scope);
  if (!reactionType) {
    return badRequest("Invalid reaction type");
  }

  if (scope === "product") {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.reaction.findMany({
        where: {
          articleId: article.id,
          userId: auth.userId,
          scope: ReactionScope.PRODUCT,
          type: { in: PRODUCT_REACTION_TYPES },
        },
        select: { id: true, type: true },
      });

      const alreadySelected =
        existing.length === 1 && existing[0].type === reactionType;

      if (!alreadySelected) {
        await tx.reaction.deleteMany({
          where: {
            articleId: article.id,
            userId: auth.userId,
            scope: ReactionScope.PRODUCT,
            type: { in: PRODUCT_REACTION_TYPES },
          },
        });

        await tx.reaction.create({
          data: {
            articleId: article.id,
            userId: auth.userId,
            scope: ReactionScope.PRODUCT,
            type: reactionType,
            productSlug: article.slug,
          },
        });
      }

      const rows = await tx.reaction.groupBy({
        by: ["type"],
        where: {
          articleId: article.id,
          scope: ReactionScope.PRODUCT,
          type: { in: PRODUCT_REACTION_TYPES },
        },
        _count: { _all: true },
      });

      return {
        counts: mapProductCounts(rows),
        selected: toClientType(reactionType) as ClientProductReaction,
      };
    });

    return NextResponse.json({
      scope,
      counts: result.counts,
      selected: result.selected,
    });
  }

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.reaction.findFirst({
      where: {
        articleId: article.id,
        userId: auth.userId,
        scope: ReactionScope.ARTICLE,
        type: reactionType,
      },
      select: { id: true },
    });

    if (!existing) {
      await tx.reaction.create({
        data: {
          articleId: article.id,
          userId: auth.userId,
          scope: ReactionScope.ARTICLE,
          type: reactionType,
          productSlug: article.slug,
        },
      });

      const incrementPatch: {
        likeCount?: { increment: number };
        wowCount?: { increment: number };
        hmmCount?: { increment: number };
      } = {};
      if (reactionType === ReactionType.LIKE) {
        incrementPatch.likeCount = { increment: 1 };
      }
      if (reactionType === ReactionType.WOW) {
        incrementPatch.wowCount = { increment: 1 };
      }
      if (reactionType === ReactionType.HMM) {
        incrementPatch.hmmCount = { increment: 1 };
      }

      await tx.article.update({
        where: { id: article.id },
        data: incrementPatch,
      });
    }

    const [articleCounts, mine] = await Promise.all([
      tx.article.findUnique({
        where: { id: article.id },
        select: { likeCount: true, wowCount: true, hmmCount: true },
      }),
      tx.reaction.findMany({
        where: {
          articleId: article.id,
          userId: auth.userId,
          scope: ReactionScope.ARTICLE,
          type: { in: ARTICLE_REACTION_TYPES },
        },
        select: { type: true },
      }),
    ]);

    if (!articleCounts) {
      throw new Error("Article disappeared during reaction update");
    }

    return {
      counts: {
        like: articleCounts.likeCount,
        wow: articleCounts.wowCount,
        hmm: articleCounts.hmmCount,
      },
      selected: mine.map((row) => toClientType(row.type)),
    };
  });

  return NextResponse.json({
    scope,
    counts: result.counts,
    selected: result.selected,
  });
}
