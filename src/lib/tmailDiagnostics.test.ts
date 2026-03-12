import assert from "node:assert/strict";
import { test } from "node:test";
import {
  fetchTmailSnapshot,
  type TmailSnapshot,
} from "./tmailDiagnostics";

const BASE_CONFIG = {
  provider: "tmail",
  apiKey: "tmail-secret",
  from: "info@wheatandstone.ca",
  apiBaseUrl: "https://api.tmail.example/api",
  tmailIdentityId: "ws-info",
  configured: true,
} as const;

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

test("fetchTmailSnapshot maps identity health and recent password reset mail", async () => {
  const seenUrls: string[] = [];

  const snapshot = await fetchTmailSnapshot(BASE_CONFIG, {
    fetchImpl: async (input) => {
      const url = String(input);
      seenUrls.push(url);

      if (url.endsWith("/dashboard/summary")) {
        return jsonResponse({
          identities: [
            {
              id: "ws-info",
              label: "Wheat & Stone Info",
              email_address: "info@wheatandstone.ca",
              status: "active",
              health: {
                secretConfigured: true,
                status: "healthy",
              },
            },
          ],
          domains: [
            {
              domain: "wheatandstone.ca",
              spf: "pass",
              dkim: "pass",
              dmarc: "pass",
              mx: "pass",
            },
          ],
          alerts: [
            {
              id: "alert-1",
              level: "info",
              title: "Healthy",
              body: "Everything is configured.",
            },
          ],
        });
      }

      if (url.endsWith("/messages?limit=12")) {
        return jsonResponse({
          items: [
            {
              id: "msg-1",
              subject: "Reset your Wheat & Stone password",
              status: "Sent",
              sent_at: "2026-03-11T17:21:09.963Z",
              created_at: "2026-03-11T17:21:05.000Z",
              recipients: ["tonyblum@me.com"],
              identity_id: "ws-info",
            },
            {
              id: "msg-2",
              subject: "A different email",
              status: "Sent",
              recipients: ["ignore@example.com"],
            },
          ],
        });
      }

      if (url.endsWith("/healthz")) {
        return jsonResponse({
          status: "ok",
        });
      }

      throw new Error(`Unexpected URL ${url}`);
    },
  });

  assert.deepEqual(seenUrls.sort(), [
    "https://api.tmail.example/api/dashboard/summary",
    "https://api.tmail.example/api/messages?limit=12",
    "https://api.tmail.example/healthz",
  ]);
  assert.equal(snapshot.reachable, true);
  assert.equal(snapshot.publicHealth.reachable, true);
  assert.equal(snapshot.summaryFeed.reachable, true);
  assert.equal(snapshot.messagesFeed.reachable, true);
  assert.equal(snapshot.identityId, "ws-info");
  assert.equal(snapshot.identityEmail, "info@wheatandstone.ca");
  assert.equal(snapshot.identityStatus, "healthy");
  assert.equal(snapshot.secretConfigured, true);
  assert.equal(snapshot.latestPasswordResetMessage?.id, "msg-1");
  assert.deepEqual(snapshot.latestPasswordResetMessage?.recipients, ["tonyblum@me.com"]);
  assert.equal(snapshot.domains[0]?.spf, "pass");
  assert.equal(snapshot.alerts[0]?.title, "Healthy");
});

test("fetchTmailSnapshot reports incomplete TMail config without making network calls", async () => {
  let fetchCalls = 0;

  const snapshot = await fetchTmailSnapshot(
    {
      ...BASE_CONFIG,
      apiKey: null,
      configured: false,
    },
    {
      fetchImpl: async () => {
        fetchCalls += 1;
        return jsonResponse({});
      },
    },
  );

  assert.equal(fetchCalls, 0);
  assert.equal(snapshot.reachable, false);
  assert.equal(snapshot.configured, false);
  assert.match(snapshot.error ?? "", /incomplete/i);
});

test("fetchTmailSnapshot surfaces transport failures in the admin rail", async () => {
  const snapshot = await fetchTmailSnapshot(BASE_CONFIG, {
    fetchImpl: async (input) => {
      const url = String(input);
      if (url.endsWith("/healthz")) {
        return jsonResponse({ status: "ok" });
      }
      if (url.endsWith("/dashboard/summary")) {
        return jsonResponse({ identities: [] });
      }

      throw new Error("tmail messages unavailable");
    },
  });

  assert.equal(snapshot.reachable, false);
  assert.equal(snapshot.publicHealth.reachable, true);
  assert.equal(snapshot.summaryFeed.reachable, true);
  assert.equal(snapshot.messagesFeed.reachable, false);
  assert.equal(snapshot.error, "messages feed tmail messages unavailable");
  assert.equal(snapshot.latestPasswordResetMessage, null);
});

test("fetchTmailSnapshot reports public edge failures separately from authenticated feeds", async () => {
  const snapshot = await fetchTmailSnapshot(BASE_CONFIG, {
    fetchImpl: async (input) => {
      const url = String(input);
      if (url.endsWith("/healthz")) {
        return jsonResponse({ error: "bad gateway" }, 502);
      }
      if (url.endsWith("/dashboard/summary")) {
        return jsonResponse({ identities: [] });
      }
      if (url.endsWith("/messages?limit=12")) {
        return jsonResponse({ items: [] });
      }
      throw new Error(`Unexpected URL ${url}`);
    },
  });

  assert.equal(snapshot.reachable, true);
  assert.equal(snapshot.publicHealth.reachable, false);
  assert.equal(snapshot.publicHealth.status, 502);
  assert.equal(snapshot.error, "public health request returned 502");
});
