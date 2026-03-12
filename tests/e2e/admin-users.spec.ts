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

const usersAtlasPayload = {
  generatedAt: "2026-03-12T08:00:00.000Z",
  totals: {
    localUsers: 1,
    usersInView: 1,
    anonymousEventsTracked: 2,
    memberEventsTracked: 4,
    registrationAttempts: 2,
    registrationFailures: 1,
    wsApiUsers: 1,
    wsApiOnlyUsers: 0,
    linkedWallets: 1,
  },
  preferenceCatalog: {
    trackedTokens: ["STONE", "WHEAT"],
  },
  users: [
    {
      id: "user-tony",
      email: "tonyblum@me.com",
      name: "Tony Blum",
      role: "OWNER",
      registeredVia: "GOOGLE",
      registeredAt: "2026-03-12T05:00:00.000Z",
      lastAuthProvider: "GOOGLE",
      lastAuthAt: "2026-03-12T07:30:00.000Z",
      createdAt: "2026-03-12T05:00:00.000Z",
      experience: {
        profileImageUrl: null,
        theme: "gold",
        skin: "obsidian",
        siteVersion: "20260312",
        personalDigestEnabled: true,
        digestCadenceHours: 24,
        lastDigestAt: null,
        lastSeenAt: "2026-03-12T07:45:00.000Z",
        lastSeenPath: "/offers",
        history: [
          {
            id: "pref-1",
            preferenceKey: "siteVersion",
            previousValue: "20260311",
            nextValue: "20260312",
            sourceContext: "smoke-test",
            createdAt: "2026-03-12T07:00:00.000Z",
          },
        ],
      },
      wallet: {
        walletAddress: "0x1234567890abcdef1234567890abcdef12345678",
        chainType: "evm",
        linkedAt: "2026-03-12T06:00:00.000Z",
        lastVerifiedAt: "2026-03-12T06:30:00.000Z",
      },
      balances: {
        STONE: 12.5,
        WHEAT: 3,
      },
      subscription: {
        plan: "premium",
        status: "active",
        currentPeriodEnd: "2026-04-12T05:00:00.000Z",
      },
      statusFlags: {
        isContributor: true,
        ownsBusinesses: true,
        hasWalletLinked: true,
        hasPremium: true,
      },
      counts: {
        articles: 2,
        comments: 1,
        reactions: 3,
        analyticsEvents: 4,
        rewardEntries: 2,
        savedProducts: 1,
        savedOffers: 1,
        deliveryLeads: 1,
        businessesOwned: 1,
        offerInbox: 2,
      },
      analyticsSummary: {
        article_view: 2,
        offer_click: 1,
      },
      reactionSummary: {
        byType: {
          like: 2,
        },
        byScope: {
          article: 2,
        },
      },
      authoredArticles: [],
      recentComments: [],
      savedProducts: [
        {
          id: "saved-product-1",
          createdAt: "2026-03-12T07:15:00.000Z",
          product: {
            id: "prod-1",
            slug: "avalon-organic-chocolate-milk",
            name: "Avalon Organic Chocolate Milk",
            category: "Dairy",
            summary: "Smoke fixture",
          },
        },
      ],
      savedOffers: [
        {
          id: "saved-offer-1",
          createdAt: "2026-03-12T07:20:00.000Z",
          offer: {
            id: "offer-1",
            title: "Weekend chocolate milk drop",
            badgeText: "Weekend drop",
            discountPriceCents: 699,
            business: {
              slug: "wheat-stone-marketplace",
              name: "Wheat & Stone Marketplace",
            },
            product: {
              slug: "avalon-organic-chocolate-milk",
              name: "Avalon Organic Chocolate Milk",
            },
          },
        },
      ],
      recentReactions: [],
      recentAnalytics: [
        {
          id: "analytics-1",
          eventType: "offer_click",
          path: "/offers/weekend-drop",
          destinationUrl: null,
          createdAt: "2026-03-12T07:40:00.000Z",
          article: null,
          business: {
            slug: "wheat-stone-marketplace",
            name: "Wheat & Stone Marketplace",
          },
          offer: {
            id: "offer-1",
            title: "Weekend chocolate milk drop",
          },
        },
      ],
      recentRewards: [
        {
          id: "reward-1",
          token: "STONE",
          direction: "CREDIT",
          amount: 12.5,
          reason: "DELIVERY_PURCHASE",
          createdAt: "2026-03-12T07:10:00.000Z",
          business: {
            slug: "wheat-stone-marketplace",
            name: "Wheat & Stone Marketplace",
          },
        },
      ],
      recentDeliveryLeads: [
        {
          id: "lead-1",
          status: "NEW",
          source: "DELIVERY_REQUEST",
          totalCents: 699,
          requestedAt: "2026-03-12T07:05:00.000Z",
          updatedAt: "2026-03-12T07:06:00.000Z",
          business: {
            slug: "wheat-stone-marketplace",
            name: "Wheat & Stone Marketplace",
          },
          offer: {
            title: "Weekend chocolate milk drop",
          },
          inventoryItem: {
            name: "Marketplace delivery milk route",
          },
        },
      ],
      authHistory: {
        registrations: [
          {
            id: "registration-1",
            userId: "user-tony",
            email: "tonyblum@me.com",
            method: "GOOGLE",
            status: "SUCCESS",
            failureCode: null,
            failureMessage: null,
            createdAt: "2026-03-12T05:00:00.000Z",
          },
        ],
        funnel: [
          {
            id: "funnel-1",
            stage: "LOGIN_STARTED",
            method: "GOOGLE",
            sourceContext: "header",
            createdAt: "2026-03-12T04:59:00.000Z",
          },
        ],
      },
      businessesOwned: [
        {
          id: "biz-1",
          slug: "wheat-stone-marketplace",
          name: "Wheat & Stone Marketplace",
          status: "ACTIVE",
          createdAt: "2026-03-12T05:10:00.000Z",
        },
      ],
      offerInbox: {
        counts: {
          OPEN: 1,
          CLAIMED: 1,
        },
        recent: [],
      },
    },
  ],
  wsApiOnlyUsers: [],
  recentRegistrationAttempts: [
    {
      id: "registration-attempt-1",
      userId: "user-tony",
      email: "tonyblum@me.com",
      method: "GOOGLE",
      status: "SUCCESS",
      failureCode: null,
      failureMessage: null,
      createdAt: "2026-03-12T05:00:00.000Z",
    },
  ],
  recentRegistrationFailures: [
    {
      id: "registration-failure-1",
      userId: null,
      email: "ghost@example.com",
      method: "CREDENTIALS",
      status: "FAILURE",
      failureCode: "EMAIL_TAKEN",
      failureMessage: "Already used",
      createdAt: "2026-03-12T04:00:00.000Z",
    },
  ],
  recentMemberActivity: [
    {
      id: "member-activity-1",
      eventType: "offer_click",
      path: "/offers/weekend-drop",
      createdAt: "2026-03-12T07:40:00.000Z",
      user: {
        id: "user-tony",
        name: "Tony Blum",
        email: "tonyblum@me.com",
      },
    },
  ],
  anonymousActivity: [
    {
      id: "anonymous-1",
      eventType: "article_view",
      path: "/articles/sample",
      createdAt: "2026-03-12T07:20:00.000Z",
      sessionId: "sess-12345678",
      ipHash: "ip-12345678",
      referrerUrl: null,
      article: {
        slug: "sample",
        title: "Sample Article",
      },
      business: null,
      offer: null,
    },
  ],
};

test("admin users atlas renders roster, profile, and network activity for an owner session", async ({
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
  await page.route("**/api/admin/users/intelligence", async (route) => {
    await fulfillJson(route, usersAtlasPayload);
  });

  await page.goto("/admin/users");

  await expect(page.getByText("Users Atlas", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Tony Blum", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Wallet and balances", { exact: true })).toBeVisible();
  await expect(page.getByText("Bookmarks and offer box", { exact: true })).toBeVisible();
  await expect(page.getByText("Recent registration history", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Anonymous and unregistered behavior", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Weekend chocolate milk drop", { exact: true }).first()).toBeVisible();
});
