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

const adminAuthStats = {
  windowDays: 30,
  generatedAt: "2026-03-11T17:30:00.000Z",
  totals: {
    success: 12,
    failure: 2,
    total: 14,
    successRate: 85.7,
  },
  providers: [
    {
      method: "credentials",
      success: 12,
      failure: 2,
      total: 14,
      successRate: 85.7,
    },
  ],
  recentSuccesses: [],
  recentFailures: [],
  topFailureCodes: [],
  funnel: {
    steps: [],
    totals: {
      viewStarted: 40,
      submitAttempted: 18,
      registeredSuccess: 12,
      firstLoginSuccess: 11,
      overallConversionRate: 27.5,
    },
  },
  funnelByMethod: [],
};

const adminProviderConfig = {
  generatedAt: "2026-03-11T17:30:00.000Z",
  providers: [
    {
      id: "credentials",
      label: "Credentials",
      enabled: true,
      missingEnv: [],
      callbackUrl: "http://127.0.0.1:3211/login",
    },
  ],
};

const adminSystemSnapshot = {
  generatedAt: "2026-03-11T17:30:00.000Z",
  release: {
    app: {
      app: "ws-app",
      packageVersion: "0.1.0",
      buildId: "ws-build-smoke",
      pwaVersion: "ws-pwa-smoke",
      gitShaShort: "2a186d9",
      gitShaFull: "2a186d9testbuild",
      gitBranch: "codex/smoke",
      builtAt: "2026-03-11T17:30:00.000Z",
      builtAtEpochMs: 1773250200000,
      nodeVersion: "v24.4.1",
      nextVersion: "15.5.9",
      reactVersion: "19.1.0",
      source: "playwright-smoke",
      ageMinutes: 0,
    },
    runtime: {
      nodeEnv: "development",
      siteOrigin: "http://127.0.0.1:3211",
      nextAuthUrl: "http://127.0.0.1:3211",
      wsApiBaseUrl: "http://127.0.0.1:3310",
    },
  },
  localDb: {
    usersCount: 6,
    ownerAdminUsersCount: 1,
    articlesCount: 20,
    commentsCount: 4,
    reactionsCount: 9,
    businessesCount: 3,
    offersCount: 5,
    liveOffersCount: 4,
    userOfferInboxActiveCount: 2,
    passwordResetPendingCount: 1,
    authRegistrationEvents30dCount: 14,
    authFunnelEvents30dCount: 18,
    passwordResetDelivered7dCount: 2,
    passwordResetFailed7dCount: 0,
  },
  wsApi: {
    available: true,
    hasAccessToken: true,
    baseUrl: "http://127.0.0.1:3310",
    usersCount: 6,
    usersRepository: "postgres",
    healthUsersCount: 6,
    healthReachable: true,
    healthError: null,
    error: null,
    nodeEnv: "production",
    uptimeSeconds: 4000,
    storage: {
      users: "postgres",
      authSessions: "file-journal",
      articles: "file-journal",
      businesses: "file-journal",
      inventoryItems: "file-journal",
      notifications: "file-journal",
      notificationAuditLogs: "file-journal",
      billingCustomers: "file-journal",
      rewardEntries: "file-journal",
      walletLinks: "file-journal",
      walletChallenges: "file-journal",
      businessOps: "file-journal",
    },
    durability: {
      journalConfigured: true,
      flushIntervalMs: 5000,
      durableModules: 12,
      volatileModules: 0,
      totalModules: 12,
    },
    contract: {
      version: "3.9.0-shared-contract-client",
      routeCount: 106,
      generatedAt: "2026-03-11T17:00:00.000Z",
    },
    contractParity: {
      expectedVersion: "3.9.0-shared-contract-client",
      expectedRouteCount: 106,
      liveVersion: "3.9.0-shared-contract-client",
      liveRouteCount: 106,
      versionMatches: true,
      routeCountMatches: true,
      status: "aligned",
    },
    sharedClientCoverage: {
      routeCount: 42,
      surfaceCount: 7,
      surfaces: [
        "Identity Control",
        "Commerce Ops",
        "Member Value",
        "Wallet Rail",
        "Rewards Rail",
        "Notification Rail",
        "Control Tower",
      ],
    },
    release: {
      packageName: "ws-api",
      packageVersion: "1.0.0",
      gitShaShort: "2a186d9",
      gitBranch: "main",
      nodeVersion: "v24.4.1",
      startedAt: "2026-03-11T17:00:00.000Z",
      metadataSource: "env",
    },
  },
  identity: {
    live: {
      generatedAt: "2026-03-11T17:30:00.000Z",
      available: true,
      accessTokenPresent: true,
      localUsersCount: 6,
      wsApiUsersCount: 6,
      error: null,
      summary: {
        total: 6,
        matched: 5,
        roleMismatches: 1,
        localOnly: 0,
        wsApiOnly: 0,
        zeroOfferUsers: 4,
      },
      topRows: [
        {
          email: "tonyblum@me.com",
          status: "ROLE_MISMATCH",
          offerBadgeCount: 2,
          local: {
            id: "local-tony",
            email: "tonyblum@me.com",
            name: "Tony Blum",
            role: "OWNER",
            registeredVia: "CREDENTIALS",
            registeredAt: "2026-03-01T10:00:00.000Z",
            lastAuthProvider: "CREDENTIALS",
            lastAuthAt: "2026-03-11T17:00:00.000Z",
          },
          wsApi: {
            id: "ws-tony",
            email: "tonyblum@me.com",
            name: "Tony Blum",
            role: "ADMIN",
            createdAt: "2026-03-01T10:00:00.000Z",
            updatedAt: "2026-03-11T17:05:00.000Z",
          },
        },
      ],
    },
    latestRun: {
      id: "identity-run-1",
      mode: "scheduled_probe",
      wsApiAvailable: true,
      scannedCount: 6,
      roleMismatchBefore: 1,
      roleMismatchAfter: 1,
      localOnlyCount: 0,
      wsApiOnlyCount: 0,
      wsApiRoleUpdated: 0,
      localUsersCreated: 0,
      createdAt: "2026-03-11T17:10:00.000Z",
    },
  },
  integrations: {
    passwordResetEmail: {
      provider: "tmail",
      configured: true,
      debugLinkExposureEnabled: false,
      from: "info@wheatandstone.ca",
      apiBaseUrl: "https://api.tmail.tokentap.ca/api",
      tmailIdentityId: "ws-info",
    },
    wsApiBridge: {
      configured: true,
    },
  },
  tmail: {
    configured: true,
    reachable: true,
    baseUrl: "https://api.tmail.tokentap.ca/api",
    publicHealth: {
      url: "https://api.tmail.tokentap.ca/healthz",
      reachable: true,
      status: 200,
      error: null,
    },
    summaryFeed: {
      url: "https://api.tmail.tokentap.ca/api/dashboard/summary",
      reachable: true,
      status: 200,
      error: null,
    },
    messagesFeed: {
      url: "https://api.tmail.tokentap.ca/api/messages?limit=12",
      reachable: true,
      status: 200,
      error: null,
    },
    identityId: "ws-info",
    identityLabel: "Wheat & Stone Info",
    identityEmail: "info@wheatandstone.ca",
    identityStatus: "healthy",
    secretConfigured: true,
    error: null,
    alerts: [
      {
        id: "alert-1",
        level: "info",
        title: "Healthy",
        body: "Everything is configured.",
      },
    ],
    domains: [
      {
        domain: "wheatandstone.ca",
        spf: "pass",
        dkim: "pass",
        dmarc: "pass",
        mx: "pass",
      },
    ],
    latestPasswordResetMessage: {
      id: "msg-1",
      subject: "Reset your Wheat & Stone password",
      status: "Sent",
      sentAt: "2026-03-11T17:21:09.963Z",
      createdAt: "2026-03-11T17:21:05.000Z",
      recipients: ["tonyblum@me.com"],
      errorMessage: null,
    },
    recentPasswordResetMessages: [
      {
        id: "msg-1",
        subject: "Reset your Wheat & Stone password",
        status: "Sent",
        sentAt: "2026-03-11T17:21:09.963Z",
        createdAt: "2026-03-11T17:21:05.000Z",
        recipients: ["tonyblum@me.com"],
        errorMessage: null,
      },
    ],
  },
  analytics: {
    totalEvents: 120,
    last7dEvents: 16,
    eventTypeCounts7d: [
      { eventType: "page_view", count: 10 },
      { eventType: "forgot_password_submit", count: 3 },
      { eventType: "login_submit", count: 3 },
    ],
  },
  businessRadar: {
    generatedAt: "2026-03-11T17:30:00.000Z",
    windowDays: 30,
    summary: {
      businessCount: 2,
      verifiedCount: 1,
      deliveryReadyCount: 1,
      activeInventoryCount: 4,
      lowStockCount: 1,
      liveOfferCount: 3,
      leadCount: 6,
      openLeadCount: 2,
      fulfilledLeadCount: 3,
      trackedDemandCents: 18500,
      notificationRecipients: 40,
      notificationQueuedCount: 1,
      notificationSentCount: 5,
      notificationFailedCount: 1,
      rewardTotals: {
        WHEAT: 12,
        STONE: 7,
      },
      businessesNeedingAttention: 1,
      businessesWithoutLiveOffers: 0,
      businessesWithoutActiveInventory: 0,
    },
    topBusinesses: [
      {
        businessId: "business-1",
        slug: "avalon",
        name: "Avalon",
        status: "ACTIVE",
        isVerified: true,
        deliveryEnabled: true,
        pickupEnabled: true,
        notificationRecipients: 28,
        inventoryCount: 4,
        activeInventoryCount: 3,
        lowStockCount: 0,
        productLinkedInventoryCount: 3,
        offerCount: 3,
        liveOfferCount: 2,
        featuredOfferCount: 1,
        productLinkedOfferCount: 2,
        leadCount: 4,
        openLeadCount: 1,
        reservedLeadCount: 1,
        fulfilledLeadCount: 2,
        cancelledLeadCount: 0,
        trackedDemandCents: 12400,
        notificationQueuedCount: 0,
        notificationSentCount: 4,
        notificationFailedCount: 0,
        rewardTotals: {
          WHEAT: 8,
          STONE: 4,
        },
        leadToFulfillmentRate: 50,
        avgLeadValueCents: 3100,
        needsAttention: false,
        attentionReasons: [],
      },
    ],
    watchlist: [
      {
        businessId: "business-2",
        slug: "crimson-grove",
        name: "Crimson Grove",
        status: "ACTIVE",
        isVerified: false,
        deliveryEnabled: false,
        pickupEnabled: true,
        notificationRecipients: 12,
        inventoryCount: 1,
        activeInventoryCount: 1,
        lowStockCount: 1,
        productLinkedInventoryCount: 1,
        offerCount: 1,
        liveOfferCount: 1,
        featuredOfferCount: 0,
        productLinkedOfferCount: 1,
        leadCount: 2,
        openLeadCount: 1,
        reservedLeadCount: 0,
        fulfilledLeadCount: 1,
        cancelledLeadCount: 0,
        trackedDemandCents: 6100,
        notificationQueuedCount: 1,
        notificationSentCount: 1,
        notificationFailedCount: 1,
        rewardTotals: {
          WHEAT: 4,
          STONE: 3,
        },
        leadToFulfillmentRate: 50,
        avgLeadValueCents: 3050,
        needsAttention: true,
        attentionReasons: ["Delivery is off", "1 low-stock item", "1 failed notification job"],
      },
    ],
  },
  memberValue: {
    generatedAt: "2026-03-11T17:30:00.000Z",
    summary: {
      rewardEntriesTotal: 12,
      rewardEntries7d: 4,
      rewardedUsers: 3,
      rewardedUsersWithoutWallet: 1,
      linkedWallets: 2,
      verifiedWallets7d: 2,
      trackedSubscriptions: 3,
      activeSubscriptions: 1,
      trialingSubscriptions: 1,
      pastDueSubscriptions: 0,
      subscriptionMismatches: 1,
    },
    localRewards: {
      netByToken: {
        WHEAT: 25,
        STONE: 8,
      },
      recentRewards: [
        {
          id: "reward-1",
          email: "tonyblum@me.com",
          name: "Tony Blum",
          token: "WHEAT",
          direction: "CREDIT",
          amount: 10,
          reason: "Article contribution",
          businessName: "Wheat & Stone",
          createdAt: "2026-03-11T17:20:00.000Z",
        },
      ],
    },
    remoteRewards: {
      available: true,
      usersInReport: 2,
      totalByToken: {
        WHEAT: 25,
        STONE: 8,
      },
      pendingByToken: {
        WHEAT: 4,
        STONE: 1,
      },
      exportedByToken: {
        WHEAT: 12,
        STONE: 2,
      },
      paidByToken: {
        WHEAT: 9,
        STONE: 5,
      },
      error: null,
    },
    wallets: {
      accessTokenPresent: true,
      linkedCount: 2,
      verified7dCount: 2,
      error: null,
    },
    topMembers: [
      {
        id: "member-tony",
        email: "tonyblum@me.com",
        name: "Tony Blum",
        walletLinked: true,
        subscription: {
          plan: "PREMIUM_MONTHLY",
          status: "ACTIVE",
        },
        localNet: {
          WHEAT: 20,
          STONE: 3,
        },
      },
    ],
  },
  notifications: {
    generatedAt: "2026-03-11T17:30:00.000Z",
    available: true,
    accessTokenPresent: true,
    error: null,
    summary: {
      totalJobs: 5,
      queued: 1,
      processing: 0,
      retrying: 1,
      sent: 2,
      failed: 1,
      overdue: 1,
      scheduledAhead: 1,
      emailJobs: 3,
      smsJobs: 0,
      pushJobs: 2,
      distinctBusinesses: 2,
      distinctCampaigns: 4,
      fallbackQueued: 1,
    },
    providers: ["resend", "webpush"],
    recentJobs: [
      {
        id: "job-1",
        businessId: "business-1",
        businessName: "Avalon",
        campaignName: "Weekend Drop",
        channel: "email",
        status: "sent",
        provider: "resend",
        audience: "all",
        attempts: 1,
        maxAttempts: 3,
        createdAt: "2026-03-11T17:10:00.000Z",
        nextAttemptAt: "2026-03-11T17:11:00.000Z",
        scheduledFor: "2026-03-11T17:11:00.000Z",
        lastError: null,
      },
    ],
    recentFailures: [
      {
        id: "job-2",
        businessId: "business-2",
        businessName: "Crimson Grove",
        campaignName: "Push fallback",
        channel: "push",
        status: "failed",
        provider: "webpush",
        attempts: 3,
        maxAttempts: 3,
        lastError: "subscription expired",
        failedAt: "2026-03-11T17:15:00.000Z",
        updatedAt: "2026-03-11T17:15:00.000Z",
      },
    ],
    recentAudit: [
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
        createdAt: "2026-03-11T17:15:01.000Z",
      },
    ],
  },
  pulse: {
    configured: true,
    webBaseUrl: "https://pulse.tokentap.ca",
    apiBaseUrl: "https://api.pulse.tokentap.ca",
    projectSlug: "wheat-and-stone",
    internalTokenConfigured: false,
    reachable: true,
    status: "ok",
    checkedAt: "2026-03-11T17:25:00.000Z",
    error: null,
  },
  operations: {
    generatedAt: "2026-03-11T17:30:00.000Z",
    notes: [],
    summary: {
      totalSignals: 7,
      attentionSignals: 2,
      goodSignals: 3,
      infoSignals: 2,
      automationSignals: 2,
      notificationSignals: 1,
      identitySignals: 1,
      publicSurfaceSignals: 1,
      supportSignals: 2,
    },
    sourceCounts: {
      fulfillmentRuns: 1,
      savedMatchAssignments: 1,
      notificationAuditEntries: 1,
      identityRuns: 1,
      publicProbes: 1,
      accountRescues: 1,
      passwordResetDispatches: 1,
    },
    recentEvents: [
      {
        id: "ops-1",
        category: "notification",
        source: "notification-audit",
        status: "warn",
        title: "Notification retry scheduled",
        summary: "email via resend · transient provider outage",
        detail: "Attempt 1",
        actor: "resend",
        occurredAt: "2026-03-11T17:20:00.000Z",
      },
    ],
    attentionEvents: [
      {
        id: "ops-1",
        category: "notification",
        source: "notification-audit",
        status: "warn",
        title: "Notification retry scheduled",
        summary: "email via resend · transient provider outage",
        detail: "Attempt 1",
        actor: "resend",
        occurredAt: "2026-03-11T17:20:00.000Z",
      },
    ],
  },
  sectionDiagnostics: [
    {
      id: "member-value",
      label: "Member Value",
      status: "warn",
      summary: "2 premium members, 2 linked wallets, 4 reward entries in 7 days.",
      detail: "Subscription mismatches 1 · rewarded users without wallets 1.",
      updatedAt: "2026-03-11T17:30:00.000Z",
    },
    {
      id: "notifications",
      label: "Notifications",
      status: "warn",
      summary: "5 jobs tracked · 2 sent · 1 failed.",
      detail: "Queued 1 · retrying 1 · overdue 1.",
      updatedAt: "2026-03-11T17:30:00.000Z",
    },
    {
      id: "operations",
      label: "Operations",
      status: "warn",
      summary: "7 recent events visible · 2 need attention.",
      detail: "Automation 2 · notifications 1 · support 2.",
      updatedAt: "2026-03-11T17:20:00.000Z",
    },
    {
      id: "business-radar",
      label: "Business Radar",
      status: "warn",
      summary: "2 businesses tracked · 3 live offers · 6 leads.",
      detail: "Attention on 1 businesses · low stock 1 · failed notifications 1.",
      updatedAt: "2026-03-11T17:30:00.000Z",
    },
  ],
  automations: {
    fulfillment: {
      profileCount: 2,
      scheduleEnabledCount: 2,
      digestEnabledCount: 1,
      runCount7d: 5,
      alertCount7d: 0,
      lastRunStatus: "SUCCESS",
      lastRunAt: "2026-03-11T17:00:00.000Z",
      recentRuns: [],
    },
    savedMatch: {
      savedProductsCount: 3,
      savedOffersCount: 2,
      activeInboxCount: 2,
      assignmentCount7d: 4,
      lastAssignmentAt: "2026-03-11T16:30:00.000Z",
      recentAssignments: [],
    },
  },
  builderFeed: [
    {
      id: "feed-1",
      category: "password-reset",
      status: "good",
      title: "TMail reset rail delivered",
      summary: "Reset email sent through ws-info",
      detail: "Tony received a reset email through TMail.",
      createdAt: "2026-03-11T17:21:09.963Z",
    },
  ],
  recentUsers: [],
  passwordResetRecentDispatches: [
    {
      id: "dispatch-1",
      createdAt: "2026-03-11T17:21:09.963Z",
      email: "tonyblum@me.com",
      source: "SELF_SERVICE",
      provider: "tmail",
      delivered: true,
      reason: null,
      requestedByEmail: null,
    },
  ],
  publicSurface: {
    origin: "http://127.0.0.1:3211",
    homeUrl: "http://127.0.0.1:3211/",
    socialImageUrl: "http://127.0.0.1:3211/og.png",
    xCardBypassUrl: "http://127.0.0.1:3211/?v=smoke",
    socialImageVersion: "smoke-v1",
    homeProbe: {
      ok: true,
      status: 200,
      redirectedTo: null,
      error: null,
    },
    apexProbe: {
      ok: true,
      status: 200,
      redirectedTo: null,
      error: null,
    },
    twitterBotProbe: {
      ok: true,
      status: 200,
      redirectedTo: null,
      error: null,
    },
    socialImageProbe: {
      ok: true,
      status: 200,
      contentType: "image/png",
      error: null,
    },
    homeMeta: {
      hasTwitterCard: true,
      hasSummaryLargeImage: true,
      hasOgImage: true,
      hasAbsoluteOgImage: true,
      ogImageCount: 1,
      twitterImageCount: 1,
    },
    twitterBotMeta: {
      hasTwitterCard: true,
      hasSummaryLargeImage: true,
      hasOgImage: true,
      hasAbsoluteOgImage: true,
      ogImageCount: 1,
      twitterImageCount: 1,
    },
    facebookComments: {
      embedUrl: "https://www.facebook.com/plugins/comments.php",
      targetArticleUrl: "https://wheatandstone.ca/articles/sample",
      note: "Smoke fixture",
    },
    warnings: [],
  },
};

