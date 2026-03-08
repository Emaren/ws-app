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
    amount: 5,
    reason: "delivery_lead_participation",
    cooldownSeconds: 6 * 60 * 60,
  },
  checkoutUser: {
    token: "STONE" as const,
    amount: 15,
    reason: "delivery_checkout_completed",
  },
  checkoutContributor: {
    token: "WHEAT" as const,
    amount: 4,
    reason: "delivery_checkout_contributor",
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

function cooldownBucket(now: Date, cooldownSeconds: number): string {
  const seconds = Math.floor(now.getTime() / 1000);
  return String(Math.floor(seconds / cooldownSeconds));
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

  const now = new Date();
  const scopeKey = normalizeScopeKey(input);
  const bucket = cooldownBucket(now, DELIVERY_REWARD_RULES.leadUser.cooldownSeconds);
  const externalRef = [
    "delivery-lead-user",
    input.userId,
    scopeKey,
    bucket,
  ].join(":");

  const grant = await createRewardCredit({
    userId: input.userId,
    businessId: input.businessId,
    token: DELIVERY_REWARD_RULES.leadUser.token,
    amount: DELIVERY_REWARD_RULES.leadUser.amount,
    reason: DELIVERY_REWARD_RULES.leadUser.reason,
    externalRef,
    metadata: {
      ruleId: "delivery_lead_user_v1",
      leadId: input.leadId,
      articleSlug: input.articleSlug ?? null,
      offerId: input.offerId ?? null,
      inventoryItemId: input.inventoryItemId ?? null,
      requestedQty: input.requestedQty ?? null,
      scopeKey,
      cooldownBucket: bucket,
      cooldownSeconds: DELIVERY_REWARD_RULES.leadUser.cooldownSeconds,
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
  const grants: LocalRewardGrant[] = [];

  if (input.userId) {
    const userGrant = await createRewardCredit({
      userId: input.userId,
      businessId: input.businessId,
      token: DELIVERY_REWARD_RULES.checkoutUser.token,
      amount: DELIVERY_REWARD_RULES.checkoutUser.amount,
      reason: DELIVERY_REWARD_RULES.checkoutUser.reason,
      externalRef: [
        "delivery-checkout-user",
        input.leadId,
        input.checkoutSessionId,
      ].join(":"),
      metadata: {
        ruleId: "delivery_checkout_user_v1",
        leadId: input.leadId,
        checkoutSessionId: input.checkoutSessionId,
        articleSlug: input.articleSlug ?? null,
        offerId: input.offerId ?? null,
        inventoryItemId: input.inventoryItemId ?? null,
        totalCents: input.totalCents ?? null,
      },
    });

    if (userGrant) {
      grants.push(userGrant);
    }
  }

  if (input.contributorUserId) {
    const contributorGrant = await createRewardCredit({
      userId: input.contributorUserId,
      businessId: input.businessId,
      token: DELIVERY_REWARD_RULES.checkoutContributor.token,
      amount: DELIVERY_REWARD_RULES.checkoutContributor.amount,
      reason: DELIVERY_REWARD_RULES.checkoutContributor.reason,
      externalRef: [
        "delivery-checkout-contributor",
        input.leadId,
        input.checkoutSessionId,
        input.contributorUserId,
      ].join(":"),
      metadata: {
        ruleId: "delivery_checkout_contributor_v1",
        leadId: input.leadId,
        checkoutSessionId: input.checkoutSessionId,
        articleSlug: input.articleSlug ?? null,
        offerId: input.offerId ?? null,
        inventoryItemId: input.inventoryItemId ?? null,
        totalCents: input.totalCents ?? null,
      },
    });

    if (contributorGrant) {
      grants.push(contributorGrant);
    }
  }

  return grants;
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
