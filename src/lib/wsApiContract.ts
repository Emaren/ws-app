import {
  WS_API_CONTRACT,
  WS_API_CONTRACT_ROUTE_COUNT,
  WS_API_CONTRACT_VERSION,
} from "@/lib/generated/wsApiContract";

export type WsApiContractMethod = (typeof WS_API_CONTRACT.routes)[number]["method"];
export type WsApiContractDocument = typeof WS_API_CONTRACT;

export type WsApiContractSummary = {
  version: string | null;
  routeCount: number | null;
  generatedAt: string | null;
};

export type WsApiContractParity = {
  expectedVersion: string;
  expectedRouteCount: number;
  liveVersion: string | null;
  liveRouteCount: number | null;
  versionMatches: boolean | null;
  routeCountMatches: boolean | null;
  status: "aligned" | "drift" | "unknown";
};

export const EXPECTED_WS_API_CONTRACT = WS_API_CONTRACT;
export const EXPECTED_WS_API_CONTRACT_VERSION = WS_API_CONTRACT_VERSION;
export const EXPECTED_WS_API_ROUTE_COUNT = WS_API_CONTRACT_ROUTE_COUNT;

export function hasWsApiContractRoute(method: WsApiContractMethod, routePath: string): boolean {
  return WS_API_CONTRACT.routes.some(
    (route) => route.method === method && route.path === routePath,
  );
}

export function resolveWsApiContractPath(
  method: WsApiContractMethod,
  routePath: string,
): string {
  if (!hasWsApiContractRoute(method, routePath)) {
    throw new Error(`ws-api contract is missing ${method} ${routePath}`);
  }

  return routePath;
}

export function resolveWsApiContractPathWithParams(
  method: WsApiContractMethod,
  routePath: string,
  params: Record<string, string>,
): string {
  const templatePath = resolveWsApiContractPath(method, routePath);

  return templatePath.replace(/:([A-Za-z0-9_]+)/g, (_segment, key: string) => {
    const value = params[key];
    if (typeof value !== "string" || !value.trim()) {
      throw new Error(`ws-api contract path ${routePath} is missing parameter "${key}"`);
    }

    return encodeURIComponent(value.trim());
  });
}

export function buildWsApiContractParity(
  live: Partial<WsApiContractSummary> | null | undefined,
): WsApiContractParity {
  const liveVersion =
    typeof live?.version === "string" && live.version.trim().length > 0
      ? live.version.trim()
      : null;
  const liveRouteCount =
    typeof live?.routeCount === "number" && Number.isFinite(live.routeCount)
      ? live.routeCount
      : null;
  const versionMatches = liveVersion ? liveVersion === EXPECTED_WS_API_CONTRACT_VERSION : null;
  const routeCountMatches =
    typeof liveRouteCount === "number"
      ? liveRouteCount === EXPECTED_WS_API_ROUTE_COUNT
      : null;

  return {
    expectedVersion: EXPECTED_WS_API_CONTRACT_VERSION,
    expectedRouteCount: EXPECTED_WS_API_ROUTE_COUNT,
    liveVersion,
    liveRouteCount,
    versionMatches,
    routeCountMatches,
    status:
      versionMatches === null || routeCountMatches === null
        ? "unknown"
        : versionMatches && routeCountMatches
          ? "aligned"
          : "drift",
  };
}
