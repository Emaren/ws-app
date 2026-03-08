import type {
  AnalyticsEventType,
  OfferInboxStatus,
  Prisma,
  ReactionScope,
  ReactionType,
  RewardDirection,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  SITE_SKIN_OPTIONS,
  SITE_VERSION_OPTIONS,
} from "@/lib/experiencePreferences";
import { getWsApiBaseUrl } from "@/lib/wsApiBaseUrl";
import {
  EXPERIENCE_HISTORY_LIMIT,
  resolveUserExperienceSnapshot,
  serializeExperienceHistory,
} from "@/lib/userExperience";
import { historyLabel } from "@/lib/userExperience";

const WS_API_TIMEOUT_MS = 10_000;
const RECENT_ACTIVITY_LIMIT = 18;
const RECENT_ANONYMOUS_ACTIVITY_LIMIT = 60;
const RECENT_REGISTRATION_ATTEMPT_LIMIT = 24;
const TRACKED_TOKEN_SYMBOLS = parseTrackedTokenSymbols();

type RewardBalanceMap = Record<string, number>;

type WsApiWalletLink = {
  userId: string;
  walletAddress: string;
  chainType: string;
  linkedAt: string;
  lastVerifiedAt: string;
};

type WsApiRewardReport = {
  byUser?: Array<{
    userId: string;
    amountByToken?: Record<string, number>;
  }>;
};

type LocalUserRow = Awaited<ReturnType<typeof loadLocalUsers>>[number];

function parseTrackedTokenSymbols(): string[] {
  const configured = (process.env.NEXT_PUBLIC_PROFILE_TOKEN_SYMBOLS || "")
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter((value) => /^[A-Z0-9_]{2,12}$/.test(value));

  return [...new Set(["WHEAT", "STONE", "TOKEN", ...configured])];
}

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function toNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  const numeric =
    typeof value === "object" && value !== null ? Number(String(value)) : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function ensureTrackedBalances(input: RewardBalanceMap): RewardBalanceMap {
  const next: RewardBalanceMap = {};

  for (const token of TRACKED_TOKEN_SYMBOLS) {
    next[token] = input[token] ?? 0;
  }

  for (const [token, amount] of Object.entries(input)) {
    if (!(token in next)) {
      next[token] = amount;
    }
  }

  return next;
}

function addBalance(
  balances: RewardBalanceMap,
  token: string | null | undefined,
  amount: number,
  direction?: RewardDirection,
) {
  if (!token) {
    return;
  }

  const normalizedToken = token.trim().toUpperCase();
  if (!normalizedToken) {
    return;
  }

  const signedAmount = direction === "DEBIT" ? -amount : amount;
  balances[normalizedToken] = (balances[normalizedToken] ?? 0) + signedAmount;
}

function parseEventPath(event: {
  sourceContext: string | null;
  metadata: Prisma.JsonValue | null;
  destinationUrl: string | null;
}): string | null {
  const metadata =
    event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
      ? (event.metadata as Record<string, unknown>)
      : null;
  const pagePath =
    typeof metadata?.pagePath === "string" && metadata.pagePath.trim()
      ? metadata.pagePath.trim()
      : null;

  return pagePath || event.sourceContext || event.destinationUrl || null;
}

