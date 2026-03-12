import type {
  AnalyticsEventType,
  OfferInboxStatus,
  Prisma,
  ReactionScope,
  ReactionType,
  RewardDirection,
} from "@prisma/client";
import {
  SITE_SKIN_OPTIONS,
  SITE_VERSION_OPTIONS,
} from "@/lib/experiencePreferences";
import type { WsApiWalletLink } from "@/lib/wsApiClient";
import {
  historyLabel,
  resolveUserExperienceSnapshot,
  serializeExperienceHistory,
} from "@/lib/userExperience";
import type { LocalUserRow } from "./adminUserIntelligenceQuery";

export const RECENT_ANONYMOUS_ACTIVITY_LIMIT = 60;
export const RECENT_REGISTRATION_ATTEMPT_LIMIT = 24;
export const TRACKED_TOKEN_SYMBOLS = parseTrackedTokenSymbols(
  process.env.NEXT_PUBLIC_PROFILE_TOKEN_SYMBOLS,
);

export type RewardBalanceMap = Record<string, number>;

export type SerializedRegistrationAttempt = {
  id: string;
  userId: string | null;
  email: string | null;
  method: string;
  status: string;
  failureCode: string | null;
  failureMessage: string | null;
  createdAt: string;
};

export type WsApiIdentity = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export type UserIntelligenceBuildContext = {
  subscriptionByUserId: Map<
    string,
    {
      id: string;
      userExternalId: string | null;
      userEmail: string | null;
      plan: string;
      status: string;
      currentPeriodEnd: Date | null;
      syncedAt: Date | null;
    }
  >;
  subscriptionByEmail: Map<
    string,
    {
      id: string;
      userExternalId: string | null;
      userEmail: string | null;
      plan: string;
      status: string;
      currentPeriodEnd: Date | null;
      syncedAt: Date | null;
    }
  >;
  inboxByUser: Map<
    string,
    Array<{
      id: string;
      status: OfferInboxStatus;
      assignedAt: Date;
      seenAt: Date | null;
      expiresAt: Date | null;
      offer: {
        id: string;
        title: string;
      };
      business: {
        slug: string;
        name: string;
      };
    }>
  >;
  analyticsByUser: Map<string, Record<AnalyticsEventType, number>>;
  reactionTypesByUser: Map<string, Record<ReactionType, number>>;
  reactionScopesByUser: Map<string, Record<ReactionScope, number>>;
  localRewardBalancesByUser: Map<string, RewardBalanceMap>;
  remoteRewardBalancesByUser: Map<string, RewardBalanceMap>;
  registrationAttemptsByEmail: Map<string, SerializedRegistrationAttempt[]>;
  registrationAttemptsByUserId: Map<string, SerializedRegistrationAttempt[]>;
  walletByUserId: Map<string, WsApiWalletLink>;
  wsApiUserByEmail: Map<string, WsApiIdentity>;
};

export function parseTrackedTokenSymbols(configuredValue: string | undefined): string[] {
  const configured = (configuredValue || "")
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter((value) => /^[A-Z0-9_]{2,12}$/.test(value));

  return [...new Set(["WHEAT", "STONE", "TOKEN", ...configured])];
}

export function buildUserIntelligencePreferenceCatalog() {
  return {
    themes: ["black", "grey", "white", "sepia", "walnut", "crimson", "midnight"],
    skins: SITE_SKIN_OPTIONS,
    siteVersions: SITE_VERSION_OPTIONS,
    trackedTokens: TRACKED_TOKEN_SYMBOLS,
    historyLabels: {
      theme: historyLabel("theme"),
      skin: historyLabel("layout"),
      siteVersion: historyLabel("edition"),
    },
  };
}

export function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

