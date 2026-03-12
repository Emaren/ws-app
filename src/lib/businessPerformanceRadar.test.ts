import assert from "node:assert/strict";
import test from "node:test";
import { buildBusinessPerformanceRadarSnapshot } from "@/lib/businessPerformanceRadar";

test("buildBusinessPerformanceRadarSnapshot summarizes per-business coverage and demand", () => {
  const snapshot = buildBusinessPerformanceRadarSnapshot({
    generatedAt: "2026-03-11T18:30:00.000Z",
    windowDays: 30,
    businesses: [
      {
        id: "biz-1",
        slug: "stone-creek",
        name: "Stone Creek",
        status: "ACTIVE",
        isVerified: true,
        storeProfile: {
          deliveryEnabled: true,
          pickupEnabled: true,
        },
        counts: {
          notificationRecipients: 24,
        },
      },
      {
        id: "biz-2",
        slug: "grain-hollow",
        name: "Grain Hollow",
        status: "ACTIVE",
        isVerified: false,
        storeProfile: {
          deliveryEnabled: false,
          pickupEnabled: true,
        },
        counts: {
          notificationRecipients: 4,
        },
      },
    ],
    inventoryItems: [
      {
        businessId: "biz-1",
        productId: "prod-1",
        quantityOnHand: 10,
        lowStockThreshold: 3,
        isActive: true,
      },
      {
        businessId: "biz-2",
        productId: null,
        quantityOnHand: 2,
        lowStockThreshold: 5,
        isActive: false,
      },
    ],
    offers: [
      {
        businessId: "biz-1",
        productId: "prod-1",
        status: "LIVE",
        featured: true,
      },
      {
        businessId: "biz-2",
        productId: null,
        status: "DRAFT",
        featured: false,
      },
    ],
    leads: [
      {
        businessId: "biz-1",
        status: "FULFILLED",
        totalCents: 4200,
      },
      {
        businessId: "biz-1",
        status: "NEW",
        totalCents: 1800,
      },
      {
        businessId: "biz-2",
        status: "NEW",
        totalCents: 900,
      },
      {
        businessId: "biz-2",
        status: "RESERVED",
        totalCents: 1400,
      },
    ],
    rewards: [
      {
        businessId: "biz-1",
        token: "STONE",
        direction: "CREDIT",
        amount: 8,
      },
      {
        businessId: "biz-2",
        token: "WHEAT",
        direction: "CREDIT",
        amount: 3,
      },
    ],
    notificationJobs: [
      {
        id: "job-1",
        businessId: "biz-1",
        channel: "email",
        audience: "all",
        subject: "Weekend Drop",
        message: "Live now",
        metadata: null,
        status: "sent",
        provider: "tmail",
        attempts: 1,
        maxAttempts: 3,
        nextAttemptAt: "2026-03-11T18:10:00.000Z",
        lastAttemptAt: "2026-03-11T18:05:00.000Z",
        sentAt: "2026-03-11T18:05:00.000Z",
        failedAt: null,
        lastError: null,
        createdAt: "2026-03-11T18:00:00.000Z",
        updatedAt: "2026-03-11T18:05:00.000Z",
      },
      {
        id: "job-2",
        businessId: "biz-2",
        channel: "push",
        audience: "segment",
        subject: null,
        message: "Heads up",
        metadata: null,
        status: "failed",
        provider: "webpush",
        attempts: 3,
        maxAttempts: 3,
        nextAttemptAt: "2026-03-11T18:10:00.000Z",
        lastAttemptAt: "2026-03-11T18:05:00.000Z",
        sentAt: null,
        failedAt: "2026-03-11T18:05:00.000Z",
        lastError: "subscription expired",
        createdAt: "2026-03-11T18:00:00.000Z",
        updatedAt: "2026-03-11T18:05:00.000Z",
      },
    ],
  });

  assert.equal(snapshot.summary.businessCount, 2);
  assert.equal(snapshot.summary.deliveryReadyCount, 1);
  assert.equal(snapshot.summary.liveOfferCount, 1);
  assert.equal(snapshot.summary.notificationFailedCount, 1);
  assert.equal(snapshot.summary.rewardTotals.STONE, 8);
  assert.equal(snapshot.summary.rewardTotals.WHEAT, 3);
  assert.equal(snapshot.topBusinesses[0]?.businessId, "biz-1");
  assert.equal(snapshot.watchlist[0]?.businessId, "biz-2");
  assert.equal(snapshot.watchlist[0]?.needsAttention, true);
  assert.equal(snapshot.watchlist[0]?.attentionReasons.includes("No active inventory"), true);
  assert.equal(snapshot.watchlist[0]?.attentionReasons.includes("No live offers"), true);
});
