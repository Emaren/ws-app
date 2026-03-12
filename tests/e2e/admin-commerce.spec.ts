import { expect, test, type Route } from "@playwright/test";

function fulfillJson(route: Route, payload: unknown) {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(payload),
  });
}

const smokeBaseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3211";

const ownerSession = {
  user: {
    name: "Tony Blum",
    email: "tonyblum@me.com",
    role: "OWNER",
  },
  expires: "2099-01-01T00:00:00.000Z",
};

const commerceOverview = {
  generatedAt: "2026-03-12T01:30:00.000Z",
  scope: {
    mode: "GLOBAL",
    managedBusinessIds: ["biz-ws"],
  },
  selectedBusinessId: "biz-ws",
  activityWindow: {
    days: 30,
    startsAt: "2026-02-11T01:30:00.000Z",
  },
  businesses: [
    {
      id: "biz-ws",
      slug: "wheat-stone-marketplace",
      name: "Wheat & Stone Marketplace",
      status: "ACTIVE",
      isVerified: true,
      timezone: "America/Edmonton",
      contactEmail: "ops@wheatandstone.ca",
      storeProfile: {
        id: "store-ws",
        displayName: "Wheat & Stone Marketplace",
        description: "Local premium delivery routes.",
        logoUrl: null,
        heroImageUrl: null,
        websiteUrl: "https://wheatandstone.ca",
        city: "Edmonton",
        region: "AB",
        country: "Canada",
        deliveryRadiusKm: 25,
        deliveryEnabled: true,
        pickupEnabled: true,
        notificationEmail: "ops@wheatandstone.ca",
        updatedAt: "2026-03-12T01:00:00.000Z",
      },
      inventoryCount: 1,
      offerCount: 1,
    },
  ],
  products: [
    {
      id: "prod-milk",
      slug: "avalon-organic-chocolate-milk",
      name: "Avalon Organic Chocolate Milk",
      category: "Dairy",
      brandName: "Avalon",
      reviewCount: 3,
      inventoryCount: 1,
      offerCount: 1,
    },
  ],
  inventoryItems: [
    {
      id: "inv-milk",
      businessId: "biz-ws",
      businessName: "Wheat & Stone Marketplace",
      productId: "prod-milk",
      productSlug: "avalon-organic-chocolate-milk",
      productName: "Avalon Organic Chocolate Milk",
      sku: "avalon-milk-1l",
      name: "Marketplace delivery milk route",
      description: "Cold-chain delivery route.",
      category: "Dairy",
      unitLabel: "1L carton",
      imageUrl: null,
      priceCents: 799,
      compareAtCents: 999,
      quantityOnHand: 2,
      lowStockThreshold: 3,
      isActive: true,
      offerCount: 1,
      updatedAt: "2026-03-12T01:20:00.000Z",
    },
  ],
  offers: [
    {
      id: "offer-milk",
      businessId: "biz-ws",
      businessName: "Wheat & Stone Marketplace",
      inventoryItemId: "inv-milk",
      inventoryItemName: "Marketplace delivery milk route",
      productId: "prod-milk",
      productSlug: "avalon-organic-chocolate-milk",
      productName: "Avalon Organic Chocolate Milk",
      title: "Weekend chocolate milk drop",
      description: "Featured local delivery spotlight.",
      status: "LIVE",
      badgeText: "Weekend drop",
      discountPriceCents: 699,
      startsAt: "2026-03-12T00:00:00.000Z",
      endsAt: null,
      unitsTotal: 25,
      ctaUrl: "https://wheatandstone.ca/offers",
      featured: true,
      updatedAt: "2026-03-12T01:25:00.000Z",
    },
  ],
  networkSummary: {
    businessCount: 1,
    deliveryReadyCount: 1,
    inventoryCount: 1,
    productLinkedInventoryCount: 1,
    liveOfferCount: 1,
    productLinkedOfferCount: 1,
  },
  selectedActivitySummary: {
    leadCount: 3,
    openLeadCount: 2,
    reservedLeadCount: 1,
    fulfilledLeadCount: 1,
    cancelledLeadCount: 0,
    trackedDemandCents: 2397,
    avgLeadValueCents: 799,
    leadToReserveRate: 33,
    leadToFulfillmentRate: 33,
    notificationOptInCount: 2,
    rewardCount: 4,
    rewardTotals: {
      WHEAT: 5,
      STONE: 8,
    },
  },
  recentLeads: [
    {
      id: "lead-1",
      status: "NEW",
      source: "DELIVERY_REQUEST",
      requestedQty: 1,
      totalCents: 799,
      requestedAt: "2026-03-12T01:00:00.000Z",
      updatedAt: "2026-03-12T01:05:00.000Z",
      deliveryAddress: "123 Prairie Ave",
      recipientName: "Pat Shopper",
      recipientEmail: "pat@example.com",
      recipientPhone: null,
      inventoryItemName: "Marketplace delivery milk route",
      offerTitle: "Weekend chocolate milk drop",
    },
  ],
  recentRewards: [
    {
      id: "reward-1",
      token: "STONE",
      direction: "CREDIT",
      amount: 8,
      reason: "DELIVERY_PURCHASE",
      createdAt: "2026-03-12T01:10:00.000Z",
      userName: "Pat Shopper",
      userEmail: "pat@example.com",
    },
  ],
  businessPerformance: [
    {
      businessId: "biz-ws",
      businessSlug: "wheat-stone-marketplace",
      businessName: "Wheat & Stone Marketplace",
      deliveryEnabled: true,
      activeInventoryCount: 1,
      liveOfferCount: 1,
      leadCount: 3,
      openLeadCount: 2,
      reservedLeadCount: 1,
      fulfilledLeadCount: 1,
      cancelledLeadCount: 0,
      rewardTotals: {
        WHEAT: 5,
        STONE: 8,
      },
      leadToReserveRate: 33,
      leadToFulfillmentRate: 33,
    },
  ],
  selectionSummary: {
    inventoryCount: 1,
    activeInventoryCount: 1,
    productLinkedInventoryCount: 1,
    lowStockCount: 1,
    offerCount: 1,
    liveOfferCount: 1,
    featuredOfferCount: 1,
    productLinkedOfferCount: 1,
    deliveryEnabled: true,
    pickupEnabled: true,
  },
};

