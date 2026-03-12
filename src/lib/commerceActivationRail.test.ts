import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCommerceActivationRail } from "./commerceActivationRail";

test("buildCommerceActivationRail flags missing operational setup", () => {
  const snapshot = buildCommerceActivationRail({
    businessName: "Wheat & Stone Marketplace",
    storeProfile: {
      displayName: "Wheat & Stone Marketplace",
      description: "",
      city: null,
      region: "AB",
      country: "Canada",
      notificationEmail: null,
      deliveryEnabled: false,
      pickupEnabled: false,
    },
    selectionSummary: {
      inventoryCount: 0,
      activeInventoryCount: 0,
      productLinkedInventoryCount: 0,
      lowStockCount: 2,
      offerCount: 0,
      liveOfferCount: 0,
      featuredOfferCount: 0,
      productLinkedOfferCount: 0,
      deliveryEnabled: false,
      pickupEnabled: false,
    },
    selectedActivitySummary: {
      leadCount: 0,
      openLeadCount: 0,
      fulfilledLeadCount: 0,
      notificationOptInCount: 0,
      rewardCount: 0,
      trackedDemandCents: 0,
    },
  });

  assert.equal(snapshot.readinessLabel, "Needs setup");
  assert.equal(snapshot.readinessScore, 0);
  assert.deepEqual(snapshot.actionIds, [
    "profile",
    "catalog",
    "linked-catalog",
    "offers",
    "fulfillment",
    "demand",
    "low-stock",
  ]);
});

test("buildCommerceActivationRail recognizes a ready store", () => {
  const snapshot = buildCommerceActivationRail({
    businessName: "Wheat & Stone Marketplace",
    storeProfile: {
      displayName: "Wheat & Stone Marketplace",
      description: "Local buying and delivery marketplace.",
      city: "Edmonton",
      region: "AB",
      country: "Canada",
      notificationEmail: "ops@wheatandstone.ca",
      deliveryEnabled: true,
      pickupEnabled: true,
    },
    selectionSummary: {
      inventoryCount: 4,
      activeInventoryCount: 4,
      productLinkedInventoryCount: 4,
      lowStockCount: 0,
      offerCount: 2,
      liveOfferCount: 2,
      featuredOfferCount: 1,
      productLinkedOfferCount: 2,
      deliveryEnabled: true,
      pickupEnabled: true,
    },
    selectedActivitySummary: {
      leadCount: 5,
      openLeadCount: 2,
      fulfilledLeadCount: 3,
      notificationOptInCount: 4,
      rewardCount: 5,
      trackedDemandCents: 18900,
    },
  });

  assert.equal(snapshot.readinessLabel, "Ready to scale");
  assert.equal(snapshot.readinessScore, 100);
  assert.deepEqual(snapshot.actionIds, []);
  assert.equal(snapshot.checks.every((check) => check.status === "ready"), true);
});
