import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPageSummary,
  countWarnings,
  dispatchSourceLabel,
  providerLabel,
  statusBadge,
  syncRoleDraftByEmail,
  type IdentityRow,
  type RoleValue,
} from "./accessControlSupport";

function createIdentityRow(overrides?: Partial<IdentityRow>): IdentityRow {
  return {
    email: "owner@example.com",
    status: "ROLE_MISMATCH",
    offerBadgeCount: 2,
    local: {
      id: "local-1",
      email: "owner@example.com",
      name: "Owner",
      role: "ADMIN",
      registeredVia: "GOOGLE",
      registeredAt: "2026-03-12T12:00:00.000Z",
      lastAuthProvider: "GOOGLE",
      lastAuthAt: "2026-03-12T12:00:00.000Z",
    },
    wsApi: {
      id: "ws-1",
      email: "owner@example.com",
      name: "Owner",
      role: "OWNER",
      createdAt: "2026-03-11T12:00:00.000Z",
      updatedAt: "2026-03-12T12:00:00.000Z",
    },
    ...overrides,
  };
}

test("buildPageSummary keeps pagination readable", () => {
  assert.equal(buildPageSummary(null), "No data loaded");
  assert.equal(buildPageSummary({ page: 2, pageSize: 20, total: 51 }), "21-40 of 51");
  assert.equal(buildPageSummary({ page: 1, pageSize: 20, total: 0 }), "0-0 of 0");
});

test("provider and dispatch labels stay operator-friendly", () => {
  assert.equal(providerLabel("GOOGLE"), "Google");
  assert.equal(providerLabel("CREDENTIALS"), "Email");
  assert.equal(providerLabel(null), "-");
  assert.equal(dispatchSourceLabel("SELF_SERVICE"), "Self-service");
  assert.equal(dispatchSourceLabel("ADMIN_RESEND"), "Admin resend");
});

test("statusBadge and warning counting reflect access drift tone", () => {
  assert.match(statusBadge("ROLE_MISMATCH"), /amber/);
  assert.match(statusBadge("MATCHED"), /emerald/);
  assert.equal(countWarnings(["a", "b"]), 2);
  assert.equal(countWarnings({ message: "nope" }), 0);
});

test("syncRoleDraftByEmail seeds drafts without clobbering operator edits", () => {
  const existing: Record<string, RoleValue> = {
    "owner@example.com": "OWNER",
  };
  const rows = [
    createIdentityRow(),
    createIdentityRow({
      email: "editor@example.com",
      local: null,
      wsApi: {
        id: "ws-2",
        email: "editor@example.com",
        name: "Editor",
        role: "EDITOR",
        createdAt: "2026-03-11T12:00:00.000Z",
        updatedAt: "2026-03-12T12:00:00.000Z",
      },
    }),
  ];

  assert.deepEqual(syncRoleDraftByEmail(existing, rows), {
    "owner@example.com": "OWNER",
    "editor@example.com": "EDITOR",
  });
});
