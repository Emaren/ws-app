type TokenTotals = {
  WHEAT: number;
  STONE: number;
};

type SupportedRewardToken = keyof TokenTotals;

export type MemberValueLocalUserInput = {
  id: string;
  email: string;
  name: string | null;
};

export type MemberValueWsUserInput = {
  id: string;
  email: string;
  name: string | null;
};

export type MemberValueWalletLinkInput = {
  userId: string;
  walletAddress: string;
  chainType: string;
  linkedAt: string | Date;
  lastVerifiedAt: string | Date | null;
};

export type MemberValueSubscriptionInput = {
  userExternalId: string | null;
  userEmail: string | null;
  plan: string;
  status: string;
  mismatchReason: string | null;
};

export type MemberValueRewardBalanceRowInput = {
  userId: string | null;
  token: string;
  direction: string;
  amount: number | string | null | undefined;
};

export type MemberValueRecentRewardInput = {
  id: string;
  token: string;
  direction: string;
  amount: number | string | null | undefined;
  reason: string;
  createdAt: string | Date;
  user: {
    email: string | null;
    name: string | null;
  } | null;
  business: {
    name: string | null;
  } | null;
};

export type MemberValueRemoteRewardReportInput = {
  summary?: {
    totalByToken?: Record<string, number>;
    pendingByToken?: Record<string, number>;
    exportedByToken?: Record<string, number>;
    paidByToken?: Record<string, number>;
  };
  byUser?: Array<{
    userId: string;
    amountByToken?: Record<string, number>;
  }>;
};

function createZeroTokenTotals(): TokenTotals {
  return {
    WHEAT: 0,
    STONE: 0,
  };
}

function normalizeToken(token: string | null | undefined): SupportedRewardToken | null {
  const normalized = (token ?? "").trim().toUpperCase();
  if (normalized === "WHEAT" || normalized === "STONE") {
    return normalized;
  }
  return null;
}

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toIso(value: string | Date | null | undefined): string | null {
  if (!value) {
    return null;
  }
  return typeof value === "string" ? value : value.toISOString();
}

function addTokenAmount(
  totals: TokenTotals,
  token: string | null | undefined,
  amount: number | string | null | undefined,
  direction?: string | null,
) {
  const normalizedToken = normalizeToken(token);
  if (!normalizedToken) {
    return;
  }

  const signedAmount = (direction ?? "").trim().toUpperCase() === "DEBIT" ? -toNumber(amount) : toNumber(amount);
  totals[normalizedToken] += signedAmount;
}

function tokenTotalsFromRecord(input: Record<string, number> | undefined): TokenTotals {
  const totals = createZeroTokenTotals();
  if (!input) {
    return totals;
  }

  for (const [token, amount] of Object.entries(input)) {
    addTokenAmount(totals, token, amount);
  }

  return totals;
}

function totalMagnitude(totals: TokenTotals): number {
  return Math.abs(totals.WHEAT) + Math.abs(totals.STONE);
}

