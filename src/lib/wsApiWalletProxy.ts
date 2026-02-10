import "server-only";

import { NextResponse } from "next/server";

const REQUEST_TIMEOUT_MS = 10_000;

function getWsApiBaseUrl(): string {
  const candidates = [
    process.env.WS_API_BASE_URL,
    process.env.WS_API_URL,
    process.env.NEXT_PUBLIC_WS_API_BASE_URL,
  ];

  for (const candidate of candidates) {
    if (candidate && candidate.trim().length > 0) {
      return candidate.trim().replace(/\/+$/, "");
    }
  }

  return "http://127.0.0.1:3012";
}

function payloadFromUnknown(value: unknown): unknown {
  if (value === null || value === undefined) {
    return {};
  }

  if (typeof value === "string") {
    return { message: value };
  }

  return value;
}

export async function forwardWsApiWalletRequest(input: {
  path: string;
  method: "GET" | "POST" | "DELETE";
  accessToken: string;
  body?: unknown;
}): Promise<NextResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${getWsApiBaseUrl()}${input.path}`, {
      method: input.method,
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${input.accessToken}`,
        ...(input.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(input.body !== undefined ? { body: JSON.stringify(input.body) } : {}),
    });

    const payload = await response
      .json()
      .catch(async () => response.text().catch(() => ""));

    return NextResponse.json(payloadFromUnknown(payload), {
      status: response.status,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { message: "ws-api request timed out" },
        { status: 504 },
      );
    }

    return NextResponse.json(
      {
        message: "ws-api request failed",
        cause: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timer);
  }
}
