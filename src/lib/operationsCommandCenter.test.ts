import assert from "node:assert/strict";
import test from "node:test";
import { buildOperationsCommandCenterSnapshot } from "@/lib/operationsCommandCenter";

test("buildOperationsCommandCenterSnapshot normalizes recent ops activity", () => {
  const snapshot = buildOperationsCommandCenterSnapshot({
    generatedAt: "2026-03-11T18:00:00.000Z",
    fulfillmentRuns: [
      {
        id: "ful-1",
        source: "SCHEDULED",
        status: "SUCCESS",
        autoAssignedCount: 3,
        overdueLeadCount: 0,
        openLeadCount: 5,
        unassignedLeadCount: 0,
        digestQueued: true,
        escalationQueued: false,
        actorEmail: "ops@wheatandstone.ca",
        startedAt: "2026-03-11T17:55:00.000Z",
        completedAt: "2026-03-11T17:56:00.000Z",
        business: {
          id: "biz-1",
          name: "Stone Creek",
        },
      },
    ],
    savedMatchAssignments: [
      {
        id: "saved-1",
        userEmail: "member@example.com",
        status: "ACTIVE",
        assignedAt: "2026-03-11T17:50:00.000Z",
        offer: {
          id: "offer-1",
          title: "Spring Grain Box",
        },
        business: {
          id: "biz-1",
          name: "Stone Creek",
        },
      },
    ],
    notificationAuditLogs: [
      {
        id: "audit-1",
        jobId: "job-1",
        event: "attempt_failed",
        channel: "email",
        provider: "tmail",
        attempt: 1,
        message: "Mailbox full",
        detail: null,
        createdAt: "2026-03-11T17:59:00.000Z",
      },
      {
        id: "audit-2",
        jobId: "job-1",
        event: "attempt_succeeded",
        channel: "email",
        provider: "tmail",
        attempt: 2,
        message: "Delivered",
        detail: null,
        createdAt: "2026-03-11T17:58:00.000Z",
      },
    ],
    identityRuns: [
      {
        id: "identity-1",
        mode: "manual",
        wsApiAvailable: true,
        scannedCount: 44,
        roleMismatchBefore: 2,
        roleMismatchAfter: 1,
        localOnlyCount: 0,
        wsApiOnlyCount: 1,
        wsApiRoleUpdated: 1,
        localUsersCreated: 0,
        createdAt: "2026-03-11T17:40:00.000Z",
      },
    ],
    publicProbes: [
      {
        id: "probe-1",
        origin: "https://wheatandstone.ca",
        homeStatus: 200,
        hasOgImage: true,
        hasTwitterCard: true,
        hasSummaryLargeImage: true,
        createdAt: "2026-03-11T17:30:00.000Z",
      },
    ],
    accountRescues: [
      {
        id: "rescue-1",
        targetEmail: "locked@example.com",
        wsApiAvailable: true,
        localPasswordUpdated: false,
        wsApiPasswordUpdated: false,
        resetDispatchDelivered: false,
        resetDispatchProvider: "tmail",
        resetDispatchReason: "delivery unavailable",
        actorEmail: "owner@wheatandstone.ca",
        createdAt: "2026-03-11T17:20:00.000Z",
      },
    ],
    passwordResetDispatches: [
      {
        id: "reset-1",
        email: "member@example.com",
        source: "forgot-password",
        provider: "tmail",
        delivered: true,
        reason: null,
        requestedByEmail: null,
        createdAt: "2026-03-11T17:10:00.000Z",
      },
    ],
    notes: ["WS-API notifications are live.", "WS-API notifications are live.", null],
  });

  assert.deepEqual(snapshot.notes, ["WS-API notifications are live."]);
  assert.equal(snapshot.summary.totalSignals, 8);
  assert.equal(snapshot.summary.attentionSignals, 3);
  assert.equal(snapshot.summary.automationSignals, 2);
  assert.equal(snapshot.summary.notificationSignals, 2);
  assert.equal(snapshot.summary.supportSignals, 2);
  assert.equal(snapshot.sourceCounts.publicProbes, 1);
  assert.equal(snapshot.recentEvents[0]?.id, "notification-audit:audit-1");
  assert.equal(snapshot.recentEvents[1]?.status, "good");
  assert.equal(snapshot.attentionEvents[0]?.source, "notification-audit");
  assert.equal(snapshot.attentionEvents[1]?.source, "identity-auto-heal");
  assert.equal(snapshot.attentionEvents[2]?.source, "account-rescue");
});
