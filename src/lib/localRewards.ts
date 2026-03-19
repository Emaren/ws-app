import { Prisma, type RewardToken } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type LocalRewardGrant = {
  id: string;
  token: RewardToken;
  amount: number;
  reason: string;
  createdAt: Date;
};

const DELIVERY_REWARD_RULES = {
  leadUser: {
    token: "STONE" as const,
    amount: 1,
    reason: "delivery_placed",
  },
};

const ARTICLE_REWARD_RULES = {
  productVoteUser: {
    token: "STONE" as const,
    amount: 1,
    reason: "article_thumb_vote_participation",
  },
  articleReactionUser: {
    token: "STONE" as const,
    amount: 1,
    reason: "article_reaction_participation",
  },
};

const COMMENT_REWARD_RULES = {
  articleCommentUser: {
    token: "STONE" as const,
    amount: 1,
    reason: "article_comment_participation",
    timeZone: "America/Edmonton",
  },
};

function normalizeScopeKey(input: {
  businessId: string;
  articleSlug?: string | null;
  offerId?: string | null;
  inventoryItemId?: string | null;
}): string {
  if (input.offerId) {
    return `offer:${input.offerId}`;
  }
  if (input.inventoryItemId) {
    return `inventory:${input.inventoryItemId}`;
  }
  if (input.articleSlug) {
    return `article:${input.articleSlug}`;
  }
  return `business:${input.businessId}`;
}

function calendarDayBucket(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

async function createRewardCredit(input: {
  userId: string;
  businessId?: string | null;
  token: RewardToken;
  amount: number;
  reason: string;
  externalRef: string;
  metadata?: Prisma.InputJsonValue;
}): Promise<LocalRewardGrant | null> {
  try {
    const entry = await prisma.rewardLedger.create({
      data: {
        userId: input.userId,
        businessId: input.businessId ?? null,
        token: input.token,
        direction: "CREDIT",
        amount: new Prisma.Decimal(String(input.amount)),
        reason: input.reason,
        externalRef: input.externalRef,
        metadata: input.metadata ?? Prisma.JsonNull,
      },
      select: {
        id: true,
        token: true,
        amount: true,
        reason: true,
        createdAt: true,
      },
    });

    return {
      id: entry.id,
      token: entry.token,
      amount: Number(entry.amount.toString()),
      reason: entry.reason,
      createdAt: entry.createdAt,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return null;
    }

    throw error;
  }
}

export async function grantDeliveryLeadRewards(input: {
  leadId: string;
  businessId: string;
  userId?: string | null;
  articleSlug?: string | null;
  offerId?: string | null;
  inventoryItemId?: string | null;
  requestedQty?: number | null;
}): Promise<LocalRewardGrant[]> {
  if (!input.userId) {
    return [];
  }

  const grant = await createRewardCredit({
    userId: input.userId,
    businessId: input.businessId,
    token: DELIVERY_REWARD_RULES.leadUser.token,
    amount: DELIVERY_REWARD_RULES.leadUser.amount,
    reason: DELIVERY_REWARD_RULES.leadUser.reason,
    externalRef: ["delivery-placed-user", input.leadId, input.userId].join(":"),
    metadata: {
      ruleId: "delivery_placed_user_v2",
      leadId: input.leadId,
      articleSlug: input.articleSlug ?? null,
      offerId: input.offerId ?? null,
      inventoryItemId: input.inventoryItemId ?? null,
      requestedQty: input.requestedQty ?? null,
      scopeKey: normalizeScopeKey(input),
    },
  });

  return grant ? [grant] : [];
}

export async function grantDeliveryCheckoutRewards(input: {
  leadId: string;
  checkoutSessionId: string;
  businessId: string;
  userId?: string | null;
  contributorUserId?: string | null;
  articleSlug?: string | null;
  offerId?: string | null;
  inventoryItemId?: string | null;
  totalCents?: number | null;
}): Promise<LocalRewardGrant[]> {
  void input;
  return [];
}

export async function grantArticleProductVoteReward(input: {
  userId: string;
  articleId: string;
  articleSlug: string;
  reactionType: "LIKE" | "HMM";
}): Promise<LocalRewardGrant | null> {
  return createRewardCredit({
    userId: input.userId,
    token: ARTICLE_REWARD_RULES.productVoteUser.token,
    amount: ARTICLE_REWARD_RULES.productVoteUser.amount,
    reason: ARTICLE_REWARD_RULES.productVoteUser.reason,
    externalRef: ["article-product-vote-user", input.userId, input.articleId].join(":"),
    metadata: {
      ruleId: "article_product_vote_user_v1",
      articleId: input.articleId,
      articleSlug: input.articleSlug,
      reactionType: input.reactionType,
    },
  });
}

export async function grantArticleReactionReward(input: {
  userId: string;
  articleId: string;
  articleSlug: string;
  reactionType: "LIKE" | "WOW" | "HMM";
}): Promise<LocalRewardGrant | null> {
  return createRewardCredit({
    userId: input.userId,
    token: ARTICLE_REWARD_RULES.articleReactionUser.token,
    amount: ARTICLE_REWARD_RULES.articleReactionUser.amount,
    reason: ARTICLE_REWARD_RULES.articleReactionUser.reason,
    externalRef: [
      "article-reaction-user",
      input.userId,
      input.articleId,
      input.reactionType.toLowerCase(),
    ].join(":"),
    metadata: {
      ruleId: "article_reaction_user_v1",
      articleId: input.articleId,
      articleSlug: input.articleSlug,
      reactionType: input.reactionType,
    },
  });
}

export async function grantArticleCommentReward(input: {
  userId: string;
  articleId: string;
  articleSlug: string;
  commentId: string;
}): Promise<LocalRewardGrant | null> {
  const now = new Date();
  const dayBucket = calendarDayBucket(now, COMMENT_REWARD_RULES.articleCommentUser.timeZone);

  return createRewardCredit({
    userId: input.userId,
    token: COMMENT_REWARD_RULES.articleCommentUser.token,
    amount: COMMENT_REWARD_RULES.articleCommentUser.amount,
    reason: COMMENT_REWARD_RULES.articleCommentUser.reason,
    externalRef: ["article-comment-user", input.userId, dayBucket].join(":"),
    metadata: {
      ruleId: "article_comment_user_v1",
      articleId: input.articleId,
      articleSlug: input.articleSlug,
      commentId: input.commentId,
      localDayBucket: dayBucket,
      timeZone: COMMENT_REWARD_RULES.articleCommentUser.timeZone,
    },
  });
}

export async function listLocalRewardBalancesForUser(userId: string) {
  const entries = await prisma.rewardLedger.findMany({
    where: {
      userId,
    },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      token: true,
      direction: true,
      amount: true,
      reason: true,
      createdAt: true,
      metadata: true,
    },
  });

  const totals = new Map<RewardToken, number>();
  for (const entry of entries) {
    const amount = Number(entry.amount.toString());
    const signedAmount = entry.direction === "DEBIT" ? -amount : amount;
    totals.set(entry.token, (totals.get(entry.token) ?? 0) + signedAmount);
  }

  return {
    entries: entries.map((entry) => ({
      id: entry.id,
      token: entry.token,
      direction: entry.direction,
      amount: Number(entry.amount.toString()) * (entry.direction === "DEBIT" ? -1 : 1),
      reason: entry.reason,
      createdAt: entry.createdAt.toISOString(),
      metadata: entry.metadata,
    })),
    balances: (["WHEAT", "STONE"] as const).map((token) => ({
      token,
      balance: totals.get(token) ?? 0,
    })),
  };
}
