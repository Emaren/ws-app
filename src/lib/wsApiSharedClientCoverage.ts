import type { WsApiContractMethod } from "@/lib/wsApiContract";

export type WsApiSharedClientCoverage = {
  routeCount: number;
  surfaceCount: number;
  surfaces: string[];
  routes: Array<{
    method: WsApiContractMethod;
    path: string;
    surface: string;
  }>;
};

const WS_API_SHARED_CLIENT_ROUTES = [
  { method: "GET", path: "/users", surface: "Identity Control" },
  { method: "PATCH", path: "/users/:id/role", surface: "Identity Control" },
  { method: "GET", path: "/ops/businesses", surface: "Commerce Ops" },
  { method: "POST", path: "/ops/businesses", surface: "Commerce Ops" },
  { method: "GET", path: "/ops/businesses/:id", surface: "Commerce Ops" },
  { method: "PATCH", path: "/ops/businesses/:id", surface: "Commerce Ops" },
  { method: "DELETE", path: "/ops/businesses/:id", surface: "Commerce Ops" },
  { method: "GET", path: "/ops/inventory-items", surface: "Commerce Ops" },
  { method: "POST", path: "/ops/inventory-items", surface: "Commerce Ops" },
  { method: "GET", path: "/ops/inventory-items/:id", surface: "Commerce Ops" },
  { method: "PATCH", path: "/ops/inventory-items/:id", surface: "Commerce Ops" },
  { method: "DELETE", path: "/ops/inventory-items/:id", surface: "Commerce Ops" },
  { method: "GET", path: "/ops/offers", surface: "Commerce Ops" },
  { method: "POST", path: "/ops/offers", surface: "Commerce Ops" },
  { method: "GET", path: "/ops/offers/:id", surface: "Commerce Ops" },
  { method: "PATCH", path: "/ops/offers/:id", surface: "Commerce Ops" },
  { method: "DELETE", path: "/ops/offers/:id", surface: "Commerce Ops" },
  { method: "POST", path: "/ops/pricing/quote", surface: "Commerce Ops" },
  { method: "GET", path: "/ops/wallet-links", surface: "Member Value" },
  { method: "GET", path: "/rewards/report", surface: "Member Value" },
  { method: "GET", path: "/auth/wallet", surface: "Wallet Rail" },
  { method: "POST", path: "/auth/wallet/challenge", surface: "Wallet Rail" },
  { method: "POST", path: "/auth/wallet/link", surface: "Wallet Rail" },
  { method: "DELETE", path: "/auth/wallet", surface: "Wallet Rail" },
  { method: "GET", path: "/rewards/rules", surface: "Rewards Rail" },
  { method: "GET", path: "/rewards/ledger", surface: "Rewards Rail" },
  { method: "POST", path: "/rewards/ledger", surface: "Rewards Rail" },
  { method: "POST", path: "/rewards/accrual", surface: "Rewards Rail" },
  { method: "GET", path: "/rewards/export", surface: "Rewards Rail" },
  { method: "POST", path: "/rewards/export/mark", surface: "Rewards Rail" },
  { method: "POST", path: "/rewards/export/settle", surface: "Rewards Rail" },
  { method: "GET", path: "/notifications/jobs", surface: "Notification Rail" },
  { method: "POST", path: "/notifications/jobs", surface: "Notification Rail" },
  { method: "GET", path: "/notifications/audit", surface: "Notification Rail" },
  { method: "POST", path: "/notifications/jobs/process", surface: "Notification Rail" },
  { method: "GET", path: "/notifications/jobs/:id/audit", surface: "Notification Rail" },
  { method: "POST", path: "/notifications/jobs/:id/retry", surface: "Notification Rail" },
  { method: "GET", path: "/health", surface: "Control Tower" },
  { method: "GET", path: "/ops/wallet-links", surface: "Control Tower" },
  { method: "GET", path: "/rewards/report", surface: "Control Tower" },
  { method: "GET", path: "/notifications/jobs", surface: "Control Tower" },
  { method: "GET", path: "/notifications/audit", surface: "Control Tower" },
] as const satisfies ReadonlyArray<{
  method: WsApiContractMethod;
  path: string;
  surface: string;
}>;

export function buildWsApiSharedClientCoverage(): WsApiSharedClientCoverage {
  const surfaces = [...new Set(WS_API_SHARED_CLIENT_ROUTES.map((route) => route.surface))];

  return {
    routeCount: WS_API_SHARED_CLIENT_ROUTES.length,
    surfaceCount: surfaces.length,
    surfaces,
    routes: WS_API_SHARED_CLIENT_ROUTES.map((route) => ({ ...route })),
  };
}
