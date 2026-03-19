import type {
  SiteDeliveryPaymentConfig,
  SiteDeliveryPaymentMethod,
} from "@/lib/siteConfigurationShared";

export type Article = {
  id: string;
  title: string;
  slug: string;
  status: string;
  authorId: string | null;
  createdAt: string;
  updatedAt?: string;
  publishedAt?: string | null;
};

type RegistrationProviderStats = {
  method: string;
  success: number;
  failure: number;
  total: number;
  successRate: number;
};

type RecentRegistration = {
  id: string;
  email: string | null;
  method: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    role: string;
  } | null;
};

type RecentRegistrationFailure = {
  id: string;
  email: string | null;
  method: string;
  failureCode: string | null;
  failureMessage: string | null;
  createdAt: string;
};

type AuthFunnelStep = {
  stage: string;
  label: string;
  count: number;
  conversionFromPrevious: number;
  dropoffFromPrevious: number;
};

export type AuthRegistrationStats = {
  windowDays: number;
  generatedAt: string;
  totals: {
    success: number;
    failure: number;
    total: number;
    successRate: number;
  };
  providers: RegistrationProviderStats[];
  recentSuccesses: RecentRegistration[];
  recentFailures: RecentRegistrationFailure[];
  topFailureCodes: Array<{ code: string; count: number }>;
  funnel: {
    steps: AuthFunnelStep[];
    totals: {
      viewStarted: number;
      submitAttempted: number;
      registeredSuccess: number;
      firstLoginSuccess: number;
      overallConversionRate: number;
    };
  };
  funnelByMethod: Array<{
    method: string;
    submitAttempted: number;
    registeredSuccess: number;
    firstLoginSuccess: number;
    registrationConversionRate: number;
    firstLoginConversionRate: number;
    endToEndConversionRate: number;
  }>;
};

export type AuthProviderConfig = {
  id: string;
  label: string;
  enabled: boolean;
  missingEnv: string[];
  callbackUrl: string;
};

export type AuthProviderConfigResponse = {
  generatedAt: string;
  providers: AuthProviderConfig[];
};

export type SiteConfigurationPresetOption = {
  value: string;
  label: string;
  summary: string;
  status: string;
  theme: string;
  edition: string;
  layout: string;
  isSystemDefault: boolean;
};

export type SiteConfiguration = {
  generatedAt: string;
  createdAt: string | null;
  updatedAt: string | null;
  homePagePresetSlug: string;
  homePagePresetLabel: string;
  homePagePresetSummary: string;
  homePagePresetStatus: string;
  homePagePresetTheme: string;
  homePagePresetEdition: string;
  homePagePresetLayout: string;
  homePagePresetSource: "stored" | "fallback";
  homePresetOptions: SiteConfigurationPresetOption[];
  deliveryPaymentConfig: SiteDeliveryPaymentConfig;
};

export type { SiteDeliveryPaymentConfig, SiteDeliveryPaymentMethod };

type IdentityParityStatus = "MATCHED" | "ROLE_MISMATCH" | "LOCAL_ONLY" | "WSAPI_ONLY";
type WsApiStorageBackend = "postgres" | "file-journal" | "memory";

type WsApiStorageSnapshot = {
  users: WsApiStorageBackend | null;
  authSessions: WsApiStorageBackend | null;
  articles: WsApiStorageBackend | null;
  businesses: WsApiStorageBackend | null;
  inventoryItems: WsApiStorageBackend | null;
  notifications: WsApiStorageBackend | null;
  notificationAuditLogs: WsApiStorageBackend | null;
  billingCustomers: WsApiStorageBackend | null;
  rewardEntries: WsApiStorageBackend | null;
  walletLinks: WsApiStorageBackend | null;
  walletChallenges: WsApiStorageBackend | null;
  businessOps: WsApiStorageBackend | null;
};

