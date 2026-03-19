import { NextResponse, type NextRequest } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { ReactionScope, ReactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isPubliclyVisibleArticle, normalizeArticleStatus } from "@/lib/articleLifecycle";
import { getApiAuthContext } from "@/lib/apiAuth";
import {
  grantArticleProductVoteReward,
  grantArticleReactionReward,
} from "@/lib/localRewards";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ClientArticleReaction = "like" | "wow" | "hmm";
type ClientProductReaction = "like" | "hmm";

const ARTICLE_REACTION_TYPES = [ReactionType.LIKE, ReactionType.WOW, ReactionType.HMM];
const PRODUCT_REACTION_TYPES = [ReactionType.LIKE, ReactionType.HMM];
const REACTION_ACTOR_COOKIE = "ws_reaction_actor";
const REACTION_ACTOR_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

type ReactionActor = {
  userId: string | null;
  actorHash: string;
  setCookieValue: string | null;
};

function badRequest(message = "Bad Request") {
  return new NextResponse(message, { status: 400 });
}

function forbidden(message = "Forbidden") {
  return new NextResponse(message, { status: 403 });
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

function firstForwardedIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  return "unknown";
}

function hashActorSeed(seed: string): string {
  return createHash("sha256").update(seed).digest("hex");
}

async function resolveReactionActor(req: NextRequest): Promise<ReactionActor> {
  const auth = await getApiAuthContext(req);
  const cookieValue = req.cookies.get(REACTION_ACTOR_COOKIE)?.value?.trim() || "";
  const actorCookie = cookieValue || randomUUID().replace(/-/g, "");
  const userAgent = req.headers.get("user-agent")?.trim() || "unknown";
  const forwardedIp = firstForwardedIp(req);
  let localUserId = auth.userId ?? null;

  // Graceful fallback for stale sessions that still carry a non-Prisma user id.
  if (localUserId) {
    const existingLocalUser = await prisma.user.findUnique({
      where: { id: localUserId },
      select: { id: true },
    });
    if (!existingLocalUser) {
      localUserId = null;
    }
  }

  const actorSeed = localUserId
    ? `user:${localUserId}`
    : `anon:${actorCookie}:${forwardedIp}:${userAgent}`;

  return {
    userId: localUserId,
    actorHash: hashActorSeed(actorSeed),
    setCookieValue: cookieValue ? null : actorCookie,
  };
}

function actorFilter(actor: ReactionActor):
  | { userId: string }
  | { userId: null; ipHash: string } {
  if (actor.userId) {
    return { userId: actor.userId };
  }

  return {
    userId: null,
    ipHash: actor.actorHash,
  };
}

