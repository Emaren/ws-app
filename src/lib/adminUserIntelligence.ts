import type {
  AnalyticsEventType,
  ReactionScope,
  ReactionType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getWsApiRewardReport,
  listWsApiUsers,
  listWsApiWalletLinks,
} from "@/lib/wsApiClient";
import { loadLocalUsers } from "./adminUserIntelligenceQuery";
import {
  RECENT_ANONYMOUS_ACTIVITY_LIMIT,
  RECENT_REGISTRATION_ATTEMPT_LIMIT,
  addBalance,
  buildUserIntelligencePreferenceCatalog,
  buildSerializedRegistrationAttempt,
  buildUserPayloadRecord,
  createZeroEventCounts,
  createZeroReactionCounts,
  createZeroScopeCounts,
  parseEventPath,
  toNumber,
  type RewardBalanceMap,
  type SerializedRegistrationAttempt,
  type WsApiIdentity,
} from "./adminUserIntelligenceSupport";

function buildAnalyticsByUser(
  rows: Array<{
    userId: string | null;
    eventType: AnalyticsEventType;
    _count: { _all: number };
  }>,
) {
  const analyticsByUser = new Map<string, Record<AnalyticsEventType, number>>();
  for (const row of rows) {
    if (!row.userId) {
      continue;
    }

    const existing = analyticsByUser.get(row.userId) ?? createZeroEventCounts();
    existing[row.eventType] = row._count._all;
    analyticsByUser.set(row.userId, existing);
  }
  return analyticsByUser;
}

function buildReactionTypesByUser(
  rows: Array<{
    userId: string | null;
    type: ReactionType;
    _count: { _all: number };
  }>,
) {
  const reactionTypesByUser = new Map<string, Record<ReactionType, number>>();
  for (const row of rows) {
    if (!row.userId) {
      continue;
    }
    const existing = reactionTypesByUser.get(row.userId) ?? createZeroReactionCounts();
    existing[row.type] = row._count._all;
    reactionTypesByUser.set(row.userId, existing);
  }
  return reactionTypesByUser;
}

function buildReactionScopesByUser(
  rows: Array<{
    userId: string | null;
    scope: ReactionScope;
    _count: { _all: number };
  }>,
) {
  const reactionScopesByUser = new Map<string, Record<ReactionScope, number>>();
  for (const row of rows) {
    if (!row.userId) {
      continue;
    }
    const existing = reactionScopesByUser.get(row.userId) ?? createZeroScopeCounts();
    existing[row.scope] = row._count._all;
    reactionScopesByUser.set(row.userId, existing);
  }
  return reactionScopesByUser;
}

