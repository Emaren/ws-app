import "server-only";

import { NextResponse } from "next/server";
import { forwardWsApiContractRequest } from "@/lib/wsApiContractProxy";

export async function forwardWsApiRewardsRequest(input: {
  route: string;
  method: "GET" | "POST";
  accessToken: string;
  query?: string;
  body?: unknown;
  headers?: Record<string, string>;
  csvFilename?: string;
}): Promise<NextResponse> {
  return forwardWsApiContractRequest({
    method: input.method,
    route: input.route,
    accessToken: input.accessToken,
    query: input.query,
    body: input.body,
    headers: input.headers,
    csvFilename: input.csvFilename ?? "reward-ledger-export.csv",
    logLabel: "ws-api rewards proxy failed",
  });
}