async function fetchWsApiJson<T>(path: string, accessToken: string): Promise<T | null> {
  if (!accessToken) {
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WS_API_TIMEOUT_MS);

  try {
    const response = await fetch(`${getWsApiBaseUrl()}${path}`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json().catch(() => null)) as T | null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function loadLocalUsers(query: string) {
  const normalizedQuery = query.trim();
  const where = normalizedQuery
    ? {
        OR: [
          {
            email: {
              contains: normalizedQuery,
              mode: "insensitive" as const,
            },
          },
          {
            name: {
              contains: normalizedQuery,
              mode: "insensitive" as const,
            },
          },
        ],
      }
    : undefined;

  return prisma.user.findMany({
    where,
    orderBy: [{ registeredAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      registeredVia: true,
      registeredAt: true,
      lastAuthProvider: true,
      lastAuthAt: true,
      createdAt: true,
      updatedAt: true,
      experienceProfile: true,
      experienceHistory: {
        orderBy: [{ createdAt: "desc" }],
        take: EXPERIENCE_HISTORY_LIMIT,
      },
      articles: {
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        take: 6,
        select: {
          id: true,
          slug: true,
          title: true,
          status: true,
          publishedAt: true,
          createdAt: true,
        },
      },
      comments: {
        orderBy: [{ createdAt: "desc" }],
        take: 6,
        select: {
          id: true,
          body: true,
          createdAt: true,
          article: {
            select: {
              slug: true,
              title: true,
            },
          },
        },
      },
      reactions: {
        orderBy: [{ createdAt: "desc" }],
        take: 12,
        select: {
          id: true,
          type: true,
          scope: true,
          productSlug: true,
          createdAt: true,
          article: {
            select: {
              slug: true,
              title: true,
            },
          },
        },
      },
      analyticsEvents: {
        orderBy: [{ createdAt: "desc" }],
        take: RECENT_ACTIVITY_LIMIT,
        select: {
          id: true,
          eventType: true,
          sessionId: true,
          sourceContext: true,
          destinationUrl: true,
          referrerUrl: true,
          adSlot: true,
          channel: true,
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
          inventoryItem: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      rewardLedgerEntries: {
        orderBy: [{ createdAt: "desc" }],
        take: 12,
        select: {
          id: true,
          token: true,
          direction: true,
          amount: true,
          reason: true,
          createdAt: true,
          business: {
            select: {
              slug: true,
              name: true,
            },
          },
        },
      },
      savedProducts: {
        orderBy: [{ createdAt: "desc" }],
        take: 8,
        select: {
          id: true,
          createdAt: true,
          product: {
            select: {
              id: true,
              slug: true,
              name: true,
              category: true,
              summary: true,
            },
          },
        },
      },
      savedOffers: {
        orderBy: [{ createdAt: "desc" }],
        take: 8,
        select: {
          id: true,
          createdAt: true,
          offer: {
            select: {
              id: true,
              title: true,
              badgeText: true,
              discountPriceCents: true,
              business: {
                select: {
                  slug: true,
                  name: true,
                },
              },
              product: {
                select: {
                  slug: true,
                  name: true,
                },
              },
              inventoryItem: {
                select: {
                  product: {
                    select: {
                      slug: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      deliveryLeads: {
        orderBy: [{ updatedAt: "desc" }, { requestedAt: "desc" }],
        take: 8,
        select: {
          id: true,
          status: true,
          source: true,
          requestedQty: true,
          totalCents: true,
          requestedAt: true,
          updatedAt: true,
          business: {
            select: {
              slug: true,
              name: true,
            },
          },
          offer: {
            select: {
              title: true,
            },
          },
          inventoryItem: {
            select: {
              name: true,
            },
          },
        },
      },
      authRegistrationEvents: {
        orderBy: [{ createdAt: "desc" }],
        take: 8,
        select: {
          id: true,
          method: true,
          status: true,
          failureCode: true,
          failureMessage: true,
          createdAt: true,
        },
      },
      authFunnelEvents: {
        orderBy: [{ createdAt: "desc" }],
        take: 8,
        select: {
          id: true,
          stage: true,
          method: true,
          sourceContext: true,
          createdAt: true,
        },
      },
      businessesOwned: {
        orderBy: [{ createdAt: "desc" }],
        take: 6,
        select: {
          id: true,
          slug: true,
          name: true,
          status: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          articles: true,
          comments: true,
          reactions: true,
          analyticsEvents: true,
          rewardLedgerEntries: true,
          savedProducts: true,
          savedOffers: true,
          deliveryLeads: true,
          businessesOwned: true,
        },
      },
    },
  });
}

function serializeUserActivityEvent(event: LocalUserRow["analyticsEvents"][number]) {
  return {
    id: event.id,
    eventType: event.eventType,
    sessionId: event.sessionId,
    channel: event.channel,
    adSlot: event.adSlot,
    path: parseEventPath(event),
    destinationUrl: event.destinationUrl,
    referrerUrl: event.referrerUrl,
    article: event.article,
    business: event.business,
    offer: event.offer,
    inventoryItem: event.inventoryItem,
    metadata: event.metadata,
    createdAt: event.createdAt.toISOString(),
  };
}

function createZeroEventCounts() {
  return {
    PAGE_VIEW: 0,
    ARTICLE_VIEW: 0,
    AD_CLICK: 0,
    AFFILIATE_CLICK: 0,
    INVENTORY_CTA: 0,
    DELIVERY_CTA: 0,
    NOTIFICATION_OPT_IN: 0,
  } satisfies Record<AnalyticsEventType, number>;
}

function createZeroReactionCounts() {
  return {
    LIKE: 0,
    WOW: 0,
    HMM: 0,
  } satisfies Record<ReactionType, number>;
}

function createZeroScopeCounts() {
  return {
    ARTICLE: 0,
    PRODUCT: 0,
  } satisfies Record<ReactionScope, number>;
}

function createZeroInboxCounts() {
  return {
    ACTIVE: 0,
    SEEN: 0,
    REDEEMED: 0,
    EXPIRED: 0,
    ARCHIVED: 0,
  } satisfies Record<OfferInboxStatus, number>;
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
        OR: [
          { userExternalId: { in: userIds } },
          { userEmail: { in: emails } },
        ],
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
        OR: [
          { userExternalId: { in: userIds } },
          { userEmail: { in: emails } },
        ],
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
    fetchWsApiJson<Array<{ id: string; email: string; name: string; role: string }>>(
      "/users",
      input.accessToken ?? "",
    ),
    fetchWsApiJson<WsApiWalletLink[]>("/ops/wallet-links", input.accessToken ?? ""),
    fetchWsApiJson<WsApiRewardReport>("/rewards/report", input.accessToken ?? ""),
  ]);

  const subscriptionByUserId = new Map<
    string,
    (typeof subscriptions)[number]
  >();
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

  const analyticsByUser = new Map<string, Record<AnalyticsEventType, number>>();
  for (const row of analyticsCounts) {
    if (!row.userId) {
      continue;
    }

    const existing = analyticsByUser.get(row.userId) ?? createZeroEventCounts();
    existing[row.eventType] = row._count._all;
    analyticsByUser.set(row.userId, existing);
  }

  const reactionTypesByUser = new Map<string, Record<ReactionType, number>>();
  for (const row of reactionTypeCounts) {
    if (!row.userId) {
      continue;
    }
    const existing = reactionTypesByUser.get(row.userId) ?? createZeroReactionCounts();
    existing[row.type] = row._count._all;
    reactionTypesByUser.set(row.userId, existing);
  }

  const reactionScopesByUser = new Map<string, Record<ReactionScope, number>>();
  for (const row of reactionScopeCounts) {
    if (!row.userId) {
      continue;
    }
    const existing = reactionScopesByUser.get(row.userId) ?? createZeroScopeCounts();
    existing[row.scope] = row._count._all;
    reactionScopesByUser.set(row.userId, existing);
  }

  const localRewardBalancesByUser = new Map<string, RewardBalanceMap>();
  for (const row of localRewardBalanceRows) {
    if (!row.userId) {
      continue;
    }
    const existing = localRewardBalancesByUser.get(row.userId) ?? {};
    addBalance(
      existing,
      row.token,
      toNumber(row._sum.amount),
      row.direction,
    );
    localRewardBalancesByUser.set(row.userId, existing);
  }

  const registrationAttemptsByEmail = new Map<
    string,
    Array<{
      id: string;
      userId: string | null;
      email: string | null;
      method: string;
      status: string;
      failureCode: string | null;
      failureMessage: string | null;
      createdAt: string;
    }>
  >();
  const registrationAttemptsByUserId = new Map<
    string,
    Array<{
      id: string;
      userId: string | null;
      email: string | null;
      method: string;
      status: string;
      failureCode: string | null;
      failureMessage: string | null;
      createdAt: string;
    }>
  >();
  for (const event of registrationAttemptRows) {
    const serialized = {
      id: event.id,
      userId: event.userId,
      email: event.email,
      method: event.method,
      status: event.status,
      failureCode: event.failureCode,
      failureMessage: event.failureMessage,
      createdAt: event.createdAt.toISOString(),
    };

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

  const walletByUserId = new Map<string, WsApiWalletLink>();
  for (const link of wsApiWalletLinks ?? []) {
    if (!walletByUserId.has(link.userId)) {
      walletByUserId.set(link.userId, link);
    }
  }

  const wsApiUserByEmail = new Map<string, { id: string; email: string; name: string; role: string }>();
  for (const user of wsApiUsers ?? []) {
    wsApiUserByEmail.set(user.email.toLowerCase(), user);
  }

  const userPayload = users.map((user) => {
    const experience = resolveUserExperienceSnapshot(user.experienceProfile ?? {});
    const inboxItems =
      inboxByUser.get(user.id) ?? inboxByUser.get(user.email.toLowerCase()) ?? [];
    const inboxCounts = createZeroInboxCounts();
    for (const item of inboxItems) {
      inboxCounts[item.status] += 1;
    }

    const localBalances = localRewardBalancesByUser.get(user.id) ?? {};
    const remoteBalances = remoteRewardBalancesByUser.get(user.id) ?? {};
    const mergedBalanceMap: RewardBalanceMap = {};
    for (const [token, amount] of Object.entries(localBalances)) {
      addBalance(mergedBalanceMap, token, amount);
    }
    for (const [token, amount] of Object.entries(remoteBalances)) {
      addBalance(mergedBalanceMap, token, amount);
    }
    const mergedBalances = ensureTrackedBalances(mergedBalanceMap);

    const subscription =
      subscriptionByUserId.get(user.id) ??
      subscriptionByEmail.get(user.email.toLowerCase()) ??
      null;
    const registrationHistory = [
      ...user.authRegistrationEvents.map((event) => ({
        id: event.id,
        userId: user.id,
        email: user.email,
        method: event.method,
        status: event.status,
        failureCode: event.failureCode,
        failureMessage: event.failureMessage,
        createdAt: event.createdAt.toISOString(),
      })),
      ...(registrationAttemptsByUserId.get(user.id) ?? []),
      ...(registrationAttemptsByEmail.get(user.email.toLowerCase()) ?? []),
    ]
      .filter(
        (event, index, array) => array.findIndex((candidate) => candidate.id === event.id) === index,
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 12);
    const wsApiIdentity = wsApiUserByEmail.get(user.email.toLowerCase()) ?? null;
    const wallet = walletByUserId.get(user.id) ?? (wsApiIdentity ? walletByUserId.get(wsApiIdentity.id) ?? null : null);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      registeredVia: user.registeredVia,
      registeredAt: user.registeredAt.toISOString(),
      lastAuthProvider: user.lastAuthProvider,
      lastAuthAt: toIso(user.lastAuthAt),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      experience: {
        ...experience,
        history: serializeExperienceHistory(user.experienceHistory),
      },
      wsApiIdentity: wsApiIdentity
        ? {
            id: wsApiIdentity.id,
            role: wsApiIdentity.role,
          }
        : null,
      wallet: wallet
        ? {
            walletAddress: wallet.walletAddress,
            chainType: wallet.chainType,
            linkedAt: wallet.linkedAt,
            lastVerifiedAt: wallet.lastVerifiedAt,
          }
        : null,
      balances: mergedBalances,
      subscription: subscription
        ? {
            id: subscription.id,
            plan: subscription.plan,
            status: subscription.status,
            currentPeriodEnd: toIso(subscription.currentPeriodEnd),
            syncedAt: toIso(subscription.syncedAt),
          }
        : null,
      statusFlags: {
        isContributor:
          user.role === "CONTRIBUTOR" || user._count.articles > 0,
        ownsBusinesses: user._count.businessesOwned > 0,
        hasWalletLinked: Boolean(wallet),
        hasPremium:
          subscription?.status === "ACTIVE" || subscription?.status === "TRIALING",
      },
      counts: {
        articles: user._count.articles,
        comments: user._count.comments,
        reactions: user._count.reactions,
        analyticsEvents: user._count.analyticsEvents,
        rewardEntries: user._count.rewardLedgerEntries,
        savedProducts: user._count.savedProducts,
        savedOffers: user._count.savedOffers,
        deliveryLeads: user._count.deliveryLeads,
        businessesOwned: user._count.businessesOwned,
        offerInbox: inboxItems.length,
      },
      analyticsSummary: analyticsByUser.get(user.id) ?? createZeroEventCounts(),
      reactionSummary: {
        byType: reactionTypesByUser.get(user.id) ?? createZeroReactionCounts(),
        byScope: reactionScopesByUser.get(user.id) ?? createZeroScopeCounts(),
      },
      authoredArticles: user.articles.map((article) => ({
        ...article,
        publishedAt: toIso(article.publishedAt),
        createdAt: article.createdAt.toISOString(),
      })),
      recentComments: user.comments.map((comment) => ({
        id: comment.id,
        body: comment.body,
        createdAt: comment.createdAt.toISOString(),
        article: comment.article,
      })),
      savedProducts: user.savedProducts.map((saved) => ({
        id: saved.id,
        createdAt: saved.createdAt.toISOString(),
        product: saved.product,
      })),
      savedOffers: user.savedOffers.map((saved) => ({
        id: saved.id,
        createdAt: saved.createdAt.toISOString(),
        offer: {
          ...saved.offer,
          product:
            saved.offer.product ?? saved.offer.inventoryItem?.product ?? null,
        },
      })),
      recentReactions: user.reactions.map((reaction) => ({
        id: reaction.id,
        type: reaction.type,
        scope: reaction.scope,
        productSlug: reaction.productSlug,
        createdAt: reaction.createdAt.toISOString(),
        article: reaction.article,
      })),
      recentAnalytics: user.analyticsEvents.map(serializeUserActivityEvent),
      recentRewards: user.rewardLedgerEntries.map((entry) => ({
        id: entry.id,
        token: entry.token,
        direction: entry.direction,
        amount: toNumber(entry.amount),
        reason: entry.reason,
        createdAt: entry.createdAt.toISOString(),
        business: entry.business,
      })),
      recentDeliveryLeads: user.deliveryLeads.map((lead) => ({
        id: lead.id,
        status: lead.status,
        source: lead.source,
        requestedQty: lead.requestedQty,
        totalCents: lead.totalCents,
        requestedAt: lead.requestedAt.toISOString(),
        updatedAt: lead.updatedAt.toISOString(),
        business: lead.business,
        offer: lead.offer,
        inventoryItem: lead.inventoryItem,
      })),
      authHistory: {
        registrations: registrationHistory,
        funnel: user.authFunnelEvents.map((event) => ({
          id: event.id,
          stage: event.stage,
          method: event.method,
          sourceContext: event.sourceContext,
          createdAt: event.createdAt.toISOString(),
        })),
      },
      businessesOwned: user.businessesOwned.map((business) => ({
        ...business,
        createdAt: business.createdAt.toISOString(),
      })),
      offerInbox: {
        counts: inboxCounts,
        recent: inboxItems.slice(0, 8).map((item) => ({
          id: item.id,
          status: item.status,
          assignedAt: item.assignedAt.toISOString(),
          seenAt: toIso(item.seenAt),
          expiresAt: toIso(item.expiresAt),
          offer: item.offer,
          business: item.business,
        })),
      },
    };
  });

  const localEmailSet = new Set(users.map((user) => user.email.toLowerCase()));
  const wsApiOnlyUsers = (wsApiUsers ?? []).filter(
    (user) => !localEmailSet.has(user.email.toLowerCase()),
  );
  const recentRegistrationAttempts = registrationAttemptRows.map((event) => ({
    id: event.id,
    userId: event.userId,
    email: event.email,
    method: event.method,
    status: event.status,
    failureCode: event.failureCode,
    failureMessage: event.failureMessage,
    createdAt: event.createdAt.toISOString(),
  }));
  const recentRegistrationFailures = recentRegistrationAttempts.filter(
    (event) => event.status === "FAILURE",
  );

  return {
    generatedAt: new Date().toISOString(),
    query,
    preferenceCatalog: {
      themes: ["gray", "dark", "light", "sepia", "rugged"],
      skins: SITE_SKIN_OPTIONS,
      siteVersions: SITE_VERSION_OPTIONS,
      trackedTokens: TRACKED_TOKEN_SYMBOLS,
      historyLabels: {
        theme: historyLabel("theme"),
        skin: historyLabel("skin"),
        siteVersion: historyLabel("siteVersion"),
      },
    },
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
