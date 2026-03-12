import type { BuildMeta } from "@/lib/buildMeta";
import {
  buildBusinessPerformanceRadarSnapshot,
  type BusinessPerformanceRadarBusinessInput,
  type BusinessPerformanceRadarInventoryInput,
  type BusinessPerformanceRadarLeadInput,
  type BusinessPerformanceRadarOfferInput,
  type BusinessPerformanceRadarRewardInput,
} from "@/lib/businessPerformanceRadar";
import {
  buildMemberValueSnapshot,
  type MemberValueLocalUserInput,
  type MemberValueRecentRewardInput,
  type MemberValueRewardBalanceRowInput,
  type MemberValueSubscriptionInput,
  type MemberValueWsUserInput,
} from "@/lib/memberValueSnapshot";
import {
  buildNotificationCommandCenterSnapshot,
  type NotificationAuditLogInput,
  type NotificationJobInput,
} from "@/lib/notificationCommandCenter";
import {
  buildOperationsCommandCenterSnapshot,
  type OperationsAccountRescueRunInput,
  type OperationsFulfillmentRunInput,
  type OperationsIdentityRunInput,
  type OperationsPasswordResetDispatchInput,
  type OperationsPublicProbeInput,
  type OperationsSavedMatchAssignmentInput,
} from "@/lib/operationsCommandCenter";
import { prisma } from "@/lib/prisma";
import type { TmailSnapshot } from "@/lib/tmailDiagnostics";
import type {
  IdentityLiveSnapshot,
  WsApiRewardReport,
  WsApiSnapshot,
  WsApiWalletLink,
} from "@/lib/wsApiControlTowerSnapshot";

type MemberValueSnapshot = ReturnType<typeof buildMemberValueSnapshot>;
type NotificationSnapshot = ReturnType<typeof buildNotificationCommandCenterSnapshot>;
type OperationsSnapshot = ReturnType<typeof buildOperationsCommandCenterSnapshot>;
type BusinessRadarSnapshot = ReturnType<typeof buildBusinessPerformanceRadarSnapshot>;

export type BuilderFeedStatus = "good" | "info" | "warn";

export type BuilderFeedItem = {
  id: string;
  category: string;
  status: BuilderFeedStatus;
  title: string;
  summary: string;
  detail: string | null;
  createdAt: string | null;
};

export type ControlTowerSectionDiagnostic = {
  id: string;
  label: string;
  status: BuilderFeedStatus;
  summary: string;
  detail: string | null;
  updatedAt: string | null;
};

type PulseSnapshot = {
  configured: boolean;
  webBaseUrl: string | null;
  apiBaseUrl: string | null;
  projectSlug: string | null;
  internalTokenConfigured: boolean;
  reachable: boolean;
  status: string | null;
  checkedAt: string | null;
  error: string | null;
};

type LatestIdentityRun = {
  id: string;
  scannedCount: number;
  roleMismatchAfter: number;
  localOnlyCount: number;
  wsApiOnlyCount: number;
  wsApiRoleUpdated: number;
  createdAt: Date;
};

type LatestPublicProbeRun = {
  id: string;
  homeStatus: number | null;
  hasOgImage: boolean;
  hasTwitterCard: boolean;
  hasSummaryLargeImage: boolean;
  createdAt: Date;
};

type LatestFulfillmentRun = {
  id: string;
  source: string;
  status: string;
  openLeadCount: number;
  autoAssignedCount: number;
  overdueLeadCount: number;
  unassignedLeadCount: number;
  digestQueued: boolean;
  business: {
    name: string;
  };
  startedAt: Date;
};

type LatestSavedMatchAssignment = {
  id: string;
  status: string;
  assignedAt: Date;
  userEmail: string;
  offer: {
    title: string;
  };
  business: {
    name: string;
  };
};

type NewestUser = {
  id: string;
  email: string;
  registeredVia: string;
  registeredAt: Date;
  lastAuthAt: Date | null;
};

