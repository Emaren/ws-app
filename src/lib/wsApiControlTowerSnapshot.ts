import "server-only";

import {
  buildIdentityParitySnapshot,
  type IdentityParityRow,
} from "@/lib/identityParity";
import type {
  NotificationAuditLogInput,
  NotificationJobInput,
} from "@/lib/notificationCommandCenter";
import { buildWsApiContractParity } from "@/lib/wsApiContract";
import { fetchWsApiContractJson } from "@/lib/wsApiContractProxy";
import { buildWsApiSharedClientCoverage } from "@/lib/wsApiSharedClientCoverage";
import { listWsApiUsers, type WsApiUser } from "@/lib/wsApiClient";

export type WsApiStorageBackend = "postgres" | "file-journal" | "memory";

export type WsApiStorageSnapshot = {
  users: WsApiStorageBackend | null;
  authSessions: WsApiStorageBackend | null;
  articles: WsApiStorageBackend | null;
  businesses: WsApiStorageBackend | null;
  inventoryItems: WsApiStorageBackend | null;
  notifications: WsApiStorageBackend | null;
  notificationAuditLogs: WsApiStorageBackend | null;
  billingCustomers: WsApiStorageBackend | null;
  rewardEntries: WsApiStorageBackend | null;
  walletLinks: WsApiStorageBackend | null;
  walletChallenges: WsApiStorageBackend | null;
  businessOps: WsApiStorageBackend | null;
};

type WsApiHealthPayload = {
  status?: string;
  service?: string;
  nodeEnv?: string;
  uptime_s?: number;
  modules?: {
    users?: number;
  };
  storage?: Partial<Record<keyof WsApiStorageSnapshot, WsApiStorageBackend>>;
  durability?: {
    journalConfigured?: boolean;
    flushIntervalMs?: number | null;
    durableModules?: number;
    volatileModules?: number;
    totalModules?: number;
  };
  contract?: {
    version?: string;
    routeCount?: number;
    generatedAt?: string;
  };
  release?: {
    packageName?: string;
    packageVersion?: string;
    gitShaShort?: string | null;
    gitBranch?: string | null;
    nodeVersion?: string;
    startedAt?: string;
    metadataSource?: string;
  };
};

export type WsApiSnapshot = {
  available: boolean;
  hasAccessToken: boolean;
  baseUrl: string;
  usersCount: number | null;
  usersRepository: WsApiStorageBackend | null;
  healthUsersCount: number | null;
  healthReachable: boolean;
  healthError: string | null;
  error: string | null;
  nodeEnv: string | null;
  uptimeSeconds: number | null;
  storage: WsApiStorageSnapshot;
  durability: {
    journalConfigured: boolean | null;
    flushIntervalMs: number | null;
    durableModules: number | null;
    volatileModules: number | null;
    totalModules: number | null;
  } | null;
  contract: {
    version: string | null;
    routeCount: number | null;
    generatedAt: string | null;
  } | null;
  contractParity: {
    expectedVersion: string;
    expectedRouteCount: number;
    liveVersion: string | null;
    liveRouteCount: number | null;
    versionMatches: boolean | null;
    routeCountMatches: boolean | null;
    status: "aligned" | "drift" | "unknown";
  };
  sharedClientCoverage: {
    routeCount: number;
    surfaceCount: number;
    surfaces: string[];
  };
  release: {
    packageName: string | null;
    packageVersion: string | null;
    gitShaShort: string | null;
    gitBranch: string | null;
    nodeVersion: string | null;
    startedAt: string | null;
    metadataSource: string | null;
  } | null;
};

export type IdentityLiveSnapshot = {
  generatedAt: string;
  available: boolean;
  accessTokenPresent: boolean;
  localUsersCount: number;
  wsApiUsersCount: number | null;
  error: string | null;
  summary: {
    total: number;
    matched: number;
    roleMismatches: number;
    localOnly: number;
    wsApiOnly: number;
    zeroOfferUsers: number;
  } | null;
  topRows: IdentityParityRow[];
};

