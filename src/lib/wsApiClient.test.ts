import assert from "node:assert/strict";
import { test } from "node:test";
import { buildWsApiSharedClientCoverage } from "./wsApiSharedClientCoverage";

test("buildWsApiSharedClientCoverage summarizes adopted contract-backed routes", () => {
  const coverage = buildWsApiSharedClientCoverage();

  assert.equal(coverage.routeCount, 42);
  assert.equal(coverage.surfaceCount, 7);
  assert.deepEqual(coverage.surfaces, [
    "Identity Control",
    "Commerce Ops",
    "Member Value",
    "Wallet Rail",
    "Rewards Rail",
    "Notification Rail",
    "Control Tower",
  ]);
  assert.equal(
    coverage.routes.some(
      (route) => route.method === "PATCH" && route.path === "/users/:id/role",
    ),
    true,
  );
  assert.equal(
    coverage.routes.some(
      (route) => route.method === "POST" && route.path === "/notifications/jobs/process",
    ),
    true,
  );
});
