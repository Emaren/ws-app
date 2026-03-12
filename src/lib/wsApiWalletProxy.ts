import "server-only";

import { NextResponse } from "next/server";
import { forwardWsApiContractRequest } from "@/lib/wsApiContractProxy";

export async function forwardWsApiWalletRequest(input: {
  route: string;
  method: "GET" | "POST" | "DELETE";
  accessToken: string;
  body?: unknown;
}): Promise<NextResponse> {
  return forwardWsApiContractRequest({
    method: input.method,
    route: input.route,
    accessToken: input.accessToken,
    body: input.body,
    logLabel: "ws-api wallet proxy failed",
  });
}