function withActorCookie(response: NextResponse, actor: ReactionActor): NextResponse {
  if (!actor.setCookieValue) {
    return response;
  }

  response.cookies.set({
    name: REACTION_ACTOR_COOKIE,
    value: actor.setCookieValue,
    maxAge: REACTION_ACTOR_COOKIE_MAX_AGE_SECONDS,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
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
      reviewProfile: {
        select: {
          product: {
            select: {
              slug: true,
            },
          },
        },
      },
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

  const actor = await resolveReactionActor(req);
  const mineWhere = actorFilter(actor);

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
      prisma.reaction.findMany({
        where: {
          articleId: article.id,
          ...mineWhere,
          scope: ReactionScope.PRODUCT,
          type: { in: PRODUCT_REACTION_TYPES },
        },
        select: { type: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      }),
    ]);

    return withActorCookie(NextResponse.json({
      scope,
      counts: mapProductCounts(rows),
      selected: mine[0] ? (toClientType(mine[0].type) as ClientProductReaction) : null,
    }), actor);
  }

  const mine = await prisma.reaction.findMany({
    where: {
      articleId: article.id,
      ...mineWhere,
      scope: ReactionScope.ARTICLE,
      type: { in: ARTICLE_REACTION_TYPES },
    },
    select: { type: true },
  });

  const selected = [...new Set(mine.map((row) => toClientType(row.type)))];

  return withActorCookie(NextResponse.json({
    scope,
    counts: {
      like: article.likeCount,
      wow: article.wowCount,
      hmm: article.hmmCount,
    },
    selected,
  }), actor);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const actor = await resolveReactionActor(req);

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
    const productSlug = article.reviewProfile?.product?.slug ?? article.slug;
    const result = await prisma.$transaction(async (tx) => {
      const reactionUserId = actor.userId
        ? (await tx.user.findUnique({
            where: { id: actor.userId },
            select: { id: true },
          }))?.id ?? null
        : null;
      const actorWhere = reactionUserId
        ? { userId: reactionUserId }
        : { userId: null, ipHash: actor.actorHash };

      const existing = await tx.reaction.findMany({
        where: {
          articleId: article.id,
          ...actorWhere,
          scope: ReactionScope.PRODUCT,
          type: { in: PRODUCT_REACTION_TYPES },
        },
        select: { id: true, type: true },
      });

      const alreadySelected =
        existing.length === 1 && existing[0].type === reactionType;

      await tx.reaction.deleteMany({
        where: {
          articleId: article.id,
          ...actorWhere,
          scope: ReactionScope.PRODUCT,
          type: { in: PRODUCT_REACTION_TYPES },
        },
      });

      if (!alreadySelected) {
        await tx.reaction.create({
          data: {
            articleId: article.id,
            userId: reactionUserId,
            ipHash: reactionUserId ? null : actor.actorHash,
            scope: ReactionScope.PRODUCT,
            type: reactionType,
            productSlug,
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
        selected: alreadySelected
          ? null
          : (toClientType(reactionType) as ClientProductReaction),
        rewardUserId: !alreadySelected ? reactionUserId : null,
      };
    });

    if (result.rewardUserId) {
      await grantArticleProductVoteReward({
        userId: result.rewardUserId,
        articleId: article.id,
        articleSlug: article.slug,
        reactionType: reactionType as "LIKE" | "HMM",
      });
    }

    return withActorCookie(NextResponse.json({
      scope,
      counts: result.counts,
      selected: result.selected,
    }), actor);
  }

  const result = await prisma.$transaction(async (tx) => {
    const productSlug = article.reviewProfile?.product?.slug ?? article.slug;
    const reactionUserId = actor.userId
      ? (await tx.user.findUnique({
          where: { id: actor.userId },
          select: { id: true },
        }))?.id ?? null
      : null;
    const actorWhere = reactionUserId
      ? { userId: reactionUserId }
      : { userId: null, ipHash: actor.actorHash };

    const existing = await tx.reaction.findFirst({
      where: {
        articleId: article.id,
        ...actorWhere,
        scope: ReactionScope.ARTICLE,
        type: reactionType,
      },
      select: { id: true },
    });

    if (existing) {
      await tx.reaction.delete({
        where: { id: existing.id },
      });

      const decrementPatch: {
        likeCount?: { decrement: number };
        wowCount?: { decrement: number };
        hmmCount?: { decrement: number };
      } = {};
      if (reactionType === ReactionType.LIKE) {
        decrementPatch.likeCount = { decrement: 1 };
      }
      if (reactionType === ReactionType.WOW) {
        decrementPatch.wowCount = { decrement: 1 };
      }
      if (reactionType === ReactionType.HMM) {
        decrementPatch.hmmCount = { decrement: 1 };
      }

      await tx.article.update({
        where: { id: article.id },
        data: decrementPatch,
      });
    } else {
      await tx.reaction.create({
        data: {
          articleId: article.id,
          userId: reactionUserId,
          ipHash: reactionUserId ? null : actor.actorHash,
          scope: ReactionScope.ARTICLE,
          type: reactionType,
          productSlug,
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
          ...actorWhere,
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
      rewardUserId: existing ? null : reactionUserId,
    };
  });

  if (result.rewardUserId) {
    await grantArticleReactionReward({
      userId: result.rewardUserId,
      articleId: article.id,
      articleSlug: article.slug,
      reactionType: reactionType as "LIKE" | "WOW" | "HMM",
    });
  }

  return withActorCookie(NextResponse.json({
    scope,
    counts: result.counts,
    selected: result.selected,
  }), actor);
}
