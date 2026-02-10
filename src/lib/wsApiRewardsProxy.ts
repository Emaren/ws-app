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

export async function forwardWsApiRewardsRequest(input: {
  path: string;
  method: "GET" | "POST";
  accessToken: string;
  body?: unknown;
  headers?: Record<string, string>;
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
        ...(input.headers ?? {}),
      },
      ...(input.body !== undefined ? { body: JSON.stringify(input.body) } : {}),
    });

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("text/csv")) {
      const csv = await response.text();
      return new NextResponse(csv, {
        status: response.status,
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition":
            response.headers.get("content-disposition") ??
            "attachment; filename=reward-ledger-export.csv",
        },
      });
    }

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
