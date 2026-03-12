import test from "node:test";
import assert from "node:assert/strict";
import { buildCommerceActivationRail } from "@/lib/commerceActivationRail";
import {
  buildCommerceActivationActionLinks,
  buildCommerceNetworkStats,
  buildCommerceSelectedStoreStats,
} from "./commerceConsolePresentation";

test("buildCommerceNetworkStats and selected store stats stay owner-readable", () => {
  assert.deepEqual(
    buildCommerceNetworkStats({
      businessCount: 2,
      deliveryReadyCount: 1,
      inventoryCount: 6,
      productLinkedInventoryCount: 4,
      liveOfferCount: 3,
      productLinkedOfferCount: 2,
    }),
    [
      { label: "Businesses", value: 2 },
      { label: "Delivery ready", value: 1 },
      { label: "Inventory", value: 6 },
      { label: "Linked inventory", value: 4 },
      { label: "Live offers", value: 3 },
      { label: "Linked offers", value: 2 },
    ],
  );

  assert.deepEqual(
    buildCommerceSelectedStoreStats({
      leadCount: 8,
      openLeadCount: 3,
      reservedLeadCount: 2,
      fulfilledLeadCount: 1,
      notificationOptInCount: 4,
      rewardCount: 6,
    }),
    [
      { label: "Delivery leads", value: 8 },
      { label: "Open pipeline", value: 3 },
      { label: "Reserved", value: 2 },
      { label: "Fulfilled", value: 1 },
      { label: "Opt-ins", value: 4 },
      { label: "Rewards", value: 6 },
    ],
  );
});

test("buildCommerceActivationActionLinks only exposes needed next steps", () => {
  const activationRail = buildCommerceActivationRail({
    businessName: "Wheat & Stone Marketplace",
    storeProfile: {
      displayName: null,
      description: null,
      city: null,
      region: null,
      country: null,
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

  assert.deepEqual(buildCommerceActivationActionLinks(activationRail), [
    { href: "#store-profile", label: "Complete store profile" },
    { href: "#inventory-studio", label: "Open inventory studio" },
    { href: "#offer-studio", label: "Launch live offer" },
    { href: "#inventory-ledger", label: "Review low stock" },
    { href: "/admin/rewards", label: "Inspect rewards + demand" },
    { href: "/admin/company", label: "Open company dashboards" },
  ]);
});