export type WsApiWalletLink = {
  userId: string;
  walletAddress: string;
  chainType: string;
  linkedAt: string;
  lastVerifiedAt: string | null;
};

export type WsApiRewardReport = {
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

export type WsApiControlTowerLoadResult = {
  wsApiSnapshot: WsApiSnapshot;
  identityLiveSnapshot: IdentityLiveSnapshot;
  liveWsUsers: WsApiUser[];
  walletLinks: WsApiWalletLink[];
  walletError: string | null;
  remoteRewardReport: WsApiRewardReport | null;
  remoteRewardError: string | null;
  notificationJobs: NotificationJobInput[];
  notificationAuditLogs: NotificationAuditLogInput[];
  notificationError: string | null;
};

type IdentityLocalUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  registeredVia: string;
  registeredAt: Date;
  lastAuthProvider: string | null;
  lastAuthAt: Date | null;
};

function normalizeWsApiStorageBackend(value: unknown): WsApiStorageBackend | null {
  return value === "postgres" || value === "file-journal" || value === "memory" ? value : null;
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function combineErrors(...values: Array<string | null | undefined>): string | null {
  const normalized = values
    .map((value) => normalizeText(value ?? undefined))
    .filter((value): value is string => Boolean(value));
  return normalized.length > 0 ? [...new Set(normalized)].join(" | ") : null;
}

function createEmptyStorageSnapshot(): WsApiStorageSnapshot {
  return {
    users: null,
    authSessions: null,
    articles: null,
    businesses: null,
    inventoryItems: null,
    notifications: null,
    notificationAuditLogs: null,
    billingCustomers: null,
    rewardEntries: null,
    walletLinks: null,
    walletChallenges: null,
    businessOps: null,
  };
}

async function fetchWsApiHealthSnapshot(): Promise<{
  reachable: boolean;
  usersRepository: WsApiStorageBackend | null;
  usersCount: number | null;
  nodeEnv: string | null;
  uptimeSeconds: number | null;
  storage: WsApiStorageSnapshot;
  durability: WsApiSnapshot["durability"];
  contract: WsApiSnapshot["contract"];
  release: WsApiSnapshot["release"];
  error: string | null;
}> {
  const result = await fetchWsApiContractJson<WsApiHealthPayload>({
    method: "GET",
    route: "/health",
    logLabel: "ws-api health snapshot failed",
    timeoutMs: 4_500,
  });

  if (!result.ok || !result.payload) {
    return {
      reachable: false,
      usersRepository: null,
      usersCount: null,
      nodeEnv: null,
      uptimeSeconds: null,
      storage: createEmptyStorageSnapshot(),
      durability: null,
      contract: null,
      release: null,
      error: result.error,
    };
  }

  const payload = result.payload;
  const storage: WsApiStorageSnapshot = {
    users: normalizeWsApiStorageBackend(payload.storage?.users),
    authSessions: normalizeWsApiStorageBackend(payload.storage?.authSessions),
    articles: normalizeWsApiStorageBackend(payload.storage?.articles),
    businesses: normalizeWsApiStorageBackend(payload.storage?.businesses),
    inventoryItems: normalizeWsApiStorageBackend(payload.storage?.inventoryItems),
    notifications: normalizeWsApiStorageBackend(payload.storage?.notifications),
    notificationAuditLogs: normalizeWsApiStorageBackend(payload.storage?.notificationAuditLogs),
    billingCustomers: normalizeWsApiStorageBackend(payload.storage?.billingCustomers),
    rewardEntries: normalizeWsApiStorageBackend(payload.storage?.rewardEntries),
    walletLinks: normalizeWsApiStorageBackend(payload.storage?.walletLinks),
    walletChallenges: normalizeWsApiStorageBackend(payload.storage?.walletChallenges),
    businessOps: normalizeWsApiStorageBackend(payload.storage?.businessOps),
  };

  return {
    reachable: true,
    usersRepository: storage.users,
    usersCount: typeof payload.modules?.users === "number" ? payload.modules.users : null,
    nodeEnv: normalizeText(payload.nodeEnv),
    uptimeSeconds: typeof payload.uptime_s === "number" ? payload.uptime_s : null,
    storage,
    durability: payload.durability
      ? {
          journalConfigured:
            typeof payload.durability.journalConfigured === "boolean"
              ? payload.durability.journalConfigured
              : null,
          flushIntervalMs:
            typeof payload.durability.flushIntervalMs === "number"
              ? payload.durability.flushIntervalMs
              : null,
          durableModules:
            typeof payload.durability.durableModules === "number"
              ? payload.durability.durableModules
              : null,
          volatileModules:
            typeof payload.durability.volatileModules === "number"
              ? payload.durability.volatileModules
              : null,
          totalModules:
            typeof payload.durability.totalModules === "number"
              ? payload.durability.totalModules
              : null,
        }
      : null,
    contract: payload.contract
      ? {
          version: normalizeText(payload.contract.version),
          routeCount:
            typeof payload.contract.routeCount === "number" ? payload.contract.routeCount : null,
          generatedAt: normalizeText(payload.contract.generatedAt),
        }
      : null,
    release: payload.release
      ? {
          packageName: normalizeText(payload.release.packageName),
          packageVersion: normalizeText(payload.release.packageVersion),
          gitShaShort: normalizeText(payload.release.gitShaShort),
          gitBranch: normalizeText(payload.release.gitBranch),
          nodeVersion: normalizeText(payload.release.nodeVersion),
          startedAt: normalizeText(payload.release.startedAt),
          metadataSource: normalizeText(payload.release.metadataSource),
        }
      : null,
    error: null,
  };
}

async function fetchWsApiJsonSnapshot<T>(
  route: string,
  accessToken: string,
): Promise<{ ok: boolean; payload: T | null; error: string | null }> {
  const result = await fetchWsApiContractJson<T>({
    method: "GET",
    route,
    accessToken,
    logLabel: "ws-api snapshot request failed",
    timeoutMs: 8_000,
  });

  return {
    ok: result.ok,
    payload: result.payload,
    error: result.error,
  };
}

export async function loadWsApiControlTowerSection(input: {
  baseUrl: string;
  generatedAt: string;
  accessToken: string | null;
  identityLocalUsers: IdentityLocalUser[];
  identityOfferBadgeCounts: Map<string, number>;
}): Promise<WsApiControlTowerLoadResult> {
  const wsApiSharedClientCoverage = buildWsApiSharedClientCoverage();
  const wsApiSnapshot: WsApiSnapshot = {
    available: false,
    hasAccessToken: Boolean(input.accessToken),
    baseUrl: input.baseUrl,
    usersCount: null,
    usersRepository: null,
    healthUsersCount: null,
    healthReachable: false,
    healthError: null,
    error: null,
    nodeEnv: null,
    uptimeSeconds: null,
    storage: createEmptyStorageSnapshot(),
    durability: null,
    contract: null,
    contractParity: buildWsApiContractParity(null),
    sharedClientCoverage: {
      routeCount: wsApiSharedClientCoverage.routeCount,
      surfaceCount: wsApiSharedClientCoverage.surfaceCount,
      surfaces: wsApiSharedClientCoverage.surfaces,
    },
    release: null,
  };

  const wsApiHealth = await fetchWsApiHealthSnapshot();
  wsApiSnapshot.healthReachable = wsApiHealth.reachable;
  wsApiSnapshot.usersRepository = wsApiHealth.usersRepository;
  wsApiSnapshot.healthUsersCount = wsApiHealth.usersCount;
  wsApiSnapshot.healthError = wsApiHealth.error;
  wsApiSnapshot.nodeEnv = wsApiHealth.nodeEnv;
  wsApiSnapshot.uptimeSeconds = wsApiHealth.uptimeSeconds;
  wsApiSnapshot.storage = wsApiHealth.storage;
  wsApiSnapshot.durability = wsApiHealth.durability;
  wsApiSnapshot.contract = wsApiHealth.contract;
  wsApiSnapshot.contractParity = buildWsApiContractParity(wsApiHealth.contract);
  wsApiSnapshot.release = wsApiHealth.release;

  const identityLiveSnapshot: IdentityLiveSnapshot = {
    generatedAt: input.generatedAt,
    available: false,
    accessTokenPresent: Boolean(input.accessToken),
    localUsersCount: input.identityLocalUsers.length,
    wsApiUsersCount: null,
    error: input.accessToken ? null : "WS-API access token is missing in this admin session.",
    summary: null,
    topRows: [],
  };

  let liveWsUsers: WsApiUser[] = [];
  let walletLinks: WsApiWalletLink[] = [];
  let walletError = input.accessToken
    ? null
    : "WS-API access token is missing in this admin session.";
  let remoteRewardReport: WsApiRewardReport | null = null;
  let remoteRewardError = input.accessToken
    ? null
    : "WS-API access token is missing in this admin session.";
  let notificationJobs: NotificationJobInput[] = [];
  let notificationAuditLogs: NotificationAuditLogInput[] = [];
  let notificationError = input.accessToken
    ? null
    : "WS-API access token is missing in this admin session.";

  if (!input.accessToken) {
    return {
      wsApiSnapshot,
      identityLiveSnapshot,
      liveWsUsers,
      walletLinks,
      walletError,
      remoteRewardReport,
      remoteRewardError,
      notificationJobs,
      notificationAuditLogs,
      notificationError,
    };
  }

  const [
    walletLinksResult,
    rewardReportResult,
    notificationJobsResult,
    notificationAuditResult,
  ] = await Promise.all([
    fetchWsApiJsonSnapshot<WsApiWalletLink[]>("/ops/wallet-links", input.accessToken),
    fetchWsApiJsonSnapshot<WsApiRewardReport>("/rewards/report", input.accessToken),
    fetchWsApiJsonSnapshot<NotificationJobInput[]>("/notifications/jobs", input.accessToken),
    fetchWsApiJsonSnapshot<NotificationAuditLogInput[]>(
      "/notifications/audit",
      input.accessToken,
    ),
  ]);

  if (walletLinksResult.ok && walletLinksResult.payload) {
    walletLinks = walletLinksResult.payload;
    walletError = null;
  } else {
    walletError = walletLinksResult.error;
  }

  if (rewardReportResult.ok && rewardReportResult.payload) {
    remoteRewardReport = rewardReportResult.payload;
    remoteRewardError = null;
  } else {
    remoteRewardError = rewardReportResult.error;
  }

  if (notificationJobsResult.ok && Array.isArray(notificationJobsResult.payload)) {
    notificationJobs = notificationJobsResult.payload;
  }

  if (notificationAuditResult.ok && Array.isArray(notificationAuditResult.payload)) {
    notificationAuditLogs = notificationAuditResult.payload;
  }

  notificationError = combineErrors(
    notificationJobsResult.ok ? null : notificationJobsResult.error,
    notificationAuditResult.ok ? null : notificationAuditResult.error,
  );

  try {
    const users = await listWsApiUsers(input.accessToken);
    liveWsUsers = users;
    wsApiSnapshot.available = true;
    wsApiSnapshot.usersCount = users.length;
    const identityParity = buildIdentityParitySnapshot({
      localUsers: input.identityLocalUsers,
      wsUsers: users,
      offerBadgeCountsByEmail: input.identityOfferBadgeCounts,
    });
    identityLiveSnapshot.available = true;
    identityLiveSnapshot.wsApiUsersCount = users.length;
    identityLiveSnapshot.summary = identityParity.summary;
    identityLiveSnapshot.topRows = identityParity.rows
      .filter((row) => row.status !== "MATCHED")
      .slice(0, 8);
  } catch (error) {
    wsApiSnapshot.available = false;
    wsApiSnapshot.error = safeErrorMessage(error);
    identityLiveSnapshot.error = safeErrorMessage(error);
  }

  return {
    wsApiSnapshot,
    identityLiveSnapshot,
    liveWsUsers,
    walletLinks,
    walletError,
    remoteRewardReport,
    remoteRewardError,
    notificationJobs,
    notificationAuditLogs,
    notificationError,
  };
}
