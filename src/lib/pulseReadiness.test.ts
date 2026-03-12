import assert from "node:assert/strict";
import { test } from "node:test";
import {
  fetchPulseReadinessSnapshot,
  resolvePulseIntegrationConfig,
} from "./pulseReadiness";

test("resolvePulseIntegrationConfig reads pulse env values", () => {
  const config = resolvePulseIntegrationConfig({
    PULSE_WEB_BASE_URL: "https://pulse.tokentap.ca/",
    PULSE_API_BASE_URL: "https://api.pulse.tokentap.ca/",
    PULSE_INTERNAL_API_TOKEN: "secret",
    PULSE_PROJECT_SLUG: "wheat-and-stone",
  });

  assert.deepEqual(config, {
    webBaseUrl: "https://pulse.tokentap.ca",
    apiBaseUrl: "https://api.pulse.tokentap.ca",
    internalTokenConfigured: true,
    projectSlug: "wheat-and-stone",
    configured: true,
  });
});

test("fetchPulseReadinessSnapshot reports health when pulse api responds", async () => {
  const config = resolvePulseIntegrationConfig({
    PULSE_API_BASE_URL: "https://api.pulse.tokentap.ca",
  });

  const snapshot = await fetchPulseReadinessSnapshot(config, {
    fetchImpl: async () =>
      new Response(JSON.stringify({ status: "ok", time: "2026-03-11T19:05:00.000Z" }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }),
  });

  assert.deepEqual(snapshot, {
    configured: true,
    webBaseUrl: null,
    apiBaseUrl: "https://api.pulse.tokentap.ca",
    projectSlug: null,
    internalTokenConfigured: false,
    reachable: true,
    status: "ok",
    checkedAt: "2026-03-11T19:05:00.000Z",
    error: null,
  });
});
