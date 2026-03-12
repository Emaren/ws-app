import assert from "node:assert/strict";
import test from "node:test";
import { buildOwnedToolsRail, type OwnedToolsSnapshot } from "./adminOwnedToolsSupport";

function createSnapshot(overrides?: Partial<OwnedToolsSnapshot>): OwnedToolsSnapshot {
  return {
    release: {
      app: {
        packageVersion: "0.1.0",
        buildId: "ws-build-test",
      },
      runtime: {
        siteOrigin: "https://wheatandstone.ca",
      },
    } as OwnedToolsSnapshot["release"],
    wsApi: {
      available: true,
      healthReachable: true,
      baseUrl: "http://127.0.0.1:3310",
      contract: {
        version: "3.9.0",
        routeCount: 106,
      },
      durability: {
        durableModules: 12,
        totalModules: 12,
      },
    } as OwnedToolsSnapshot["wsApi"],
    tmail: {
      configured: true,
      reachable: true,
      baseUrl: "https://api.tmail.tokentap.ca/api",
      publicHealth: { reachable: true, status: 200 },
      summaryFeed: { reachable: true, status: 200 },
      messagesFeed: { reachable: true, status: 200 },
      identityId: "ws-info",
      identityLabel: "Wheat & Stone Info",
      identityEmail: "info@wheatandstone.ca",
    } as OwnedToolsSnapshot["tmail"],
    pulse: {
      configured: false,
      webBaseUrl: null,
      apiBaseUrl: null,
      projectSlug: null,
      reachable: false,
      status: null,
    } as OwnedToolsSnapshot["pulse"],
    publicSurface: {
      origin: "https://wheatandstone.ca",
      homeUrl: "https://wheatandstone.ca",
      apexUrl: "https://wheatandstone.ca",
      xCardBypassUrl: "https://wheatandstone.ca?xcard=test",
      socialImageUrl: "https://wheatandstone.ca/opengraph-image",
      socialImageVersion: "20260312-1",
      facebookComments: {
        targetArticleUrl: "https://wheatandstone.ca/articles/sample",
        embedUrl: "https://www.facebook.com/plugins/comments.php",
        note: "Smoke fixture",
      },
      homeProbe: { ok: true, status: 200, redirectedTo: null, contentType: null, contentLength: null, error: null },
      apexProbe: { ok: true, status: 200, redirectedTo: null, contentType: null, contentLength: null, error: null },
      twitterBotProbe: { ok: true, status: 200, redirectedTo: null, contentType: null, contentLength: null, error: null },
      socialImageProbe: { ok: true, status: 200, redirectedTo: null, contentType: "image/png", contentLength: null, error: null },
      homeMeta: {
        hasOgImage: true,
        hasTwitterCard: true,
        hasSummaryLargeImage: true,
        ogImageCount: 1,
        twitterImageCount: 1,
        hasAbsoluteOgImage: true,
        hasAbsoluteTwitterImage: true,
        ogImageValues: [],
        twitterImageValues: [],
      },
      twitterBotMeta: {
        hasOgImage: true,
        hasTwitterCard: true,
        hasSummaryLargeImage: true,
        ogImageCount: 1,
        twitterImageCount: 1,
        hasAbsoluteOgImage: true,
        hasAbsoluteTwitterImage: true,
        ogImageValues: [],
        twitterImageValues: [],
      },
      warnings: [],
    } as OwnedToolsSnapshot["publicSurface"],
    ...overrides,
  };
}

test("buildOwnedToolsRail summarizes the owned stack for the admin dashboard", () => {
  const tools = buildOwnedToolsRail(createSnapshot());

  assert.equal(tools.length, 5);
  assert.deepEqual(
    tools.map((tool) => tool.label),
    ["Wheat & Stone App", "WS-API", "TMail", "Pulse", "Public Surface"],
  );
  assert.equal(tools[0]?.status, "live");
  assert.equal(tools[1]?.status, "connected");
  assert.equal(tools[2]?.status, "healthy");
  assert.equal(tools[3]?.status, "staged");
  assert.equal(tools[4]?.status, "healthy");
});

test("buildOwnedToolsRail flags degraded rails when probes and services drift", () => {
  const tools = buildOwnedToolsRail(
    createSnapshot({
      wsApi: {
        available: true,
        healthReachable: false,
        baseUrl: "http://127.0.0.1:3310",
        contract: {
          version: "3.9.0",
          routeCount: 106,
        },
        durability: {
          durableModules: 11,
          totalModules: 12,
        },
      } as OwnedToolsSnapshot["wsApi"],
      tmail: {
        configured: true,
        reachable: false,
        baseUrl: "https://api.tmail.tokentap.ca/api",
        publicHealth: { reachable: false, status: 502 },
        summaryFeed: { reachable: false, status: 502 },
        messagesFeed: { reachable: false, status: 502 },
        identityId: "ws-info",
        identityLabel: "Wheat & Stone Info",
        identityEmail: "info@wheatandstone.ca",
      } as OwnedToolsSnapshot["tmail"],
      pulse: {
        configured: true,
        webBaseUrl: "https://pulse.tokentap.ca",
        apiBaseUrl: "https://api.pulse.tokentap.ca",
        projectSlug: "wheat-and-stone",
        reachable: false,
        status: "error",
      } as OwnedToolsSnapshot["pulse"],
      publicSurface: {
        origin: "https://wheatandstone.ca",
        homeUrl: "https://wheatandstone.ca",
        apexUrl: "https://wheatandstone.ca",
        xCardBypassUrl: "https://wheatandstone.ca?xcard=test",
        socialImageUrl: "https://wheatandstone.ca/opengraph-image",
        socialImageVersion: "20260312-1",
        facebookComments: {
          targetArticleUrl: null,
          embedUrl: null,
          note: "No article target",
        },
        homeProbe: { ok: false, status: 500, redirectedTo: null, contentType: null, contentLength: null, error: "home failed" },
        apexProbe: { ok: true, status: 200, redirectedTo: null, contentType: null, contentLength: null, error: null },
        twitterBotProbe: { ok: false, status: 502, redirectedTo: null, contentType: null, contentLength: null, error: "twitter failed" },
        socialImageProbe: { ok: true, status: 200, redirectedTo: null, contentType: "image/png", contentLength: null, error: null },
        homeMeta: {
          hasOgImage: true,
          hasTwitterCard: true,
          hasSummaryLargeImage: true,
          ogImageCount: 1,
          twitterImageCount: 1,
          hasAbsoluteOgImage: true,
          hasAbsoluteTwitterImage: true,
          ogImageValues: [],
          twitterImageValues: [],
        },
        twitterBotMeta: {
          hasOgImage: false,
          hasTwitterCard: false,
          hasSummaryLargeImage: false,
          ogImageCount: 0,
          twitterImageCount: 0,
          hasAbsoluteOgImage: false,
          hasAbsoluteTwitterImage: false,
          ogImageValues: [],
          twitterImageValues: [],
        },
        warnings: ["twitterbot probe failed"],
      } as OwnedToolsSnapshot["publicSurface"],
    }),
  );

  assert.equal(tools.find((tool) => tool.id === "ws-api")?.status, "partial");
  assert.equal(tools.find((tool) => tool.id === "tmail")?.status, "configured");
  assert.equal(tools.find((tool) => tool.id === "pulse")?.status, "configured");
  assert.equal(tools.find((tool) => tool.id === "public-surface")?.status, "attention");
});
