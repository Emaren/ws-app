import assert from "node:assert/strict";
import { test } from "node:test";
import { buildNotificationCommandCenterSnapshot } from "./notificationCommandCenter";

test("buildNotificationCommandCenterSnapshot summarizes queue health and recent campaigns", () => {
  const now = Date.now();
  const past = (minutes: number) => new Date(now - minutes * 60_000).toISOString();
  const future = (minutes: number) => new Date(now + minutes * 60_000).toISOString();

  const snapshot = buildNotificationCommandCenterSnapshot({
    generatedAt: past(1),
    accessTokenPresent: true,
    jobs: [
      {
        id: "job-1",
        businessId: "business-1",
        channel: "email",
        audience: "all",
        subject: "Weekend drop",
        message: "Weekend offer is live.",
        metadata: {
          campaignName: "Weekend Drop",
          scheduledFor: past(10),
        },
        status: "sent",
        provider: "resend",
        attempts: 1,
        maxAttempts: 3,
        nextAttemptAt: past(10),
        lastAttemptAt: past(9),
        sentAt: past(9),
        failedAt: null,
        lastError: null,
        createdAt: past(11),
        updatedAt: past(9),
      },
      {
        id: "job-2",
        businessId: "business-2",
        channel: "push",
        audience: "direct:webpush:abc",
        subject: null,
        message: "Push fallback test",
        metadata: null,
        status: "failed",
        provider: "webpush",
        attempts: 3,
        maxAttempts: 3,
        nextAttemptAt: past(15),
        lastAttemptAt: past(14),
        sentAt: null,
        failedAt: past(14),
        lastError: "subscription expired",
        createdAt: past(20),
        updatedAt: past(14),
      },
      {
        id: "job-3",
        businessId: "business-1",
        channel: "email",
        audience: "segment:vip",
        subject: null,
        message: "Scheduled reminder",
        metadata: {
          scheduledFor: future(30),
        },
        status: "queued",
        provider: null,
        attempts: 0,
        maxAttempts: 3,
        nextAttemptAt: future(30),
        lastAttemptAt: null,
        sentAt: null,
        failedAt: null,
        lastError: null,
        createdAt: past(5),
        updatedAt: past(5),
      },
    ],
    auditLogs: [
      {
        id: "audit-1",
        jobId: "job-2",
        event: "fallback_queued",
        channel: "push",
        provider: "webpush",
        attempt: 1,
        message: "Push delivery failed; queued fallback notifications",
        detail: {
          queuedChannels: ["email"],
        },
        createdAt: past(14),
      },
    ],
    businessNameById: {
      "business-1": "Avalon",
      "business-2": "Crimson Grove",
    },
    error: null,
  });

  assert.deepEqual(snapshot.summary, {
    totalJobs: 3,
    queued: 1,
    processing: 0,
    retrying: 0,
    sent: 1,
    failed: 1,
    overdue: 0,
    scheduledAhead: 1,
    emailJobs: 2,
    smsJobs: 0,
    pushJobs: 1,
    distinctBusinesses: 2,
    distinctCampaigns: 3,
    fallbackQueued: 1,
  });

  assert.deepEqual(snapshot.providers, ["resend", "webpush"]);
  assert.equal(snapshot.recentJobs[0]?.campaignName, "Scheduled reminder");
  assert.equal(snapshot.recentFailures[0]?.businessName, "Crimson Grove");
  assert.equal(snapshot.recentAudit[0]?.event, "fallback_queued");
});
