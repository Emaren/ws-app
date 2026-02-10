import { NextResponse, type NextRequest } from "next/server";
import { ReactionScope, ReactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isPubliclyVisibleArticle, normalizeArticleStatus } from "@/lib/articleLifecycle";
import { getApiAuthContext } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ClientArticleReaction = "like" | "wow" | "hmm";
type ClientProductReaction = "like" | "hmm";

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

function parseScope(req: NextRequest): "article" | "product" {
  const raw = (req.nextUrl.searchParams.get("scope") || "article").toLowerCase();
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
  const allowed =
    scope === "product"
      ? [ReactionType.LIKE, ReactionType.HMM]
      : [ReactionType.LIKE, ReactionType.WOW, ReactionType.HMM];
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
          type: { in: [ReactionType.LIKE, ReactionType.HMM] },
        },
        _count: { _all: true },
      }),
      userId
        ? prisma.reaction.findUnique({
            where: {
              articleId_userId_scope: {
                articleId: article.id,
                userId,
                scope: ReactionScope.PRODUCT,
              },
            },
            select: { type: true },
          })
        : Promise.resolve(null),
    ]);

    return NextResponse.json({
      scope,
      counts: mapProductCounts(rows),
      selected:
        mine && (mine.type === ReactionType.LIKE || mine.type === ReactionType.HMM)
          ? (toClientType(mine.type) as ClientProductReaction)
          : null,
    });
  }

  const mine = userId
    ? await prisma.reaction.findUnique({
        where: {
          articleId_userId_scope: {
            articleId: article.id,
            userId,
            scope: ReactionScope.ARTICLE,
          },
        },
        select: { type: true },
      })
    : null;

  return NextResponse.json({
    scope,
    counts: {
      like: article.likeCount,
      wow: article.wowCount,
      hmm: article.hmmCount,
    },
    selected: mine ? toClientType(mine.type) : null,
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
      const where = {
        articleId_userId_scope: {
          articleId: article.id,
          userId: auth.userId!,
          scope: ReactionScope.PRODUCT,
        },
      } as const;

      const existing = await tx.reaction.findUnique({
        where,
        select: { type: true },
      });

      if (!existing || existing.type !== reactionType) {
        await tx.reaction.upsert({
          where,
          create: {
            articleId: article.id,
            userId: auth.userId,
            scope: ReactionScope.PRODUCT,
            type: reactionType,
            productSlug: article.slug,
          },
          update: {
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
          type: { in: [ReactionType.LIKE, ReactionType.HMM] },
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
    const where = {
      articleId_userId_scope: {
        articleId: article.id,
        userId: auth.userId!,
        scope: ReactionScope.ARTICLE,
      },
    } as const;

    const [existing, currentArticleCounts] = await Promise.all([
      tx.reaction.findUnique({ where, select: { type: true } }),
      tx.article.findUnique({
        where: { id: article.id },
        select: { likeCount: true, wowCount: true, hmmCount: true },
      }),
    ]);

    if (!currentArticleCounts) {
      throw new Error("Article disappeared during reaction update");
    }

    let nextCounts = {
      like: currentArticleCounts.likeCount,
      wow: currentArticleCounts.wowCount,
      hmm: currentArticleCounts.hmmCount,
    };

    if (!existing || existing.type !== reactionType) {
      await tx.reaction.upsert({
        where,
        create: {
          articleId: article.id,
          userId: auth.userId,
          scope: ReactionScope.ARTICLE,
          type: reactionType,
          productSlug: article.slug,
        },
        update: {
          type: reactionType,
          productSlug: article.slug,
        },
      });

      if (existing?.type === ReactionType.LIKE) {
        nextCounts.like = Math.max(0, nextCounts.like - 1);
      }
      if (existing?.type === ReactionType.WOW) {
        nextCounts.wow = Math.max(0, nextCounts.wow - 1);
      }
      if (existing?.type === ReactionType.HMM) {
        nextCounts.hmm = Math.max(0, nextCounts.hmm - 1);
      }

      if (reactionType === ReactionType.LIKE) {
        nextCounts.like += 1;
      }
      if (reactionType === ReactionType.WOW) {
        nextCounts.wow += 1;
      }
      if (reactionType === ReactionType.HMM) {
        nextCounts.hmm += 1;
      }

      await tx.article.update({
        where: { id: article.id },
        data: {
          likeCount: nextCounts.like,
          wowCount: nextCounts.wow,
          hmmCount: nextCounts.hmm,
        },
      });
    }

    return {
      counts: nextCounts,
      selected: toClientType(reactionType),
    };
  });

  return NextResponse.json({
    scope,
    counts: result.counts,
    selected: result.selected,
  });
}