function toIsoString(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return typeof value === "string" ? value : value.toISOString();
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const numeric = Number(String(value));
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatMetricNumber(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "n/a";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

function buildFeedItem(input: {
  id: string;
  category: string;
  status: BuilderFeedStatus;
  title: string;
  summary: string;
  detail?: string | null;
  createdAt?: string | null;
}): BuilderFeedItem {
  return {
    id: input.id,
    category: input.category,
    status: input.status,
    title: input.title,
    summary: input.summary,
    detail: input.detail ?? null,
    createdAt: input.createdAt ?? null,
  };
}

function sortFeedItems(items: BuilderFeedItem[]): BuilderFeedItem[] {
  return items.slice().sort((left, right) => {
    const leftTs = left.createdAt ? Date.parse(left.createdAt) : 0;
    const rightTs = right.createdAt ? Date.parse(right.createdAt) : 0;
    return rightTs - leftTs;
  });
}

export function buildControlTowerSectionDiagnostics(input: {
  memberValueSnapshot: MemberValueSnapshot;
  notificationSnapshot: NotificationSnapshot;
  operationsSnapshot: OperationsSnapshot;
  businessRadarSnapshot: BusinessRadarSnapshot;
}): ControlTowerSectionDiagnostic[] {
  const diagnostics: ControlTowerSectionDiagnostic[] = [];

  const memberNeedsAttention =
    input.memberValueSnapshot.wallets.error ||
    input.memberValueSnapshot.remoteRewards.error ||
    input.memberValueSnapshot.summary.subscriptionMismatches > 0 ||
    input.memberValueSnapshot.summary.rewardedUsersWithoutWallet > 0;
  diagnostics.push({
    id: "member-value",
    label: "Member Value",
    status: memberNeedsAttention ? "warn" : "good",
    summary: `${input.memberValueSnapshot.summary.activeSubscriptions + input.memberValueSnapshot.summary.trialingSubscriptions} premium members, ${input.memberValueSnapshot.summary.linkedWallets ?? 0} linked wallets, ${input.memberValueSnapshot.summary.rewardEntries7d} reward entries in 7 days.`,
    detail:
      input.memberValueSnapshot.wallets.error ??
      input.memberValueSnapshot.remoteRewards.error ??
      `Subscription mismatches ${input.memberValueSnapshot.summary.subscriptionMismatches} · rewarded users without wallets ${input.memberValueSnapshot.summary.rewardedUsersWithoutWallet}.`,
    updatedAt: input.memberValueSnapshot.generatedAt,
  });

  const notificationNeedsAttention =
    !input.notificationSnapshot.available ||
    input.notificationSnapshot.summary.failed > 0 ||
    input.notificationSnapshot.summary.retrying > 0 ||
    input.notificationSnapshot.summary.overdue > 0;
  diagnostics.push({
    id: "notifications",
    label: "Notifications",
    status: notificationNeedsAttention
      ? "warn"
      : input.notificationSnapshot.summary.totalJobs > 0
        ? "good"
        : "info",
    summary: `${input.notificationSnapshot.summary.totalJobs} jobs tracked · ${input.notificationSnapshot.summary.sent} sent · ${input.notificationSnapshot.summary.failed} failed.`,
    detail:
      input.notificationSnapshot.error ??
      `Queued ${input.notificationSnapshot.summary.queued} · retrying ${input.notificationSnapshot.summary.retrying} · overdue ${input.notificationSnapshot.summary.overdue}.`,
    updatedAt: input.notificationSnapshot.generatedAt,
  });

  diagnostics.push({
    id: "operations",
    label: "Operations",
    status:
      input.operationsSnapshot.summary.attentionSignals > 0 ? "warn" : "good",
    summary: `${input.operationsSnapshot.summary.totalSignals} recent events visible · ${input.operationsSnapshot.summary.attentionSignals} need attention.`,
    detail: `Automation ${input.operationsSnapshot.summary.automationSignals} · notifications ${input.operationsSnapshot.summary.notificationSignals} · support ${input.operationsSnapshot.summary.supportSignals}.`,
    updatedAt:
      input.operationsSnapshot.recentEvents[0]?.occurredAt ??
      input.operationsSnapshot.generatedAt,
  });

  diagnostics.push({
    id: "business-radar",
    label: "Business Radar",
    status:
      input.businessRadarSnapshot.summary.businessesNeedingAttention > 0
        ? "warn"
        : "good",
    summary: `${input.businessRadarSnapshot.summary.businessCount} businesses tracked · ${input.businessRadarSnapshot.summary.liveOfferCount} live offers · ${input.businessRadarSnapshot.summary.leadCount} leads.`,
    detail: `Attention on ${input.businessRadarSnapshot.summary.businessesNeedingAttention} businesses · low stock ${input.businessRadarSnapshot.summary.lowStockCount} · failed notifications ${input.businessRadarSnapshot.summary.notificationFailedCount}.`,
    updatedAt: input.businessRadarSnapshot.generatedAt,
  });

  return diagnostics;
}

export async function loadAdminControlTowerSections(input: {
  generatedAt: string;
  accessTokenPresent: boolean;
  localUsers: MemberValueLocalUserInput[];
  wsUsers: MemberValueWsUserInput[];
  walletLinks: WsApiWalletLink[];
  walletError: string | null;
  subscriptions: MemberValueSubscriptionInput[];
  rewardBalanceRows: Array<{
    userId: string | null;
    token: string;
    direction: string;
    _sum: {
      amount: unknown;
    };
  }>;
  rewardEntriesTotal: number;
  rewardEntries7d: number;
  rewardedUsers: number;
  recentRewards: Array<{
    id: string;
    token: string;
    direction: string;
    amount: unknown;
    reason: string;
    createdAt: Date;
    user: {
      email: string | null;
      name: string | null;
    } | null;
    business: {
      name: string | null;
    } | null;
  }>;
  remoteRewardReport: WsApiRewardReport | null;
  remoteRewardError: string | null;
  notificationJobs: NotificationJobInput[];
  notificationAuditLogs: NotificationAuditLogInput[];
  notificationError: string | null;
  recentFulfillmentRuns: OperationsFulfillmentRunInput[];
  recentSavedMatchAssignments: OperationsSavedMatchAssignmentInput[];
  recentIdentityRuns: OperationsIdentityRunInput[];
  recentPublicProbeRuns: OperationsPublicProbeInput[];
  recentAccountRescueRuns: OperationsAccountRescueRunInput[];
  passwordResetRecentDispatches: OperationsPasswordResetDispatchInput[];
  businessRadarBusinesses: BusinessPerformanceRadarBusinessInput[];
  businessRadarInventoryItems: BusinessPerformanceRadarInventoryInput[];
  businessRadarOffers: BusinessPerformanceRadarOfferInput[];
  businessRadarLeads30d: BusinessPerformanceRadarLeadInput[];
  businessRadarRewards30d: Array<{
    businessId: string | null;
    token: "WHEAT" | "STONE";
    direction: "CREDIT" | "DEBIT";
    amount: unknown;
  }>;
}) {
  const memberValueSnapshot = buildMemberValueSnapshot({
    generatedAt: input.generatedAt,
    accessTokenPresent: input.accessTokenPresent,
    localUsers: input.localUsers,
    wsUsers: input.wsUsers,
    walletLinks: input.walletLinks,
    walletError: input.walletError,
    subscriptions: input.subscriptions,
    rewardBalanceRows: input.rewardBalanceRows.map(
      (row): MemberValueRewardBalanceRowInput => ({
        userId: row.userId,
        token: row.token,
        direction: row.direction,
        amount: toNumber(row._sum.amount),
      }),
    ),
    rewardEntriesTotal: input.rewardEntriesTotal,
    rewardEntries7d: input.rewardEntries7d,
    rewardedUsers: input.rewardedUsers,
    recentRewards: input.recentRewards.map(
      (entry): MemberValueRecentRewardInput => ({
        id: entry.id,
        token: entry.token,
        direction: entry.direction,
        amount: toNumber(entry.amount),
        reason: entry.reason,
        createdAt: entry.createdAt,
        user: entry.user,
        business: entry.business,
      }),
    ),
    remoteRewardReport: input.remoteRewardReport,
    remoteRewardError: input.remoteRewardError,
  });

  const notificationBusinessIds = [
    ...new Set(input.notificationJobs.map((job) => job.businessId)),
  ];
  const notificationBusinesses =
    notificationBusinessIds.length > 0
      ? await prisma.business.findMany({
          where: {
            id: {
              in: notificationBusinessIds,
            },
          },
          select: {
            id: true,
            name: true,
          },
        })
      : [];
  const notificationBusinessNameById = Object.fromEntries(
    notificationBusinesses.map((business) => [business.id, business.name]),
  );
  const notificationSnapshot = buildNotificationCommandCenterSnapshot({
    generatedAt: input.generatedAt,
    accessTokenPresent: input.accessTokenPresent,
    jobs: input.notificationJobs,
    auditLogs: input.notificationAuditLogs,
    businessNameById: notificationBusinessNameById,
    error: input.notificationError,
  });

  const operationsSnapshot = buildOperationsCommandCenterSnapshot({
    generatedAt: input.generatedAt,
    fulfillmentRuns: input.recentFulfillmentRuns.map((run) => ({
      ...run,
      completedAt: toIsoString(run.completedAt),
    })),
    savedMatchAssignments: input.recentSavedMatchAssignments,
    notificationAuditLogs: input.notificationAuditLogs,
    identityRuns: input.recentIdentityRuns,
    publicProbes: input.recentPublicProbeRuns,
    accountRescues: input.recentAccountRescueRuns,
    passwordResetDispatches: input.passwordResetRecentDispatches,
    notes: [
      input.notificationError
        ? `Notification audit visibility is limited: ${input.notificationError}`
        : null,
    ],
  });

  const businessRadarSnapshot = buildBusinessPerformanceRadarSnapshot({
    generatedAt: input.generatedAt,
    windowDays: 30,
    businesses: input.businessRadarBusinesses,
    inventoryItems: input.businessRadarInventoryItems,
    offers: input.businessRadarOffers,
    leads: input.businessRadarLeads30d,
    rewards: input.businessRadarRewards30d.map(
      (reward): BusinessPerformanceRadarRewardInput => ({
        businessId: reward.businessId,
        token: reward.token,
        direction: reward.direction,
        amount: toNumber(reward.amount),
      }),
    ),
    notificationJobs: input.notificationJobs,
  });

  const sectionDiagnostics = buildControlTowerSectionDiagnostics({
    memberValueSnapshot,
    notificationSnapshot,
    operationsSnapshot,
    businessRadarSnapshot,
  });

  return {
    memberValueSnapshot,
    notificationSnapshot,
    operationsSnapshot,
    businessRadarSnapshot,
    sectionDiagnostics,
  };
}

export function buildAdminBuilderFeed(input: {
  buildMeta: BuildMeta;
  nowIso: string;
  wsApiSnapshot: WsApiSnapshot;
  identityLiveSnapshot: IdentityLiveSnapshot;
  memberValueSnapshot: MemberValueSnapshot;
  notificationSnapshot: NotificationSnapshot;
  operationsSnapshot: OperationsSnapshot;
  businessRadarSnapshot: BusinessRadarSnapshot;
  pulseSnapshot: PulseSnapshot;
  tmailSnapshot: TmailSnapshot;
  latestPublicProbeRun: LatestPublicProbeRun | null;
  latestIdentityRun: LatestIdentityRun | null;
  latestFulfillmentRun: LatestFulfillmentRun | null;
  latestSavedMatchAssignment: LatestSavedMatchAssignment | null;
  newestUser: NewestUser | null;
}) {
  const builderFeed: BuilderFeedItem[] = [
    buildFeedItem({
      id: `build:${input.buildMeta.buildId}`,
      category: "release",
      status: "info",
      title: "Current app build is loaded",
      summary: `${input.buildMeta.app} ${input.buildMeta.packageVersion} is running as ${input.buildMeta.buildId}.`,
      detail:
        input.buildMeta.gitShaShort && input.buildMeta.gitBranch
          ? `Built from ${input.buildMeta.gitBranch} at ${input.buildMeta.gitShaShort}.`
          : "Build metadata fallback is active, so git details are not embedded in this runtime.",
      createdAt: input.buildMeta.builtAt,
    }),
  ];

  if (input.latestPublicProbeRun) {
    const healthyProbe =
      input.latestPublicProbeRun.hasOgImage &&
      input.latestPublicProbeRun.hasTwitterCard &&
      input.latestPublicProbeRun.hasSummaryLargeImage;
    builderFeed.push(
      buildFeedItem({
        id: `probe:${input.latestPublicProbeRun.id}`,
        category: "public-surface",
        status: healthyProbe ? "good" : "warn",
        title: "Latest public share probe finished",
        summary: `Homepage status ${input.latestPublicProbeRun.homeStatus ?? "n/a"} with og:image ${
          input.latestPublicProbeRun.hasOgImage ? "present" : "missing"
        }.`,
        detail: input.latestPublicProbeRun.hasTwitterCard
          ? "Twitter card metadata is present in the latest saved probe."
          : "Twitter card metadata was missing in the latest saved probe.",
        createdAt: input.latestPublicProbeRun.createdAt.toISOString(),
      }),
    );
  }

  if (input.latestIdentityRun) {
    const identityHealthy =
      input.latestIdentityRun.roleMismatchAfter === 0 &&
      input.latestIdentityRun.localOnlyCount === 0 &&
      input.latestIdentityRun.wsApiOnlyCount === 0;
    builderFeed.push(
      buildFeedItem({
        id: `identity:${input.latestIdentityRun.id}`,
        category: "identity",
        status: identityHealthy ? "good" : "warn",
        title: "Latest identity parity check completed",
        summary: `Scanned ${input.latestIdentityRun.scannedCount} identities with ${input.latestIdentityRun.roleMismatchAfter} role mismatches remaining.`,
        detail: `Local-only ${input.latestIdentityRun.localOnlyCount}, ws-api-only ${input.latestIdentityRun.wsApiOnlyCount}, ws-api role updates ${input.latestIdentityRun.wsApiRoleUpdated}.`,
        createdAt: input.latestIdentityRun.createdAt.toISOString(),
      }),
    );
  }

  if (input.wsApiSnapshot.healthReachable) {
    const durableModules = input.wsApiSnapshot.durability?.durableModules ?? 0;
    const totalModules = input.wsApiSnapshot.durability?.totalModules ?? 0;
    const journalConfigured = input.wsApiSnapshot.durability?.journalConfigured ?? false;
    const contractDrift = input.wsApiSnapshot.contractParity.status === "drift";
    const wsApiNeedsAttention =
      input.wsApiSnapshot.usersRepository === "memory" ||
      !journalConfigured ||
      contractDrift;
    const wsApiStatus: BuilderFeedStatus = wsApiNeedsAttention
      ? "warn"
      : durableModules === totalModules && totalModules > 0
        ? "good"
        : "info";
    builderFeed.push(
      buildFeedItem({
        id: `ws-api:${input.wsApiSnapshot.contract?.version ?? input.wsApiSnapshot.baseUrl}`,
        category: "ws-api",
        status: wsApiStatus,
        title: wsApiNeedsAttention
          ? "WS-API durability still has restart-sensitive seams"
          : durableModules === totalModules && totalModules > 0
            ? "WS-API durability is now fully visible and journal-backed"
            : "WS-API durability telemetry is now visible",
        summary: `Contract ${input.wsApiSnapshot.contract?.version ?? "n/a"} exposes ${
          input.wsApiSnapshot.contract?.routeCount ?? "n/a"
        } routes. App expects ${input.wsApiSnapshot.contractParity.expectedVersion} / ${
          input.wsApiSnapshot.contractParity.expectedRouteCount
        }, with ${durableModules} of ${totalModules} modules backed by durable storage and ${
          input.wsApiSnapshot.sharedClientCoverage.routeCount
        } contract-backed bridge routes already adopted in app admin flows.`,
        detail: contractDrift
          ? `Live api advertises ${input.wsApiSnapshot.contractParity.liveVersion ?? "unknown"} / ${
              input.wsApiSnapshot.contractParity.liveRouteCount ?? "unknown"
            }, which differs from the app expectation.`
          : journalConfigured
            ? `Users run on ${input.wsApiSnapshot.usersRepository ?? "unknown"}, auth sessions on ${
                input.wsApiSnapshot.storage.authSessions ?? "unknown"
              }, business ops on ${input.wsApiSnapshot.storage.businessOps ?? "unknown"}, and contract-backed adoption spans ${input.wsApiSnapshot.sharedClientCoverage.surfaces.join(", ")}.`
            : "The shared ws-api journal is not configured, so non-user state can reset when the service restarts.",
        createdAt:
          input.wsApiSnapshot.contract?.generatedAt ??
          input.wsApiSnapshot.release?.startedAt ??
          input.nowIso,
      }),
    );
  }

  if (input.identityLiveSnapshot.summary) {
    const unresolvedCount =
      input.identityLiveSnapshot.summary.roleMismatches +
      input.identityLiveSnapshot.summary.localOnly +
      input.identityLiveSnapshot.summary.wsApiOnly;
    builderFeed.push(
      buildFeedItem({
        id: `identity-live:${input.identityLiveSnapshot.generatedAt}`,
        category: "identity-live",
        status: unresolvedCount === 0 ? "good" : "warn",
        title:
          unresolvedCount === 0
            ? "Live identity parity is in sync"
            : "Live identity parity shows drift right now",
        summary: `Compared ${input.identityLiveSnapshot.summary.total} accounts: ${input.identityLiveSnapshot.summary.roleMismatches} role mismatches, ${input.identityLiveSnapshot.summary.localOnly} local-only, ${input.identityLiveSnapshot.summary.wsApiOnly} ws-api-only.`,
        detail: `Local users ${input.identityLiveSnapshot.localUsersCount}, ws-api users ${input.identityLiveSnapshot.wsApiUsersCount ?? "n/a"}, active-offer users with zero badges ${input.identityLiveSnapshot.summary.zeroOfferUsers}.`,
        createdAt: input.identityLiveSnapshot.generatedAt,
      }),
    );
  } else if (input.identityLiveSnapshot.error) {
    builderFeed.push(
      buildFeedItem({
        id: `identity-live:error:${input.identityLiveSnapshot.generatedAt}`,
        category: "identity-live",
        status: "warn",
        title: "Live identity parity could not be compared",
        summary: input.identityLiveSnapshot.error,
        detail: input.identityLiveSnapshot.accessTokenPresent
          ? "The admin session has a ws-api token, but the live comparison call failed."
          : "This admin session is missing the ws-api token needed for a live comparison.",
        createdAt: input.identityLiveSnapshot.generatedAt,
      }),
    );
  }

  builderFeed.push(
    buildFeedItem({
      id: `member-value:${input.memberValueSnapshot.generatedAt}`,
      category: "member-value",
      status:
        input.memberValueSnapshot.summary.subscriptionMismatches > 0 ||
        input.memberValueSnapshot.summary.rewardedUsersWithoutWallet > 0
          ? "warn"
          : "info",
      title: "Rewards and membership telemetry is visible in the control tower",
      summary: `${input.memberValueSnapshot.summary.activeSubscriptions + input.memberValueSnapshot.summary.trialingSubscriptions} premium members, ${
        input.memberValueSnapshot.summary.linkedWallets ?? 0
      } linked wallets, ${input.memberValueSnapshot.summary.rewardEntries7d} reward ledger entries in the last 7 days.`,
      detail: `Local net WHEAT ${formatMetricNumber(
        input.memberValueSnapshot.localRewards.netByToken.WHEAT,
      )}, STONE ${formatMetricNumber(
        input.memberValueSnapshot.localRewards.netByToken.STONE,
      )}. Pending remote payouts WHEAT ${formatMetricNumber(
        input.memberValueSnapshot.remoteRewards.pendingByToken.WHEAT,
      )}, STONE ${formatMetricNumber(
        input.memberValueSnapshot.remoteRewards.pendingByToken.STONE,
      )}.`,
      createdAt: input.memberValueSnapshot.generatedAt,
    }),
  );

  if (input.notificationSnapshot.available) {
    const notificationNeedsAttention =
      input.notificationSnapshot.summary.failed > 0 ||
      input.notificationSnapshot.summary.retrying > 0 ||
      input.notificationSnapshot.summary.overdue > 0;
    builderFeed.push(
      buildFeedItem({
        id: `notifications:${input.notificationSnapshot.generatedAt}`,
        category: "notifications",
        status: notificationNeedsAttention ? "warn" : "info",
        title: notificationNeedsAttention
          ? "Notification queue needs attention"
          : "Notification queue telemetry is live",
        summary: `${input.notificationSnapshot.summary.totalJobs} jobs tracked: ${input.notificationSnapshot.summary.queued} queued, ${input.notificationSnapshot.summary.sent} sent, ${input.notificationSnapshot.summary.failed} failed.`,
        detail: `Channels email ${input.notificationSnapshot.summary.emailJobs}, push ${input.notificationSnapshot.summary.pushJobs}, sms ${input.notificationSnapshot.summary.smsJobs}. Push fallbacks ${input.notificationSnapshot.summary.fallbackQueued}.`,
        createdAt: input.notificationSnapshot.generatedAt,
      }),
    );
  } else if (input.notificationSnapshot.error) {
    builderFeed.push(
      buildFeedItem({
        id: `notifications:error:${input.notificationSnapshot.generatedAt}`,
        category: "notifications",
        status: "warn",
        title: "Notification command center could not load live queue data",
        summary: input.notificationSnapshot.error,
        detail: input.notificationSnapshot.accessTokenPresent
          ? "The admin session has a ws-api token, but the notification ops request failed."
          : "This admin session is missing the ws-api token needed for notification queue visibility.",
        createdAt: input.notificationSnapshot.generatedAt,
      }),
    );
  }

  builderFeed.push(
    buildFeedItem({
      id: `operations:${input.operationsSnapshot.generatedAt}`,
      category: "operations",
      status: input.operationsSnapshot.summary.attentionSignals > 0 ? "warn" : "good",
      title:
        input.operationsSnapshot.summary.attentionSignals > 0
          ? "Operations watchlist has live attention items"
          : "Operations watchlist is clear right now",
      summary: `${input.operationsSnapshot.summary.totalSignals} recent platform actions are visible, with ${input.operationsSnapshot.summary.attentionSignals} needing attention.`,
      detail: `Automations ${input.operationsSnapshot.summary.automationSignals}, notifications ${input.operationsSnapshot.summary.notificationSignals}, support ${input.operationsSnapshot.summary.supportSignals}, public probes ${input.operationsSnapshot.summary.publicSurfaceSignals}.`,
      createdAt:
        input.operationsSnapshot.recentEvents[0]?.occurredAt ??
        input.operationsSnapshot.generatedAt,
    }),
  );

  builderFeed.push(
    buildFeedItem({
      id: `business-radar:${input.businessRadarSnapshot.generatedAt}`,
      category: "business-radar",
      status:
        input.businessRadarSnapshot.summary.businessesNeedingAttention > 0
          ? "warn"
          : "good",
      title:
        input.businessRadarSnapshot.summary.businessesNeedingAttention > 0
          ? "Business performance radar found coverage gaps"
          : "Business performance radar is balanced",
      summary: `${input.businessRadarSnapshot.summary.businessCount} businesses tracked with ${input.businessRadarSnapshot.summary.liveOfferCount} live offers, ${input.businessRadarSnapshot.summary.leadCount} delivery leads, and ${input.businessRadarSnapshot.summary.notificationSentCount} sent notifications in the last ${input.businessRadarSnapshot.windowDays} days.`,
      detail: `Attention on ${input.businessRadarSnapshot.summary.businessesNeedingAttention} businesses · low-stock items ${input.businessRadarSnapshot.summary.lowStockCount} · recipients ${input.businessRadarSnapshot.summary.notificationRecipients}.`,
      createdAt: input.businessRadarSnapshot.generatedAt,
    }),
  );

  builderFeed.push(
    buildFeedItem({
      id: `pulse:${input.pulseSnapshot.checkedAt ?? input.pulseSnapshot.apiBaseUrl ?? "unconfigured"}`,
      category: "pulse",
      status: input.pulseSnapshot.reachable
        ? "good"
        : input.pulseSnapshot.configured
          ? "warn"
          : "info",
      title: input.pulseSnapshot.reachable
        ? "Pulse rail is reachable for future social campaigns"
        : input.pulseSnapshot.configured
          ? "Pulse rail is partially wired but not healthy yet"
          : "Pulse rail is not wired into Wheat & Stone yet",
      summary: input.pulseSnapshot.apiBaseUrl
        ? `API ${input.pulseSnapshot.apiBaseUrl} · project ${input.pulseSnapshot.projectSlug ?? "not set"} · token ${
            input.pulseSnapshot.internalTokenConfigured ? "present" : "missing"
          }.`
        : "Set Pulse web/api URLs and internal token when you are ready to bring social automation into the control tower.",
      detail: input.pulseSnapshot.reachable
        ? `Health ${input.pulseSnapshot.status ?? "ok"} at ${input.pulseSnapshot.checkedAt ?? "unknown time"}.`
        : input.pulseSnapshot.error,
      createdAt: input.pulseSnapshot.checkedAt,
    }),
  );

  if (input.latestFulfillmentRun) {
    builderFeed.push(
      buildFeedItem({
        id: `fulfillment:${input.latestFulfillmentRun.id}`,
        category: "automation",
        status: input.latestFulfillmentRun.status === "SUCCESS" ? "good" : "warn",
        title: "Fulfillment automation ran recently",
        summary: `${input.latestFulfillmentRun.business.name} processed ${input.latestFulfillmentRun.openLeadCount} open leads with ${input.latestFulfillmentRun.autoAssignedCount} auto-assignments.`,
        detail: `Source ${input.latestFulfillmentRun.source}, overdue ${input.latestFulfillmentRun.overdueLeadCount}, unassigned ${input.latestFulfillmentRun.unassignedLeadCount}, digest ${
          input.latestFulfillmentRun.digestQueued ? "queued" : "not queued"
        }.`,
        createdAt: input.latestFulfillmentRun.startedAt.toISOString(),
      }),
    );
  }

  if (input.latestSavedMatchAssignment) {
    builderFeed.push(
      buildFeedItem({
        id: `saved-match:${input.latestSavedMatchAssignment.id}`,
        category: "saved-match",
        status: "info",
        title: "Saved-product matching produced an inbox assignment",
        summary: `${input.latestSavedMatchAssignment.offer.title} was assigned to ${input.latestSavedMatchAssignment.userEmail}.`,
        detail: `Business ${input.latestSavedMatchAssignment.business.name}, inbox status ${input.latestSavedMatchAssignment.status}.`,
        createdAt: input.latestSavedMatchAssignment.assignedAt.toISOString(),
      }),
    );
  }

  if (input.tmailSnapshot.latestPasswordResetMessage) {
    builderFeed.push(
      buildFeedItem({
        id: `password-reset:${input.tmailSnapshot.latestPasswordResetMessage.id}`,
        category: "password-reset",
        status:
          input.tmailSnapshot.latestPasswordResetMessage.status.toLowerCase() === "sent"
            ? "good"
            : "warn",
        title: "Password reset mail moved through TMail",
        summary: `${input.tmailSnapshot.latestPasswordResetMessage.recipients.join(", ") || "A user"} received a ${
          input.tmailSnapshot.latestPasswordResetMessage.status
        } reset message through ${input.tmailSnapshot.identityLabel ?? "the configured TMail identity"}.`,
        detail:
          input.tmailSnapshot.identityEmail && input.tmailSnapshot.baseUrl
            ? `Identity ${input.tmailSnapshot.identityEmail} via ${input.tmailSnapshot.baseUrl}.`
            : input.tmailSnapshot.error,
        createdAt:
          input.tmailSnapshot.latestPasswordResetMessage.sentAt ??
          input.tmailSnapshot.latestPasswordResetMessage.createdAt,
      }),
    );
  }

  if (input.newestUser) {
    builderFeed.push(
      buildFeedItem({
        id: `user:${input.newestUser.id}`,
        category: "growth",
        status: "info",
        title: "A fresh account entered the system",
        summary: `${input.newestUser.email} registered via ${input.newestUser.registeredVia}.`,
        detail: input.newestUser.lastAuthAt
          ? `Most recent auth at ${new Date(input.newestUser.lastAuthAt).toLocaleString()}.`
          : "This user has not completed a later auth event yet.",
        createdAt: input.newestUser.registeredAt.toISOString(),
      }),
    );
  }

  return sortFeedItems(builderFeed);
}
