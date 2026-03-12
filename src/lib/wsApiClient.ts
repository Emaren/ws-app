import { getWsApiBaseUrl } from "@/lib/wsApiBaseUrl";
import {
  resolveWsApiContractPath,
  resolveWsApiContractPathWithParams,
} from "@/lib/wsApiContract";

const WS_API_TIMEOUT_MS = 10_000;
const USERS_PATH = resolveWsApiContractPath("GET", "/users");
const BUSINESSES_PATH = resolveWsApiContractPath("GET", "/ops/businesses");
const WALLET_LINKS_PATH = resolveWsApiContractPath("GET", "/ops/wallet-links");
const REWARD_REPORT_PATH = resolveWsApiContractPath("GET", "/rewards/report");
const UPDATE_USER_ROLE_PATH = "/users/:id/role";

export type WsApiUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  updatedAt: string;
};

export type WsApiBusiness = {
  id: string;
  slug: string;
  name: string;
  ownerUserId: string | null;
  contactEmail: string | null;
  status: string;
  isVerified: boolean;
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

type WsApiRequestScope =
  | "users"
  | "businesses"
  | "wallet links"
  | "reward report"
  | "user role update";

function buildWsApiRequestError(scope: WsApiRequestScope, message: string): Error {
  return new Error(`ws-api ${scope} request failed: ${message}`);
}

function unknownPayloadToMessage(payload: unknown): string {
  if (!payload) return "unknown error";
  if (typeof payload === "string") return payload;
  if (typeof payload === "object" && payload !== null) {
    const maybeMessage = (payload as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage.trim();
    }
  }
  return "unknown error";
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export class WsApiClientHttpError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(scope: WsApiRequestScope, status: number, payload: unknown) {
    super(`ws-api ${scope} request failed: ${status} ${unknownPayloadToMessage(payload)}`);
    this.name = "WsApiClientHttpError";
    this.status = status;
    this.payload = payload;
  }
}

function toObjectPayload(payload: unknown): Record<string, unknown> {
  if (isObjectRecord(payload)) {
    return payload;
  }

  if (typeof payload === "string" && payload.trim()) {
    return { message: payload.trim() };
  }

  return {};
}

async function fetchWsApiPayload(
  scope: WsApiRequestScope,
  routePath: string,
  accessToken: string,
  init?: {
    method?: "GET" | "PATCH";
    body?: unknown;
  },
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WS_API_TIMEOUT_MS);

  try {
    const response = await fetch(`${getWsApiBaseUrl()}${routePath}`, {
      method: init?.method ?? "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...(init?.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(init?.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
    });

    const payload = await response
      .json()
      .catch(async () => response.text().catch(() => ""));

    if (!response.ok) {
      throw new WsApiClientHttpError(scope, response.status, payload);
    }

    return payload;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`ws-api ${scope} request timed out`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function listWsApiUsers(accessToken: string): Promise<WsApiUser[]> {
  const payload = await fetchWsApiPayload("users", USERS_PATH, accessToken);

  if (!Array.isArray(payload)) {
    throw buildWsApiRequestError("users", "users payload was not an array");
  }

  return payload
    .filter((value): value is WsApiUser => {
      if (!isObjectRecord(value)) {
        return false;
      }

      return (
        typeof value.id === "string" &&
        typeof value.email === "string" &&
        typeof value.name === "string" &&
        typeof value.role === "string" &&
        typeof value.createdAt === "string" &&
        typeof value.updatedAt === "string"
      );
    })
    .sort((left, right) => left.email.localeCompare(right.email));
}

export async function listWsApiBusinesses(accessToken: string): Promise<WsApiBusiness[]> {
  const payload = await fetchWsApiPayload("businesses", BUSINESSES_PATH, accessToken);

  if (!Array.isArray(payload)) {
    throw buildWsApiRequestError("businesses", "businesses payload was not an array");
  }

  const rows: WsApiBusiness[] = [];
  for (const value of payload) {
    if (!isObjectRecord(value)) {
      continue;
    }

    const id = typeof value.id === "string" ? value.id.trim() : "";
    const name = typeof value.name === "string" ? value.name.trim() : "";
    if (!id || !name) {
      continue;
    }

    const slug =
      typeof value.slug === "string" && value.slug.trim()
        ? value.slug.trim()
        : id.toLowerCase();
    const ownerUserId =
      typeof value.ownerUserId === "string" && value.ownerUserId.trim()
        ? value.ownerUserId.trim()
        : null;
    const contactEmail =
      typeof value.contactEmail === "string" && value.contactEmail.trim()
        ? value.contactEmail.trim()
        : null;
    const status =
      typeof value.status === "string" && value.status.trim()
        ? value.status.trim().toUpperCase()
        : "ACTIVE";

    rows.push({
      id,
      slug,
      name,
      ownerUserId,
      contactEmail,
      status,
      isVerified: Boolean(value.isVerified),
    });
  }

  rows.sort((left, right) => left.name.localeCompare(right.name));
  return rows;
}

export async function listWsApiWalletLinks(accessToken: string): Promise<WsApiWalletLink[]> {
  const payload = await fetchWsApiPayload("wallet links", WALLET_LINKS_PATH, accessToken);

  if (!Array.isArray(payload)) {
    throw buildWsApiRequestError("wallet links", "wallet-links payload was not an array");
  }

  const rows: WsApiWalletLink[] = [];
  for (const value of payload) {
    if (!isObjectRecord(value)) {
      continue;
    }

    const userId = typeof value.userId === "string" ? value.userId.trim() : "";
    const walletAddress =
      typeof value.walletAddress === "string" ? value.walletAddress.trim() : "";
    const chainType = typeof value.chainType === "string" ? value.chainType.trim() : "";
    const linkedAt = typeof value.linkedAt === "string" ? value.linkedAt.trim() : "";

    if (!userId || !walletAddress || !chainType || !linkedAt) {
      continue;
    }

    rows.push({
      userId,
      walletAddress,
      chainType,
      linkedAt,
      lastVerifiedAt:
        typeof value.lastVerifiedAt === "string" && value.lastVerifiedAt.trim()
          ? value.lastVerifiedAt.trim()
          : null,
    });
  }

  rows.sort((left, right) => right.linkedAt.localeCompare(left.linkedAt));
  return rows;
}

export async function getWsApiRewardReport(accessToken: string): Promise<WsApiRewardReport> {
  const payload = await fetchWsApiPayload("reward report", REWARD_REPORT_PATH, accessToken);
  return toObjectPayload(payload) as WsApiRewardReport;
}

export async function updateWsApiUserRole(input: {
  accessToken: string;
  userId: string;
  role: string;
}): Promise<Record<string, unknown>> {
  const routePath = resolveWsApiContractPathWithParams("PATCH", UPDATE_USER_ROLE_PATH, {
    id: input.userId,
  });
  const payload = await fetchWsApiPayload("user role update", routePath, input.accessToken, {
    method: "PATCH",
    body: { role: input.role },
  });

  return toObjectPayload(payload);
}
