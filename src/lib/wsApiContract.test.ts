import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildWsApiContractParity,
  EXPECTED_WS_API_ROUTE_COUNT,
  EXPECTED_WS_API_CONTRACT_VERSION,
  hasWsApiContractRoute,
  resolveWsApiContractPathWithParams,
} from "./wsApiContract";

test("buildWsApiContractParity reports aligned live contracts", () => {
  const parity = buildWsApiContractParity({
    version: EXPECTED_WS_API_CONTRACT_VERSION,
    routeCount: EXPECTED_WS_API_ROUTE_COUNT,
    generatedAt: "2026-03-12T00:00:00.000Z",
  });

  assert.deepEqual(parity, {
    expectedVersion: EXPECTED_WS_API_CONTRACT_VERSION,
    expectedRouteCount: EXPECTED_WS_API_ROUTE_COUNT,
    liveVersion: EXPECTED_WS_API_CONTRACT_VERSION,
    liveRouteCount: EXPECTED_WS_API_ROUTE_COUNT,
    versionMatches: true,
    routeCountMatches: true,
    status: "aligned",
  });
});

test("buildWsApiContractParity flags drift when live api disagrees", () => {
  const parity = buildWsApiContractParity({
    version: "3.7.9-old",
    routeCount: EXPECTED_WS_API_ROUTE_COUNT - 1,
    generatedAt: "2026-03-12T00:00:00.000Z",
  });

  assert.equal(parity.versionMatches, false);
  assert.equal(parity.routeCountMatches, false);
  assert.equal(parity.status, "drift");
});

test("hasWsApiContractRoute knows required admin bridge routes", () => {
  assert.equal(hasWsApiContractRoute("GET", "/users"), true);
  assert.equal(hasWsApiContractRoute("GET", "/ops/businesses"), true);
  assert.equal(hasWsApiContractRoute("POST", "/ops/pricing/quote"), true);
});

test("resolveWsApiContractPathWithParams fills contract-backed dynamic segments", () => {
  assert.equal(
    resolveWsApiContractPathWithParams("PATCH", "/users/:id/role", { id: "usr_123" }),
    "/users/usr_123/role",
  );
});

test("resolveWsApiContractPathWithParams rejects missing required params", () => {
  assert.throws(
    () => resolveWsApiContractPathWithParams("PATCH", "/users/:id/role", { id: "" }),
    /missing parameter "id"/,
  );
});
