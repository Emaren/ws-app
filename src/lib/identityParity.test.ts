import assert from "node:assert/strict";
import { test } from "node:test";
import { buildIdentityParitySnapshot } from "./identityParity";

test("buildIdentityParitySnapshot summarizes and sorts drift rows by severity", () => {
  const snapshot = buildIdentityParitySnapshot({
    localUsers: [
      {
        id: "local-owner",
        email: "owner@example.com",
        name: "Owner",
        role: "OWNER",
        registeredVia: "CREDENTIALS",
        registeredAt: "2026-03-10T10:00:00.000Z",
        lastAuthProvider: "CREDENTIALS",
        lastAuthAt: "2026-03-11T10:00:00.000Z",
      },
      {
        id: "local-only",
        email: "local-only@example.com",
        name: "Local Only",
        role: "EDITOR",
        registeredVia: "GOOGLE",
        registeredAt: "2026-03-09T10:00:00.000Z",
        lastAuthProvider: null,
        lastAuthAt: null,
      },
      {
        id: "matched",
        email: "matched@example.com",
        name: "Matched",
        role: "USER",
        registeredVia: "CREDENTIALS",
        registeredAt: "2026-03-08T10:00:00.000Z",
        lastAuthProvider: "CREDENTIALS",
        lastAuthAt: "2026-03-11T08:00:00.000Z",
      },
    ],
    wsUsers: [
      {
        id: "ws-owner",
        email: "owner@example.com",
        name: "Owner",
        role: "ADMIN",
        createdAt: "2026-03-10T10:00:00.000Z",
        updatedAt: "2026-03-11T10:05:00.000Z",
      },
      {
        id: "matched",
        email: "matched@example.com",
        name: "Matched",
        role: "USER",
        createdAt: "2026-03-08T10:00:00.000Z",
        updatedAt: "2026-03-11T08:05:00.000Z",
      },
      {
        id: "ws-only",
        email: "ws-only@example.com",
        name: "WS Only",
        role: "CONTRIBUTOR",
        createdAt: "2026-03-07T10:00:00.000Z",
        updatedAt: "2026-03-11T07:00:00.000Z",
      },
    ],
    offerBadgeCountsByEmail: {
      "owner@example.com": 3,
      "local-only@example.com": 1,
    },
  });

  assert.deepEqual(snapshot.summary, {
    total: 4,
    matched: 1,
    roleMismatches: 1,
    localOnly: 1,
    wsApiOnly: 1,
    zeroOfferUsers: 2,
  });

  assert.deepEqual(
    snapshot.rows.map((row) => ({
      email: row.email,
      status: row.status,
      offerBadgeCount: row.offerBadgeCount,
    })),
    [
      {
        email: "owner@example.com",
        status: "ROLE_MISMATCH",
        offerBadgeCount: 3,
      },
      {
        email: "local-only@example.com",
        status: "LOCAL_ONLY",
        offerBadgeCount: 1,
      },
      {
        email: "ws-only@example.com",
        status: "WSAPI_ONLY",
        offerBadgeCount: 0,
      },
      {
        email: "matched@example.com",
        status: "MATCHED",
        offerBadgeCount: 0,
      },
    ],
  );
});
