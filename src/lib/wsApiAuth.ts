import "server-only";
import { getWsApiBaseUrl } from "@/lib/wsApiBaseUrl";

interface WsApiErrorPayload {
  message?: string;
  statusCode?: number;
  requestId?: string;
}

export class WsApiHttpError extends Error {
  public readonly statusCode: number;
  public readonly payload: unknown;

  constructor(statusCode: number, message: string, payload: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.payload = payload;
    this.name = "WsApiHttpError";
  }
}

export interface WsApiAuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface WsApiSession {
  id: string;
  userId: string;
  issuedAt: string;
  expiresAt: string;
  lastSeenAt: string;
  revokedAt: string | null;
}

export interface WsApiLoginResult {
  user: WsApiAuthUser;
  session: WsApiSession;
  accessToken: string;
}

export interface WsApiSessionResult {
  user: WsApiAuthUser;
  session: WsApiSession;
}

export interface WsApiMeResult {
  user: WsApiAuthUser;
}

export interface WsApiRegisterResult {
  message: string;
  user: WsApiAuthUser;
}

const REQUEST_TIMEOUT_MS = 8000;

function parseWsApiErrorMessage(payload: unknown, fallbackMessage: string): string {
  if (typeof payload === "object" && payload !== null) {
    const maybeError = (payload as { error?: WsApiErrorPayload }).error;
    if (maybeError?.message) {
      return maybeError.message;
    }

    const maybeMessage = (payload as { message?: string }).message;
    if (maybeMessage) {
      return maybeMessage;
    }
  }

  return fallbackMessage;
}

async function wsApiRequest<T>(
  path: string,
  init: RequestInit,
  expectedStatuses: number[] = [200],
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${getWsApiBaseUrl()}${path}`, {
      cache: "no-store",
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : null),
        ...(init.headers ?? {}),
      },
    });

    const payload = await response
      .json()
      .catch(() => ({} as Record<string, unknown>));

    if (!expectedStatuses.includes(response.status)) {
      const message = parseWsApiErrorMessage(payload, `ws-api request failed (${response.status})`);
      throw new WsApiHttpError(response.status, message, payload);
    }

    return payload as T;
  } catch (error) {
    if (error instanceof WsApiHttpError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new WsApiHttpError(504, "ws-api request timed out", { path, timeoutMs: REQUEST_TIMEOUT_MS });
    }

    throw new WsApiHttpError(502, "ws-api request failed", {
      path,
      cause: error instanceof Error ? error.message : String(error),
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function wsApiLogin(email: string, password: string): Promise<WsApiLoginResult> {
  return wsApiRequest<WsApiLoginResult>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
    [200],
  );
}

export async function wsApiLogout(accessToken: string): Promise<void> {
  await wsApiRequest<{ message: string }>(
    "/auth/logout",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    [200],
  );
}

export async function wsApiGetMe(accessToken: string): Promise<WsApiMeResult | null> {
  try {
    return await wsApiRequest<WsApiMeResult>(
      "/auth/me",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      [200],
    );
  } catch (error) {
    if (error instanceof WsApiHttpError && error.statusCode === 401) {
      return null;
    }

    throw error;
  }
}

export async function wsApiGetSession(accessToken: string): Promise<WsApiSessionResult | null> {
  try {
    return await wsApiRequest<WsApiSessionResult>(
      "/auth/session",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      [200],
    );
  } catch (error) {
    if (error instanceof WsApiHttpError && error.statusCode === 401) {
      return null;
    }

    throw error;
  }
}

export async function wsApiRegister(
  email: string,
  password: string,
  name?: string,
): Promise<WsApiRegisterResult> {
  return wsApiRequest<WsApiRegisterResult>(
    "/auth/register",
    {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    },
    [201],
  );
}