export function toNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  const numeric =
    typeof value === "object" && value !== null ? Number(String(value)) : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function ensureTrackedBalances(input: RewardBalanceMap): RewardBalanceMap {
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

export function addBalance(
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

export function mergeTrackedBalances(
  localBalances: RewardBalanceMap,
  remoteBalances: RewardBalanceMap,
): RewardBalanceMap {
  const mergedBalanceMap: RewardBalanceMap = {};
  for (const [token, amount] of Object.entries(localBalances)) {
    addBalance(mergedBalanceMap, token, amount);
  }
  for (const [token, amount] of Object.entries(remoteBalances)) {
    addBalance(mergedBalanceMap, token, amount);
  }
  return ensureTrackedBalances(mergedBalanceMap);
}

export function parseEventPath(event: {
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

export function serializeUserActivityEvent(event: LocalUserRow["analyticsEvents"][number]) {
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

export function createZeroEventCounts() {
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

export function createZeroReactionCounts() {
  return {
    LIKE: 0,
    WOW: 0,
    HMM: 0,
  } satisfies Record<ReactionType, number>;
}

export function createZeroScopeCounts() {
  return {
    ARTICLE: 0,
    PRODUCT: 0,
  } satisfies Record<ReactionScope, number>;
}

export function createZeroInboxCounts() {
  return {
    ACTIVE: 0,
    SEEN: 0,
    REDEEMED: 0,
    EXPIRED: 0,
    ARCHIVED: 0,
  } satisfies Record<OfferInboxStatus, number>;
}

export function buildSerializedRegistrationAttempt(event: {
  id: string;
  userId: string | null;
  email: string | null;
  method: string;
  status: string;
  failureCode: string | null;
  failureMessage: string | null;
  createdAt: Date;
}): SerializedRegistrationAttempt {
  return {
    id: event.id,
    userId: event.userId,
    email: event.email,
    method: event.method,
    status: event.status,
    failureCode: event.failureCode,
    failureMessage: event.failureMessage,
    createdAt: event.createdAt.toISOString(),
  };
}

export function buildRegistrationHistory(
  user: LocalUserRow,
  registrationAttemptsByUserId: Map<string, SerializedRegistrationAttempt[]>,
  registrationAttemptsByEmail: Map<string, SerializedRegistrationAttempt[]>,
): SerializedRegistrationAttempt[] {
  return [
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
}

export function buildUserPayloadRecord(
  user: LocalUserRow,
  context: UserIntelligenceBuildContext,
) {
  const experience = resolveUserExperienceSnapshot(user.experienceProfile ?? {});
  const inboxItems =
    context.inboxByUser.get(user.id) ?? context.inboxByUser.get(user.email.toLowerCase()) ?? [];
  const inboxCounts = createZeroInboxCounts();
  for (const item of inboxItems) {
    inboxCounts[item.status] += 1;
  }

  const wsApiIdentity = context.wsApiUserByEmail.get(user.email.toLowerCase()) ?? null;
  const wallet =
    context.walletByUserId.get(user.id) ??
    (wsApiIdentity ? context.walletByUserId.get(wsApiIdentity.id) ?? null : null);

  const subscription =
    context.subscriptionByUserId.get(user.id) ??
    context.subscriptionByEmail.get(user.email.toLowerCase()) ??
    null;

  const mergedBalances = mergeTrackedBalances(
    context.localRewardBalancesByUser.get(user.id) ?? {},
    context.remoteRewardBalancesByUser.get(user.id) ?? {},
  );

  const registrationHistory = buildRegistrationHistory(
    user,
    context.registrationAttemptsByUserId,
    context.registrationAttemptsByEmail,
  );

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
      isContributor: user.role === "CONTRIBUTOR" || user._count.articles > 0,
      ownsBusinesses: user._count.businessesOwned > 0,
      hasWalletLinked: Boolean(wallet),
      hasPremium: subscription?.status === "ACTIVE" || subscription?.status === "TRIALING",
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
    analyticsSummary: context.analyticsByUser.get(user.id) ?? createZeroEventCounts(),
    reactionSummary: {
      byType: context.reactionTypesByUser.get(user.id) ?? createZeroReactionCounts(),
      byScope: context.reactionScopesByUser.get(user.id) ?? createZeroScopeCounts(),
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
        product: saved.offer.product ?? saved.offer.inventoryItem?.product ?? null,
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
}
