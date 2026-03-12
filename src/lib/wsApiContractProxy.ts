import "server-only";

import { NextResponse } from "next/server";
import { getWsApiBaseUrl } from "@/lib/wsApiBaseUrl";
import {
  resolveWsApiContractPath,
  resolveWsApiContractPathWithParams,
  type WsApiContractMethod,
} from "@/lib/wsApiContract";

const REQUEST_TIMEOUT_MS = 10_000;

function payloadFromUnknown(value: unknown): unknown {
  if (value === null || value === undefined) {
    return {};
  }

  if (typeof value === "string") {
    return { message: value };
  }

  return value;
}

function buildResolvedPath(input: {
  method: WsApiContractMethod;
  route: string;
  pathParams?: Record<string, string>;
  query?: string;
}) {
  const routePath =
    input.route.includes(":") || input.pathParams
      ? resolveWsApiContractPathWithParams(input.method, input.route, input.pathParams ?? {})
      : resolveWsApiContractPath(input.method, input.route);

  const query =
    typeof input.query === "string" && input.query.trim().length > 0
      ? input.query.trim()
      : "";

  if (!query) {
    return routePath;
  }

  return query.startsWith("?") ? `${routePath}${query}` : `${routePath}?${query}`;
}

function extractErrorMessage(payload: unknown, status: number): string {
  if (typeof payload === "string" && payload.trim()) {
    return payload.trim();
  }

  if (payload && typeof payload === "object") {
    const message =
      (payload as { message?: unknown }).message ??
      (payload as { error?: { message?: unknown } }).error?.message;
    if (typeof message === "string" && message.trim()) {
      return message.trim();
    }
  }

  return `request returned ${status}`;
}

async function performWsApiContractRequest(input: {
  method: WsApiContractMethod;
  route: string;
  accessToken?: string | null;
  pathParams?: Record<string, string>;
  query?: string;
  body?: unknown;
  headers?: Record<string, string>;
  logLabel: string;
  timeoutMs?: number;
}) {
  const baseUrl = getWsApiBaseUrl();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), input.timeoutMs ?? REQUEST_TIMEOUT_MS);
  const resolvedPath = buildResolvedPath(input);

  try {
    const response = await fetch(`${baseUrl}${resolvedPath}`, {
      method: input.method,
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(input.accessToken ? { Authorization: `Bearer ${input.accessToken}` } : {}),
        ...(input.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(input.headers ?? {}),
      },
      ...(input.body !== undefined ? { body: JSON.stringify(input.body) } : {}),
    });

    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : await response.text().catch(() => "");

    return {
      ok: response.ok,
      status: response.status,
      payload,
      contentType,
      headers: response.headers,
      error: response.ok ? null : extractErrorMessage(payload, response.status),
      resolvedPath,
      baseUrl,
    };
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === "AbortError";
    console.error(input.logLabel, {
      route: input.route,
      resolvedPath,
      method: input.method,
      baseUrl,
      cause: error instanceof Error ? error.message : String(error),
    });

    return {
      ok: false,
      status: isTimeout ? 504 : 502,
      payload: null,
      contentType: "",
      headers: null,
      error: isTimeout ? "ws-api request timed out" : "ws-api request failed",
      resolvedPath,
      baseUrl,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchWsApiContractJson<T>(input: {
  method: WsApiContractMethod;
  route: string;
  accessToken?: string | null;
  pathParams?: Record<string, string>;
  query?: string;
  body?: unknown;
  headers?: Record<string, string>;
  logLabel: string;
  timeoutMs?: number;
}): Promise<{ ok: boolean; status: number | null; payload: T | null; error: string | null }> {
  const response = await performWsApiContractRequest(input);

  return {
    ok: response.ok,
    status: response.status,
    payload: (response.payload as T | null) ?? null,
    error: response.error,
  };
}

export async function forwardWsApiContractRequest(input: {
  method: WsApiContractMethod;
  route: string;
  accessToken: string;
  pathParams?: Record<string, string>;
  query?: string;
  body?: unknown;
  headers?: Record<string, string>;
  logLabel: string;
  csvFilename?: string;
  timeoutMs?: number;
}): Promise<NextResponse> {
  const response = await performWsApiContractRequest(input);

  if (response.contentType.includes("text/csv")) {
      const csv = typeof response.payload === "string" ? response.payload : "";
      return new NextResponse(csv, {
        status: response.status ?? 200,
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition":
            response.headers?.get("content-disposition") ??
            `attachment; filename=${input.csvFilename ?? "ws-api-export.csv"}`,
        },
      });
  }

  if (!response.ok && response.payload === null) {
    return NextResponse.json(
      { message: response.error ?? "ws-api request failed" },
      { status: response.status ?? 502 },
    );
  }

  return NextResponse.json(payloadFromUnknown(response.payload), {
    status: response.status ?? 200,
  });
}