const deliveryLeadsResponse = {
  viewer: {
    actorUserId: "owner-tony",
    role: "OWNER",
    isOwnerAdmin: true,
  },
  leads: [
    {
      id: "lead-1",
      businessId: "biz-ws",
      status: "NEW",
      source: "DELIVERY_REQUEST",
      assignedToUserId: null,
      assignedAt: null,
      assignedToName: null,
      requestedQty: 1,
      unitPriceCents: 799,
      totalCents: 799,
      requestedAt: "2026-03-12T01:00:00.000Z",
      fulfillBy: null,
      contactedAt: null,
      fulfilledAt: null,
      cancelledAt: null,
      deliveryAddress: "123 Prairie Ave",
      notes: null,
      createdAt: "2026-03-12T01:00:00.000Z",
      updatedAt: "2026-03-12T01:05:00.000Z",
      business: {
        id: "biz-ws",
        slug: "wheat-stone-marketplace",
        name: "Wheat & Stone Marketplace",
        status: "ACTIVE",
      },
      recipient: {
        id: "recipient-1",
        name: "Pat Shopper",
        email: "pat@example.com",
        phone: null,
        preferredChannel: "EMAIL",
      },
      inventoryItem: {
        id: "inv-milk",
        name: "Marketplace delivery milk route",
        priceCents: 799,
      },
      offer: {
        id: "offer-milk",
        title: "Weekend chocolate milk drop",
        discountPriceCents: 699,
      },
      assignee: null,
    },
  ],
  businesses: [
    {
      id: "biz-ws",
      slug: "wheat-stone-marketplace",
      name: "Wheat & Stone Marketplace",
      status: "ACTIVE",
    },
  ],
  operators: [
    {
      id: "owner-tony",
      name: "Tony Blum",
      email: "tonyblum@me.com",
      role: "OWNER",
    },
  ],
};