export type SystemSnapshot = {
  generatedAt: string;
  release: {
    app: {
      app: string;
      packageVersion: string;
      buildId: string;
      pwaVersion: string | null;
      gitShaShort: string | null;
      gitShaFull: string | null;
      gitBranch: string | null;
      builtAt: string | null;
      builtAtEpochMs: number | null;
      nodeVersion: string;
      nextVersion: string | null;
      reactVersion: string | null;
      source: string;
      ageMinutes: number | null;
    };
    runtime: {
      nodeEnv: string;
      siteOrigin: string | null;
      nextAuthUrl: string | null;
      wsApiBaseUrl: string;
    };
  };
  localDb: {
    usersCount: number;
    ownerAdminUsersCount: number;
    articlesCount: number;
    commentsCount: number;
    reactionsCount: number;
    businessesCount: number;
    offersCount: number;
    liveOffersCount: number;
    userOfferInboxActiveCount: number;
    passwordResetPendingCount: number;
    authRegistrationEvents30dCount: number;
    authFunnelEvents30dCount: number;
    passwordResetDelivered7dCount: number;
    passwordResetFailed7dCount: number;
  };
  wsApi: {
    available: boolean;
    hasAccessToken: boolean;
    baseUrl: string;
    usersCount: number | null;
    usersRepository: WsApiStorageBackend | null;
    healthUsersCount: number | null;
    healthReachable: boolean;
    healthError: string | null;
    error: string | null;
    nodeEnv: string | null;
    uptimeSeconds: number | null;
    storage: WsApiStorageSnapshot;
    durability: {
      journalConfigured: boolean | null;
      flushIntervalMs: number | null;
      durableModules: number | null;
      volatileModules: number | null;
      totalModules: number | null;
    } | null;
    contract: {
      version: string | null;
      routeCount: number | null;
      generatedAt: string | null;
    } | null;
    contractParity: {
      expectedVersion: string;
      expectedRouteCount: number;
      liveVersion: string | null;
      liveRouteCount: number | null;
      versionMatches: boolean | null;
      routeCountMatches: boolean | null;
      status: "aligned" | "drift" | "unknown";
    };
    sharedClientCoverage: {
      routeCount: number;
      surfaceCount: number;
      surfaces: string[];
    };
    release: {
      packageName: string | null;
      packageVersion: string | null;
      gitShaShort: string | null;
      gitBranch: string | null;
      nodeVersion: string | null;
      startedAt: string | null;
      metadataSource: string | null;
    } | null;
  };
  identity: {
    live: {
      generatedAt: string;
      available: boolean;
      accessTokenPresent: boolean;
      localUsersCount: number;
      wsApiUsersCount: number | null;
      error: string | null;
      summary: {
        total: number;
        matched: number;
        roleMismatches: number;
        localOnly: number;
        wsApiOnly: number;
        zeroOfferUsers: number;
      } | null;
      topRows: Array<{
        email: string;
        status: IdentityParityStatus;
        offerBadgeCount: number;
        local: {
          id: string;
          email: string;
          name: string;
          role: string;
          registeredVia: string;
          registeredAt: string;
          lastAuthProvider: string | null;
          lastAuthAt: string | null;
        } | null;
        wsApi: {
          id: string;
          email: string;
          name: string;
          role: string;
          createdAt: string;
          updatedAt: string;
        } | null;
      }>;
    };
    latestRun: {
      id: string;
      mode: string;
      wsApiAvailable: boolean;
      scannedCount: number;
      roleMismatchBefore: number;
      roleMismatchAfter: number;
      localOnlyCount: number;
      wsApiOnlyCount: number;
      wsApiRoleUpdated: number;
      localUsersCreated: number;
      createdAt: string;
    } | null;
  };
  integrations: {
    passwordResetEmail: {
      provider: string;
      configured: boolean;
      debugLinkExposureEnabled: boolean;
      from: string | null;
      apiBaseUrl: string | null;
      tmailIdentityId: string | null;
    };
    wsApiBridge: {
      configured: boolean;
    };
  };
  tmail: {
    configured: boolean;
    reachable: boolean;
    baseUrl: string | null;
    publicHealth: {
      url: string | null;
      reachable: boolean;
      status: number | null;
      error: string | null;
    };
    summaryFeed: {
      url: string | null;
      reachable: boolean;
      status: number | null;
      error: string | null;
    };
    messagesFeed: {
      url: string | null;
      reachable: boolean;
      status: number | null;
      error: string | null;
    };
    identityId: string | null;
    identityLabel: string | null;
    identityEmail: string | null;
    identityStatus: string | null;
    secretConfigured: boolean | null;
    error: string | null;
    alerts: Array<{
      id: string;
      level: string;
      title: string;
      body: string | null;
    }>;
    domains: Array<{
      domain: string;
      spf: string | null;
      dkim: string | null;
      dmarc: string | null;
      mx: string | null;
    }>;
    latestPasswordResetMessage: {
      id: string;
      subject: string;
      status: string;
      sentAt: string | null;
      createdAt: string | null;
      recipients: string[];
      errorMessage: string | null;
    } | null;
    recentPasswordResetMessages: Array<{
      id: string;
      subject: string;
      status: string;
      sentAt: string | null;
      createdAt: string | null;
      recipients: string[];
      errorMessage: string | null;
    }>;
  };
  publicSurface: {
    origin: string;
    homeUrl: string;
    apexUrl: string;
    xCardBypassUrl: string;
    socialImageUrl: string;
    socialImageVersion: string;
    homeProbe: {
      ok: boolean;
      status: number | null;
      redirectedTo: string | null;
      contentType: string | null;
      contentLength: string | null;
      error: string | null;
    };
    twitterBotProbe: {
      ok: boolean;
      status: number | null;
      redirectedTo: string | null;
      contentType: string | null;
      contentLength: string | null;
      error: string | null;
    };
    apexProbe: {
      ok: boolean;
      status: number | null;
      redirectedTo: string | null;
      contentType: string | null;
      contentLength: string | null;
      error: string | null;
    };
    socialImageProbe: {
      ok: boolean;
      status: number | null;
      redirectedTo: string | null;
      contentType: string | null;
      contentLength: string | null;
      error: string | null;
    };
    homeMeta: {
      hasOgImage: boolean;
      hasTwitterCard: boolean;
      hasSummaryLargeImage: boolean;
      ogImageCount: number;
      twitterImageCount: number;
      hasAbsoluteOgImage: boolean;
      hasAbsoluteTwitterImage: boolean;
      ogImageValues: string[];
      twitterImageValues: string[];
    };
    twitterBotMeta: {
      hasOgImage: boolean;
      hasTwitterCard: boolean;
      hasSummaryLargeImage: boolean;
      ogImageCount: number;
      twitterImageCount: number;
      hasAbsoluteOgImage: boolean;
      hasAbsoluteTwitterImage: boolean;
      ogImageValues: string[];
      twitterImageValues: string[];
    };
    warnings: string[];
    facebookComments: {
      targetArticleUrl: string | null;
      embedUrl: string | null;
      note: string;
    };
  };
  analytics: {
    totalEvents: number;
    last7dEvents: number;
    eventTypeCounts7d: Array<{
      eventType: string;
      count: number;
    }>;
  };
  businessRadar: {
    generatedAt: string;
    windowDays: number;
    summary: {
      businessCount: number;
      verifiedCount: number;
      deliveryReadyCount: number;
      activeInventoryCount: number;
      lowStockCount: number;
      liveOfferCount: number;
      leadCount: number;
      openLeadCount: number;
      fulfilledLeadCount: number;
      trackedDemandCents: number;
      notificationRecipients: number;
      notificationQueuedCount: number;
      notificationSentCount: number;
      notificationFailedCount: number;
      rewardTotals: {
        WHEAT: number;
        STONE: number;
      };
      businessesNeedingAttention: number;
      businessesWithoutLiveOffers: number;
      businessesWithoutActiveInventory: number;
    };
    topBusinesses: Array<{
      businessId: string;
      slug: string;
      name: string;
      status: string;
      isVerified: boolean;
      deliveryEnabled: boolean;
      pickupEnabled: boolean;
      notificationRecipients: number;
      inventoryCount: number;
      activeInventoryCount: number;
      lowStockCount: number;
      productLinkedInventoryCount: number;
      offerCount: number;
      liveOfferCount: number;
      featuredOfferCount: number;
      productLinkedOfferCount: number;
      leadCount: number;
      openLeadCount: number;
      reservedLeadCount: number;
      fulfilledLeadCount: number;
      cancelledLeadCount: number;
      trackedDemandCents: number;
      notificationQueuedCount: number;
      notificationSentCount: number;
      notificationFailedCount: number;
      rewardTotals: {
        WHEAT: number;
        STONE: number;
      };
      leadToFulfillmentRate: number;
      avgLeadValueCents: number;
      needsAttention: boolean;
      attentionReasons: string[];
    }>;
    watchlist: Array<{
      businessId: string;
      slug: string;
      name: string;
      status: string;
      isVerified: boolean;
      deliveryEnabled: boolean;
      pickupEnabled: boolean;
      notificationRecipients: number;
      inventoryCount: number;
      activeInventoryCount: number;
      lowStockCount: number;
      productLinkedInventoryCount: number;
      offerCount: number;
      liveOfferCount: number;
      featuredOfferCount: number;
      productLinkedOfferCount: number;
      leadCount: number;
      openLeadCount: number;
      reservedLeadCount: number;
      fulfilledLeadCount: number;
      cancelledLeadCount: number;
      trackedDemandCents: number;
      notificationQueuedCount: number;
      notificationSentCount: number;
      notificationFailedCount: number;
      rewardTotals: {
        WHEAT: number;
        STONE: number;
      };
      leadToFulfillmentRate: number;
      avgLeadValueCents: number;
      needsAttention: boolean;
      attentionReasons: string[];
    }>;
  };
  memberValue: {
    generatedAt: string;
    summary: {
      rewardEntriesTotal: number;
      rewardEntries7d: number;
      rewardedUsers: number;
      rewardedUsersWithoutWallet: number;
      linkedWallets: number | null;
      verifiedWallets7d: number | null;
      trackedSubscriptions: number;
      activeSubscriptions: number;
      trialingSubscriptions: number;
      pastDueSubscriptions: number;
      subscriptionMismatches: number;
    };
    localRewards: {
      netByToken: {
        WHEAT: number;
        STONE: number;
      };
      recentRewards: Array<{
        id: string;
        email: string | null;
        name: string | null;
        token: "WHEAT" | "STONE";
        direction: "CREDIT" | "DEBIT";
        amount: number;
        reason: string;
        businessName: string | null;
        createdAt: string | null;
      }>;
    };
    remoteRewards: {
      available: boolean;
      usersInReport: number | null;
      totalByToken: {
        WHEAT: number;
        STONE: number;
      };
      pendingByToken: {
        WHEAT: number;
        STONE: number;
      };
      exportedByToken: {
        WHEAT: number;
        STONE: number;
      };
      paidByToken: {
        WHEAT: number;
        STONE: number;
      };
      error: string | null;
    };
    wallets: {
      accessTokenPresent: boolean;
      linkedCount: number | null;
      verified7dCount: number | null;
      error: string | null;
    };
    topMembers: Array<{
      id: string;
      email: string;
      name: string | null;
      walletLinked: boolean;
      subscription: {
        plan: string;
        status: string;
      } | null;
      localNet: {
        WHEAT: number;
        STONE: number;
      };
    }>;
  };
  notifications: {
    generatedAt: string;
    available: boolean;
    accessTokenPresent: boolean;
    error: string | null;
    summary: {
      totalJobs: number;
      queued: number;
      processing: number;
      retrying: number;
      sent: number;
      failed: number;
      overdue: number;
      scheduledAhead: number;
      emailJobs: number;
      smsJobs: number;
      pushJobs: number;
      distinctBusinesses: number;
      distinctCampaigns: number;
      fallbackQueued: number;
    };
    providers: string[];
    recentJobs: Array<{
      id: string;
      businessId: string;
      businessName: string | null;
      campaignName: string;
      channel: "email" | "sms" | "push";
      status: "queued" | "processing" | "retrying" | "sent" | "failed";
      provider: string | null;
      audience: string;
      attempts: number;
      maxAttempts: number;
      createdAt: string;
      nextAttemptAt: string;
      scheduledFor: string | null;
      lastError: string | null;
    }>;
    recentFailures: Array<{
      id: string;
      businessId: string;
      businessName: string | null;
      campaignName: string;
      channel: "email" | "sms" | "push";
      status: "queued" | "processing" | "retrying" | "sent" | "failed";
      provider: string | null;
      attempts: number;
      maxAttempts: number;
      lastError: string | null;
      failedAt: string | null;
      updatedAt: string;
    }>;
    recentAudit: Array<{
      id: string;
      jobId: string;
      event: string;
      channel: "email" | "sms" | "push";
      provider: string | null;
      attempt: number | null;
      message: string;
      detail: Record<string, unknown> | null;
      createdAt: string;
    }>;
  };
  pulse: {
    configured: boolean;
    webBaseUrl: string | null;
    apiBaseUrl: string | null;
    projectSlug: string | null;
    internalTokenConfigured: boolean;
    reachable: boolean;
    status: string | null;
    checkedAt: string | null;
    error: string | null;
  };
  operations: {
    generatedAt: string;
    notes: string[];
    summary: {
      totalSignals: number;
      attentionSignals: number;
      goodSignals: number;
      infoSignals: number;
      automationSignals: number;
      notificationSignals: number;
      identitySignals: number;
      publicSurfaceSignals: number;
      supportSignals: number;
    };
    sourceCounts: {
      fulfillmentRuns: number;
      savedMatchAssignments: number;
      notificationAuditEntries: number;
      identityRuns: number;
      publicProbes: number;
      accountRescues: number;
      passwordResetDispatches: number;
    };
    recentEvents: Array<{
      id: string;
      category:
        | "automation"
        | "notification"
        | "identity"
        | "support"
        | "public-surface"
        | "auth";
      source: string;
      status: "good" | "info" | "warn";
      title: string;
      summary: string;
      detail: string | null;
      actor: string | null;
      occurredAt: string;
    }>;
    attentionEvents: Array<{
      id: string;
      category:
        | "automation"
        | "notification"
        | "identity"
        | "support"
        | "public-surface"
        | "auth";
      source: string;
      status: "good" | "info" | "warn";
      title: string;
      summary: string;
      detail: string | null;
      actor: string | null;
      occurredAt: string;
    }>;
  };
  automations: {
    fulfillment: {
      profileCount: number;
      scheduleEnabledCount: number;
      digestEnabledCount: number;
      runCount7d: number;
      alertCount7d: number;
      lastRunAt: string | null;
      lastRunStatus: string | null;
      recentRuns: Array<{
        id: string;
        source: string;
        status: string;
        autoAssignedCount: number;
        overdueLeadCount: number;
        openLeadCount: number;
        unassignedLeadCount: number;
        digestQueued: boolean;
        escalationQueued: boolean;
        actorEmail: string | null;
        startedAt: string;
        completedAt: string | null;
        business: {
          id: string;
          name: string;
        };
      }>;
    };
    savedMatch: {
      savedProductsCount: number;
      savedOffersCount: number;
      activeInboxCount: number;
      assignmentCount7d: number;
      lastAssignmentAt: string | null;
      recentAssignments: Array<{
        id: string;
        userEmail: string;
        status: string;
        assignedAt: string;
        offer: {
          id: string;
          title: string;
        };
        business: {
          id: string;
          name: string;
        };
      }>;
    };
  };
  builderFeed: Array<{
    id: string;
    category: string;
    status: "good" | "info" | "warn";
    title: string;
    summary: string;
    detail: string | null;
    createdAt: string | null;
  }>;
  sectionDiagnostics: Array<{
    id: string;
    label: string;
    status: "good" | "info" | "warn";
    summary: string;
    detail: string | null;
    updatedAt: string | null;
  }>;
  passwordResetRecentDispatches: Array<{
    id: string;
    email: string;
    source: string;
    provider: string;
    delivered: boolean;
    reason: string | null;
    requestedByEmail: string | null;
    createdAt: string;
  }>;
  recentUsers: Array<{
    id: string;
    email: string;
    name: string;
    role: string;
    registeredVia: string;
    registeredAt: string;
    lastAuthProvider: string | null;
    lastAuthAt: string | null;
    createdAt: string;
  }>;
};

type PublicSurfaceProbeRun = {
  id: string;
  actorUserId: string | null;
  actorEmail: string | null;
  origin: string;
  homeUrl: string;
  apexUrl: string;
  socialImageUrl: string;
  xCardBypassUrl: string;
  homeStatus: number | null;
  apexStatus: number | null;
  socialImageStatus: number | null;
  homeRedirectedTo: string | null;
  apexRedirectedTo: string | null;
  socialImageContentType: string | null;
  hasOgImage: boolean;
  hasTwitterCard: boolean;
  hasSummaryLargeImage: boolean;
  createdAt: string;
};

export type PublicSurfaceProbeHistory = {
  generatedAt: string;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  rows: PublicSurfaceProbeRun[];
};
