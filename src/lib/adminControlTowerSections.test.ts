import assert from "node:assert/strict";
import { test } from "node:test";

import { buildControlTowerSectionDiagnostics } from "./adminControlTowerSections";

test("buildControlTowerSectionDiagnostics flags degraded sections clearly", () => {
  const diagnostics = buildControlTowerSectionDiagnostics({
    memberValueSnapshot: {
      generatedAt: "2026-03-12T16:00:00.000Z",
      wallets: {
        error: "wallet bridge offline",
      },
      remoteRewards: {
        error: null,
      },
      summary: {
        activeSubscriptions: 2,
        trialingSubscriptions: 1,
        linkedWallets: 1,
        rewardEntries7d: 4,
        subscriptionMismatches: 1,
        rewardedUsersWithoutWallet: 2,
      },
    } as any,
    notificationSnapshot: {
      generatedAt: "2026-03-12T16:01:00.000Z",
      available: true,
      error: null,
      summary: {
        totalJobs: 6,
        sent: 3,
        failed: 1,
        queued: 1,
        retrying: 1,
        overdue: 1,
      },
    } as any,
    operationsSnapshot: {
      generatedAt: "2026-03-12T16:02:00.000Z",
      summary: {
        totalSignals: 8,
        attentionSignals: 2,
        automationSignals: 3,
        notificationSignals: 2,
        supportSignals: 1,
      },
      recentEvents: [
        {
          occurredAt: "2026-03-12T16:02:30.000Z",
        },
      ],
    } as any,
    businessRadarSnapshot: {
      generatedAt: "2026-03-12T16:03:00.000Z",
      summary: {
        businessCount: 4,
        liveOfferCount: 6,
        leadCount: 9,
        businessesNeedingAttention: 2,
        lowStockCount: 3,
        notificationFailedCount: 1,
      },
    } as any,
  });

  assert.deepEqual(
    diagnostics.map((section) => ({
      id: section.id,
      status: section.status,
    })),
    [
      { id: "member-value", status: "warn" },
      { id: "notifications", status: "warn" },
      { id: "operations", status: "warn" },
      { id: "business-radar", status: "warn" },
    ],
  );
});