const automationOverview = {
  generatedAt: "2026-03-12T01:30:00.000Z",
  selectedBusinessId: "biz-ws",
  businesses: [
    {
      id: "biz-ws",
      slug: "wheat-stone-marketplace",
      name: "Wheat & Stone Marketplace",
      status: "ACTIVE",
    },
  ],
  operators: [
    {
      id: "owner-tony",
      name: "Tony Blum",
      email: "tonyblum@me.com",
      role: "OWNER",
    },
  ],
  config: {
    businessId: "biz-ws",
    defaultAssigneeUserId: "owner-tony",
    defaultAssigneeName: "Tony Blum",
    autoAssignEnabled: true,
    autoEscalateEnabled: true,
    scheduleEnabled: true,
    scheduleIntervalHours: 6,
    slaHours: 24,
    digestEnabled: true,
    digestCadenceHours: 24,
    escalationCooldownHours: 6,
    escalationEmail: "ops@wheatandstone.ca",
    digestEmail: "digest@wheatandstone.ca",
    customerContactTemplate: "Hello from Wheat & Stone.",
    delayUpdateTemplate: "We are still working on your request.",
    escalationTemplate: "Overdue delivery queue alert.",
    digestTemplate: "Daily fulfillment digest.",
    lastRunAt: "2026-03-12T00:30:00.000Z",
    lastEscalationAt: null,
    lastDigestAt: "2026-03-12T00:45:00.000Z",
    lastRunSummary: {
      openLeadCount: 2,
      autoAssignedCount: 1,
    },
  },
  summary: {
    openLeadCount: 2,
    unassignedLeadCount: 1,
    overdueLeadCount: 0,
    autoAssignableLeadCount: 1,
    escalationCandidateCount: 0,
  },
  previews: {
    customerContact: "Hello from Wheat & Stone.",
    delayUpdate: "We are still working on your request.",
    escalation: "Overdue delivery queue alert.",
    digest: "Daily fulfillment digest.",
  },
  recentRuns: [
    {
      id: "run-1",
      source: "SCHEDULED",
      status: "SUCCESS",
      actorEmail: "system@wheatandstone.ca",
      autoAssignedCount: 1,
      overdueLeadCount: 0,
      openLeadCount: 2,
      unassignedLeadCount: 1,
      escalationQueued: false,
      digestQueued: true,
      escalationSkippedReason: "Nothing overdue",
      digestSkippedReason: null,
      startedAt: "2026-03-12T00:30:00.000Z",
      completedAt: "2026-03-12T00:31:00.000Z",
    },
  ],
  recentAlerts: [],
  performance: {
    runs30d: 8,
    manualRuns30d: 2,
    scheduledRuns30d: 6,
    successRate30d: 100,
    escalationsQueued30d: 0,
    digestsQueued30d: 6,
    avgOverdueLeadCount30d: 0,
    avgAutoAssignedCount30d: 1,
    fulfilledLeadCount30d: 4,
  },
  operatorPerformance: [
    {
      operatorKey: "owner-tony",
      operatorName: "Tony Blum",
      openLeadCount: 2,
      overdueLeadCount: 0,
      fulfilledLeadCount: 4,
    },
  ],
  schedulerOverview: [
    {
      businessId: "biz-ws",
      businessName: "Wheat & Stone Marketplace",
      scheduleEnabled: true,
      scheduleIntervalHours: 6,
      autoAssignEnabled: true,
      autoEscalateEnabled: true,
      digestEnabled: true,
      lastRunAt: "2026-03-12T00:30:00.000Z",
      lastDigestAt: "2026-03-12T00:45:00.000Z",
      nextRunAt: "2026-03-12T06:30:00.000Z",
      nextDigestAt: "2026-03-13T00:45:00.000Z",
      nextRunLabel: "In 6 hours",
      nextDigestLabel: "Tomorrow morning",
      summary: {
        openLeadCount: 2,
        unassignedLeadCount: 1,
        overdueLeadCount: 0,
        autoAssignableLeadCount: 1,
        escalationCandidateCount: 0,
      },
    },
  ],
  networkSummary: {
    scheduledStores: 1,
    scheduledDueNow: 0,
    digestStores: 1,
    digestDueNow: 0,
    openLeadCount: 2,
    overdueLeadCount: 0,
  },
};

test("admin commerce renders the commerce control tower and ledgers for an owner session", async ({
  page,
}) => {
  await page.context().addCookies([
    {
      name: "ws-e2e-role",
      value: "OWNER",
      url: smokeBaseUrl,
    },
    {
      name: "ws-e2e-email",
      value: "tonyblum@me.com",
      url: smokeBaseUrl,
    },
  ]);

  await page.route("**/api/auth/session", async (route) => {
    await fulfillJson(route, ownerSession);
  });
  await page.route("**/api/admin/commerce/overview**", async (route) => {
    await fulfillJson(route, commerceOverview);
  });
  await page.route("**/api/delivery-leads**", async (route) => {
    await fulfillJson(route, deliveryLeadsResponse);
  });
  await page.route("**/api/notifications/jobs**", async (route) => {
    await fulfillJson(route, []);
  });
  await page.route("**/api/admin/commerce/fulfillment-automation**", async (route) => {
    await fulfillJson(route, automationOverview);
  });

  await page.goto("/admin/commerce");

  await expect(page.getByText("Commerce Console", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Store Activation Rail", { exact: true })).toBeVisible();
  await expect(page.getByText("Selected Store", { exact: true })).toBeVisible();
  await expect(page.getByText("Inventory Studio", { exact: true })).toBeVisible();
  await expect(page.getByText("Offer Studio", { exact: true })).toBeVisible();
  await expect(page.getByText("Operator Shortcuts", { exact: true })).toBeVisible();
  await expect(page.getByText("Recent Leads", { exact: true })).toBeVisible();
  await expect(page.getByText("Recent Rewards", { exact: true })).toBeVisible();
  await expect(page.getByText("Inventory Ledger", { exact: true })).toBeVisible();
  await expect(page.getByText("Offer Ledger", { exact: true })).toBeVisible();
  await expect(page.getByText("Open pipeline", { exact: true })).toBeVisible();
  await expect(page.getByText("Rules", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Scheduler board", { exact: true })).toBeVisible();
  await expect(page.getByText("Execution trail", { exact: true })).toBeVisible();
  await expect(page.getByText("Escalations and digests", { exact: true })).toBeVisible();
  await expect(page.getByText("Operator board", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Marketplace delivery milk route" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Weekend chocolate milk drop" }),
  ).toBeVisible();
  await expect(
    page.locator("#inventory-ledger").getByText("Low stock", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Automation Center", { exact: true })).toBeVisible();
});