test("forgot-password surfaces the TMail confirmation state", async ({ page }) => {
  let submittedEmail = "";

  await page.route("**/api/auth/forgot-password", async (route) => {
    submittedEmail = route.request().postDataJSON().email;
    await fulfillJson(route, {
      message: "If this email exists, password reset instructions will be sent.",
      emailProvider: "tmail",
      emailProviderConfigured: true,
    });
  });

  await page.goto("/forgot-password");

  await expect(page.getByRole("heading", { name: "Forgot Password" })).toBeVisible();
  await page.getByPlaceholder("Email").fill("tonyblum@me.com");
  await page.getByRole("button", { name: "Send reset link" }).click();

  expect(submittedEmail).toBe("tonyblum@me.com");
  await expect(
    page.getByText("If this email exists, password reset instructions will be sent."),
  ).toBeVisible();
  await expect(page.getByText(/currently unavailable/i)).toHaveCount(0);
  await expect(page.getByText(/Dev reset link/i)).toHaveCount(0);
});

test("reset-password submits the token and new password", async ({ page }) => {
  let submittedPayload: { token?: string; password?: string } | null = null;

  await page.route("**/api/auth/reset-password", async (route) => {
    submittedPayload = route.request().postDataJSON();
    await fulfillJson(route, {
      message: "Password updated. You can now sign in.",
    });
  });

  await page.goto("/reset-password?token=smoke-token");

  await page.getByPlaceholder("New password").fill("BuilderMode123!");
  await page.getByPlaceholder("Confirm password").fill("BuilderMode123!");
  await page.getByRole("button", { name: "Update password" }).click();

  expect(submittedPayload).toEqual({
    token: "smoke-token",
    password: "BuilderMode123!",
  });
  await expect(page.getByText("Password updated. You can now sign in.")).toBeVisible();
});

