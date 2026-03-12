import "server-only";

import { NextResponse } from "next/server";
import { forwardWsApiContractRequest } from "@/lib/wsApiContractProxy";
const OPS_RESOURCE_ALLOWLIST = new Set(["businesses", "inventory-items", "offers"]);

export function isAllowedOpsResource(resource: string): boolean {
  return OPS_RESOURCE_ALLOWLIST.has(resource);
}

export function resolveOpsCollectionContractRoute(resource: string): string {
  return `/ops/${resource}`;
}

export function resolveOpsItemContractRoute(resource: string): string {
  return `/ops/${resource}/:id`;
}

export async function forwardWsApiOpsRequest(input: {
  route: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  accessToken: string;
  pathParams?: Record<string, string>;
  query?: string;
  body?: unknown;
}): Promise<NextResponse> {
  return forwardWsApiContractRequest({
    method: input.method,
    route: input.route,
    accessToken: input.accessToken,
    pathParams: input.pathParams,
    query: input.query,
    body: input.body,
    logLabel: "ws-api ops proxy failed",
  });
}