export async function getAdminUserIntelligence(input: {
  query?: string;
  accessToken?: string | null;
}) {
  const query = input.query?.trim() ?? "";
  const users = await loadLocalUsers(query);
  const userIds = users.map((user) => user.id);
  const emails = users.map((user) => user.email);

  const [
    subscriptions,
    userOfferInboxItems,
    anonymousActivityRows,
    memberActivityRows,
    analyticsCounts,
    reactionTypeCounts,
    reactionScopeCounts,
    localRewardBalanceRows,
    registrationAttemptRows,
    localUserCount,
    wsApiUsers,
    wsApiWalletLinks,
    wsApiRewardReport,
  ] = await Promise.all([
    prisma.subscriptionEntitlement.findMany({
      where: {
        OR: [{ userExternalId: { in: userIds } }, { userEmail: { in: emails } }],
      },
      select: {
        id: true,
        userExternalId: true,
        userEmail: true,
        plan: true,
        status: true,
        currentPeriodEnd: true,
        syncedAt: true,
      },
    }),
    prisma.userOfferInbox.findMany({
      where: {
        OR: [{ userExternalId: { in: userIds } }, { userEmail: { in: emails } }],
      },
      orderBy: [{ assignedAt: "desc" }],
      select: {
        id: true,
        userExternalId: true,
        userEmail: true,
        status: true,
        assignedAt: true,
        seenAt: true,
        expiresAt: true,
        offer: {
          select: {
            id: true,
            title: true,
          },
        },
        business: {
          select: {
            slug: true,
            name: true,
          },
        },
      },
    }),
    prisma.analyticsEvent.findMany({
      where: {
        userId: null,
        OR: [{ sessionId: { not: null } }, { ipHash: { not: null } }],
      },
      orderBy: [{ createdAt: "desc" }],
      take: RECENT_ANONYMOUS_ACTIVITY_LIMIT,
      select: {
        id: true,
        eventType: true,
        sessionId: true,
        sourceContext: true,
        destinationUrl: true,
        referrerUrl: true,
        ipHash: true,
        userAgent: true,
        metadata: true,
        createdAt: true,
        article: {
          select: {
            slug: true,
            title: true,
          },
        },
        business: {
          select: {
            slug: true,
            name: true,
          },
        },
        offer: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    }),
    prisma.analyticsEvent.findMany({
      where: {
        userId: { not: null },
      },
      orderBy: [{ createdAt: "desc" }],
      take: RECENT_ANONYMOUS_ACTIVITY_LIMIT,
      select: {
        id: true,
        eventType: true,
        sessionId: true,
        sourceContext: true,
        destinationUrl: true,
        referrerUrl: true,
        metadata: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        article: {
          select: {
            slug: true,
            title: true,
          },
        },
        business: {
          select: {
            slug: true,
            name: true,
          },
        },
        offer: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["userId", "eventType"],
      where: {
        userId: { in: userIds },
      },
      _count: {
        _all: true,
      },
    }),
    prisma.reaction.groupBy({
      by: ["userId", "type"],
      where: {
        userId: { in: userIds },
      },
      _count: {
        _all: true,
      },
    }),
    prisma.reaction.groupBy({
      by: ["userId", "scope"],
      where: {
        userId: { in: userIds },
      },
      _count: {
        _all: true,
      },
    }),
    prisma.rewardLedger.groupBy({
      by: ["userId", "token", "direction"],
      where: {
        userId: { in: userIds },
      },
      _sum: {
        amount: true,
      },
    }),
    prisma.authRegistrationEvent.findMany({
      where: query
        ? {
            email: {
              contains: query,
              mode: "insensitive",
            },
          }
        : undefined,
      orderBy: [{ createdAt: "desc" }],
      take: RECENT_REGISTRATION_ATTEMPT_LIMIT,
      select: {
        id: true,
        userId: true,
        email: true,
        method: true,
        status: true,
        failureCode: true,
        failureMessage: true,
        createdAt: true,
      },
    }),
    prisma.user.count(),
    input.accessToken ? listWsApiUsers(input.accessToken).catch(() => null) : Promise.resolve(null),
    input.accessToken
      ? listWsApiWalletLinks(input.accessToken).catch(() => null)
      : Promise.resolve(null),
    input.accessToken
      ? getWsApiRewardReport(input.accessToken).catch(() => null)
      : Promise.resolve(null),
  ]);

  const subscriptionByUserId = new Map<string, (typeof subscriptions)[number]>();
  const subscriptionByEmail = new Map<string, (typeof subscriptions)[number]>();
  for (const subscription of subscriptions) {
    if (subscription.userExternalId) {
      subscriptionByUserId.set(subscription.userExternalId, subscription);
    }
    if (subscription.userEmail) {
      subscriptionByEmail.set(subscription.userEmail.toLowerCase(), subscription);
    }
  }

  const inboxByUser = new Map<string, typeof userOfferInboxItems>();
  for (const item of userOfferInboxItems) {
    const keys = [item.userExternalId, item.userEmail?.toLowerCase()].filter(Boolean) as string[];
    for (const key of keys) {
      const existing = inboxByUser.get(key) ?? [];
      existing.push(item);
      inboxByUser.set(key, existing);
    }
  }

  const analyticsByUser = buildAnalyticsByUser(analyticsCounts);
  const reactionTypesByUser = buildReactionTypesByUser(reactionTypeCounts);
  const reactionScopesByUser = buildReactionScopesByUser(reactionScopeCounts);

  const localRewardBalancesByUser = new Map<string, RewardBalanceMap>();
  for (const row of localRewardBalanceRows) {
    if (!row.userId) {
      continue;
    }
    const existing = localRewardBalancesByUser.get(row.userId) ?? {};
    addBalance(existing, row.token, toNumber(row._sum.amount), row.direction);
    localRewardBalancesByUser.set(row.userId, existing);
  }

  const registrationAttemptsByEmail = new Map<string, SerializedRegistrationAttempt[]>();
  const registrationAttemptsByUserId = new Map<string, SerializedRegistrationAttempt[]>();
  for (const event of registrationAttemptRows) {
    const serialized = buildSerializedRegistrationAttempt(event);

    if (event.email) {
      const key = event.email.toLowerCase();
      const existing = registrationAttemptsByEmail.get(key) ?? [];
      existing.push(serialized);
      registrationAttemptsByEmail.set(key, existing);
    }

    if (event.userId) {
      const existing = registrationAttemptsByUserId.get(event.userId) ?? [];
      existing.push(serialized);
      registrationAttemptsByUserId.set(event.userId, existing);
    }
  }

  const remoteRewardBalancesByUser = new Map<string, RewardBalanceMap>();
  for (const row of wsApiRewardReport?.byUser ?? []) {
    const existing = remoteRewardBalancesByUser.get(row.userId) ?? {};
    for (const [token, amount] of Object.entries(row.amountByToken ?? {})) {
      addBalance(existing, token, toNumber(amount));
    }
    remoteRewardBalancesByUser.set(row.userId, existing);
  }

  const walletByUserId = new Map<
    string,
    NonNullable<typeof wsApiWalletLinks>[number]
  >();
  for (const link of wsApiWalletLinks ?? []) {
    if (!walletByUserId.has(link.userId)) {
      walletByUserId.set(link.userId, link);
    }
  }

  const wsApiUserByEmail = new Map<string, WsApiIdentity>();
  for (const user of wsApiUsers ?? []) {
    wsApiUserByEmail.set(user.email.toLowerCase(), user);
  }

  const userPayload = users.map((user) =>
    buildUserPayloadRecord(user, {
      subscriptionByUserId,
      subscriptionByEmail,
      inboxByUser,
      analyticsByUser,
      reactionTypesByUser,
      reactionScopesByUser,
      localRewardBalancesByUser,
      remoteRewardBalancesByUser,
      registrationAttemptsByEmail,
      registrationAttemptsByUserId,
      walletByUserId,
      wsApiUserByEmail,
    }),
  );

  const localEmailSet = new Set(users.map((user) => user.email.toLowerCase()));
  const wsApiOnlyUsers = (wsApiUsers ?? []).filter(
    (user) => !localEmailSet.has(user.email.toLowerCase()),
  );
  const recentRegistrationAttempts = registrationAttemptRows.map(buildSerializedRegistrationAttempt);
  const recentRegistrationFailures = recentRegistrationAttempts.filter(
    (event) => event.status === "FAILURE",
  );

  return {
    generatedAt: new Date().toISOString(),
    query,
    preferenceCatalog: buildUserIntelligencePreferenceCatalog(),
    totals: {
      localUsers: localUserCount,
      usersInView: userPayload.length,
      anonymousEventsTracked: anonymousActivityRows.length,
      memberEventsTracked: memberActivityRows.length,
      registrationAttempts: recentRegistrationAttempts.length,
      registrationFailures: recentRegistrationFailures.length,
      wsApiUsers: wsApiUsers?.length ?? 0,
      wsApiOnlyUsers: wsApiOnlyUsers.length,
      linkedWallets: walletByUserId.size,
    },
    users: userPayload,
    wsApiOnlyUsers,
    recentRegistrationAttempts,
    recentRegistrationFailures,
    recentMemberActivity: memberActivityRows.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      sessionId: event.sessionId,
      path: parseEventPath(event),
      destinationUrl: event.destinationUrl,
      referrerUrl: event.referrerUrl,
      metadata: event.metadata,
      createdAt: event.createdAt.toISOString(),
      user: event.user,
      article: event.article,
      business: event.business,
      offer: event.offer,
    })),
    anonymousActivity: anonymousActivityRows.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      sessionId: event.sessionId,
      path: parseEventPath(event),
      destinationUrl: event.destinationUrl,
      referrerUrl: event.referrerUrl,
      ipHash: event.ipHash,
      userAgent: event.userAgent,
      metadata: event.metadata,
      createdAt: event.createdAt.toISOString(),
      article: event.article,
      business: event.business,
      offer: event.offer,
    })),
  };
}