export function buildMemberValueSnapshot(input: {
  generatedAt: string;
  accessTokenPresent: boolean;
  localUsers: MemberValueLocalUserInput[];
  wsUsers: MemberValueWsUserInput[];
  walletLinks: MemberValueWalletLinkInput[];
  walletError: string | null;
  subscriptions: MemberValueSubscriptionInput[];
  rewardBalanceRows: MemberValueRewardBalanceRowInput[];
  rewardEntriesTotal: number;
  rewardEntries7d: number;
  rewardedUsers: number;
  recentRewards: MemberValueRecentRewardInput[];
  remoteRewardReport: MemberValueRemoteRewardReportInput | null;
  remoteRewardError: string | null;
}) {
  const generatedAtMs = Date.parse(input.generatedAt);
  const now = Number.isFinite(generatedAtMs) ? generatedAtMs : Date.now();
  const walletUserIds = new Set(input.walletLinks.map((link) => link.userId));
  const verifiedWallets7d = input.walletLinks.filter((link) => {
    const lastVerifiedAt = toIso(link.lastVerifiedAt);
    if (!lastVerifiedAt) {
      return false;
    }

    const timestamp = Date.parse(lastVerifiedAt);
    return Number.isFinite(timestamp) && now - timestamp <= 7 * 24 * 60 * 60 * 1000;
  }).length;

  const wsUserIdByEmail = new Map<string, string>();
  for (const user of input.wsUsers) {
    wsUserIdByEmail.set(user.email.toLowerCase(), user.id);
  }

  const subscriptionByUserId = new Map<string, MemberValueSubscriptionInput>();
  const subscriptionByEmail = new Map<string, MemberValueSubscriptionInput>();
  for (const subscription of input.subscriptions) {
    if (subscription.userExternalId) {
      subscriptionByUserId.set(subscription.userExternalId, subscription);
    }
    if (subscription.userEmail) {
      subscriptionByEmail.set(subscription.userEmail.toLowerCase(), subscription);
    }
  }

  const localNetByUserId = new Map<string, TokenTotals>();
  const localNetTotals = createZeroTokenTotals();
  for (const row of input.rewardBalanceRows) {
    addTokenAmount(localNetTotals, row.token, row.amount, row.direction);
    if (!row.userId) {
      continue;
    }

    const existing = localNetByUserId.get(row.userId) ?? createZeroTokenTotals();
    addTokenAmount(existing, row.token, row.amount, row.direction);
    localNetByUserId.set(row.userId, existing);
  }

  const topMembers = input.localUsers
    .map((user) => {
      const localNet = localNetByUserId.get(user.id) ?? createZeroTokenTotals();
      const wsUserId = wsUserIdByEmail.get(user.email.toLowerCase()) ?? null;
      const walletLinked = walletUserIds.has(user.id) || (wsUserId ? walletUserIds.has(wsUserId) : false);
      const subscription =
        subscriptionByUserId.get(user.id) ?? subscriptionByEmail.get(user.email.toLowerCase()) ?? null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        walletLinked,
        subscription: subscription
          ? {
              plan: subscription.plan,
              status: subscription.status,
            }
          : null,
        localNet,
      };
    })
    .filter((member) => totalMagnitude(member.localNet) > 0)
    .sort((left, right) => {
      const amountDiff = totalMagnitude(right.localNet) - totalMagnitude(left.localNet);
      if (amountDiff !== 0) {
        return amountDiff;
      }
      return left.email.localeCompare(right.email);
    });

  const rewardedUsersWithoutWallet = topMembers.filter((member) => !member.walletLinked).length;

  const recentRewards = input.recentRewards.map((entry) => ({
    id: entry.id,
    email: entry.user?.email ?? null,
    name: entry.user?.name ?? null,
    token: normalizeToken(entry.token) ?? "WHEAT",
    direction: (entry.direction ?? "").trim().toUpperCase() === "DEBIT" ? "DEBIT" : "CREDIT",
    amount: toNumber(entry.amount),
    reason: entry.reason,
    businessName: entry.business?.name ?? null,
    createdAt: toIso(entry.createdAt),
  }));

  const activeSubscriptions = input.subscriptions.filter((subscription) => subscription.status === "ACTIVE").length;
  const trialingSubscriptions = input.subscriptions.filter((subscription) => subscription.status === "TRIALING").length;
  const pastDueSubscriptions = input.subscriptions.filter((subscription) => subscription.status === "PAST_DUE").length;
  const subscriptionMismatches = input.subscriptions.filter((subscription) =>
    Boolean(subscription.mismatchReason?.trim()),
  ).length;

  return {
    generatedAt: input.generatedAt,
    summary: {
      rewardEntriesTotal: input.rewardEntriesTotal,
      rewardEntries7d: input.rewardEntries7d,
      rewardedUsers: input.rewardedUsers,
      rewardedUsersWithoutWallet,
      linkedWallets: input.accessTokenPresent ? input.walletLinks.length : null,
      verifiedWallets7d: input.accessTokenPresent ? verifiedWallets7d : null,
      trackedSubscriptions: input.subscriptions.length,
      activeSubscriptions,
      trialingSubscriptions,
      pastDueSubscriptions,
      subscriptionMismatches,
    },
    localRewards: {
      netByToken: localNetTotals,
      recentRewards,
    },
    remoteRewards: {
      available: input.remoteRewardReport !== null && !input.remoteRewardError,
      usersInReport: input.remoteRewardReport?.byUser?.length ?? null,
      totalByToken: tokenTotalsFromRecord(input.remoteRewardReport?.summary?.totalByToken),
      pendingByToken: tokenTotalsFromRecord(input.remoteRewardReport?.summary?.pendingByToken),
      exportedByToken: tokenTotalsFromRecord(input.remoteRewardReport?.summary?.exportedByToken),
      paidByToken: tokenTotalsFromRecord(input.remoteRewardReport?.summary?.paidByToken),
      error: input.remoteRewardError,
    },
    wallets: {
      accessTokenPresent: input.accessTokenPresent,
      linkedCount: input.accessTokenPresent ? input.walletLinks.length : null,
      verified7dCount: input.accessTokenPresent ? verifiedWallets7d : null,
      error: input.walletError,
    },
    topMembers: topMembers.slice(0, 6),
  };
}