test("admin dashboard renders the TMail reset rail for an owner session", async ({ page }) => {
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
  await page.route("**/api/articles?scope=all", async (route) => {
    await fulfillJson(route, []);
  });
  await page.route("**/api/admin/auth/registration-stats?days=30", async (route) => {
    await fulfillJson(route, adminAuthStats);
  });
  await page.route("**/api/admin/auth/provider-config", async (route) => {
    await fulfillJson(route, adminProviderConfig);
  });
  await page.route("**/api/admin/system/snapshot", async (route) => {
    await fulfillJson(route, adminSystemSnapshot);
  });
  await page.route("**/api/admin/system/public-surface?page=1&pageSize=8", async (route) => {
    await fulfillJson(route, { rows: [] });
  });

  await page.goto("/admin");

  await expect(page.getByText("TMail Reset Rail", { exact: true })).toBeVisible();
  await expect(page.getByText("Owned Tools Rail", { exact: true })).toBeVisible();
  await expect(page.getByText("Wheat & Stone App", { exact: true })).toBeVisible();
  await expect(page.getByText("WS-API", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Wheat & Stone Info", { exact: true })).toBeVisible();
  await expect(page.getByText("info@wheatandstone.ca", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Healthy", { exact: true }).first()).toBeVisible();
  await expect(
    page.getByText("Recent Password Reset Mail in TMail", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("tonyblum@me.com", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Identity Command Center", { exact: true })).toBeVisible();
  await expect(page.getByText("Role mismatch", { exact: true })).toBeVisible();
  await expect(page.getByText("Member Value Radar", { exact: true })).toBeVisible();
  await expect(page.getByText("Notification Command Center", { exact: true })).toBeVisible();
  await expect(page.getByText("Jobs + Audit Feed", { exact: true })).toBeVisible();
  await expect(page.getByText("Experience System", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Black / Classic / Editorial", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Recent Platform Activity", { exact: true })).toBeVisible();
  await expect(page.getByText("Attention Watchlist", { exact: true })).toBeVisible();
  await expect(page.getByText("Business Performance Radar", { exact: true })).toBeVisible();
  await expect(page.getByText("Control Tower Sections", { exact: true })).toBeVisible();
  await expect(page.getByText("Storage Map", { exact: true })).toBeVisible();
  await expect(page.getByText("contract aligned", { exact: true })).toBeVisible();
  await expect(page.getByText("Contract-backed adoption:", { exact: false })).toBeVisible();
  await expect(page.getByText("Pulse Readiness", { exact: true })).toBeVisible();
  await expect(page.getByText("Rewards Ops", { exact: true })).toBeVisible();
});

test("admin dashboard stays inside the mobile viewport without page-level horizontal scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });

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
  await page.route("**/api/articles?scope=all", async (route) => {
    await fulfillJson(route, []);
  });
  await page.route("**/api/admin/auth/registration-stats?days=30", async (route) => {
    await fulfillJson(route, adminAuthStats);
  });
  await page.route("**/api/admin/auth/provider-config", async (route) => {
    await fulfillJson(route, adminProviderConfig);
  });
  await page.route("**/api/admin/system/snapshot", async (route) => {
    await fulfillJson(route, adminSystemSnapshot);
  });
  await page.route("**/api/admin/system/public-surface?page=1&pageSize=8", async (route) => {
    await fulfillJson(route, { rows: [] });
  });

  await page.goto("/admin");

  const metrics = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));

  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.bodyWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  await expect(page.getByRole("link", { name: "Dashboard Operational overview" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Commerce Console" }).first()).toBeVisible();
});
