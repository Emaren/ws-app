import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildAdminBuilderFeed,
  type BuilderFeedItem,
  loadAdminControlTowerSections,
} from "@/lib/adminControlTowerSections";
import { getApiAuthContext } from "@/lib/apiAuth";
import { getBuildMeta } from "@/lib/buildMeta";
import { resolvePasswordResetEmailConfig } from "@/lib/passwordResetSupport";
import {
  fetchPulseReadinessSnapshot,
  resolvePulseIntegrationConfig,
} from "@/lib/pulseReadiness";
import { buildPublicSurfaceSnapshot } from "@/lib/publicSurfaceDiagnostics";
import { hasAnyRole, RBAC_ROLE_GROUPS } from "@/lib/rbac";
import { SAVED_PRODUCT_MATCH_SOURCE } from "@/lib/savedOfferAutomation";
import { fetchTmailSnapshot } from "@/lib/tmailDiagnostics";
import { getWsApiBaseUrl } from "@/lib/wsApiBaseUrl";
import {
  loadWsApiControlTowerSection,
} from "@/lib/wsApiControlTowerSnapshot";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function envFlagEnabled(value: string | undefined): boolean {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toIsoString(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  return value.toISOString();
}

function ageMinutesFromIso(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return Math.max(0, Math.round((Date.now() - timestamp) / 60_000));
}

export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext(req);
  if (!auth.token || !hasAnyRole(auth.role, RBAC_ROLE_GROUPS.ownerAdmin)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const window30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const window7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const siteOrigin =
    normalizeText(process.env.NEXT_PUBLIC_SITE_ORIGIN) ??
    normalizeText(process.env.NEXTAUTH_URL);
  const wsApiBaseUrl = getWsApiBaseUrl();
  const pulseConfig = resolvePulseIntegrationConfig();
  const passwordResetEmailConfig = resolvePasswordResetEmailConfig();
  const passwordResetDebugLinkExposureEnabled = envFlagEnabled(
    process.env.AUTH_EMAIL_EXPOSE_DEBUG_LINK,
  );
  const wsApiBridgeConfigured = Boolean(
    process.env.WS_API_BRIDGE_KEY?.trim() ||
      process.env.AUTH_BRIDGE_SHARED_SECRET?.trim(),
  );

  try {
    const [
      buildMeta,
      usersCount,
      ownerAdminUsersCount,
      articlesCount,
      commentsCount,
      reactionsCount,
      businessesCount,
      offersCount,
      liveOffersCount,
      userOfferInboxActiveCount,
      passwordResetPendingCount,
      authRegistrationEvents30dCount,
      authFunnelEvents30dCount,
      passwordResetDelivered7dCount,
      passwordResetFailed7dCount,
      passwordResetRecentDispatches,
      recentUsers,
      identityLocalUsers,
      identityOfferBadgeCountsRaw,
      publicSurface,
      analyticsEventsCount,
      analyticsEvents7dCount,
      analyticsEvents7dByTypeRaw,
      fulfillmentProfileCount,
      fulfillmentScheduleEnabledCount,
      fulfillmentDigestEnabledCount,
      fulfillmentRuns7dCount,
      fulfillmentAlerts7dCount,
      recentFulfillmentRuns,
      recentSavedMatchAssignments,
      savedProductsCount,
      savedOffersCount,
      savedMatchActiveInboxCount,
      savedMatchAssignments7dCount,
      rewardEntriesTotalCount,
      rewardEntries7dCount,
      rewardedUsersRaw,
      rewardBalanceRows,
      recentRewardEntries,
      subscriptions,
      businessRadarBusinesses,
      businessRadarInventoryItems,
      businessRadarOffers,
      businessRadarLeads30d,
      businessRadarRewards30d,
      recentIdentityRuns,
      recentPublicProbeRuns,
      recentAccountRescueRuns,
      tmailSnapshot,
      pulseSnapshot,
    ] = await Promise.all([
      getBuildMeta(),
      prisma.user.count(),
      prisma.user.count({
        where: {
          role: { in: ["OWNER", "ADMIN"] },
        },
      }),
      prisma.article.count(),
      prisma.comment.count(),
      prisma.reaction.count(),
      prisma.business.count(),
      prisma.offer.count(),
      prisma.offer.count({
        where: {
          status: "LIVE",
        },
      }),
      prisma.userOfferInbox.count({
        where: {
          status: "ACTIVE",
        },
      }),
      prisma.passwordResetToken.count({
        where: {
          usedAt: null,
          expiresAt: {
            gt: now,
          },
        },
      }),
      prisma.authRegistrationEvent.count({
        where: {
          createdAt: {
            gte: window30d,
          },
        },
      }),
      prisma.authFunnelEvent.count({
        where: {
          createdAt: {
            gte: window30d,
          },
        },
      }),
      prisma.passwordResetDispatch.count({
        where: {
          delivered: true,
          createdAt: {
            gte: window7d,
          },
        },
      }),
      prisma.passwordResetDispatch.count({
        where: {
          delivered: false,
          createdAt: {
            gte: window7d,
          },
        },
      }),
      prisma.passwordResetDispatch.findMany({
        orderBy: {
          createdAt: "desc",
        },
        take: 16,
        select: {
          id: true,
          email: true,
          source: true,
          provider: true,
          delivered: true,
          reason: true,
          requestedByEmail: true,
          createdAt: true,
        },
      }),
      prisma.user.findMany({
        orderBy: {
          registeredAt: "desc",
        },
        take: 12,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          registeredVia: true,
          registeredAt: true,
          lastAuthProvider: true,
          lastAuthAt: true,
          createdAt: true,
        },
      }),
      prisma.user.findMany({
        orderBy: {
          email: "asc",
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          registeredVia: true,
          registeredAt: true,
          lastAuthProvider: true,
          lastAuthAt: true,
        },
      }),
      prisma.userOfferInbox.groupBy({
        by: ["userEmail"],
        where: {
          status: "ACTIVE",
        },
        _count: {
          _all: true,
        },
      }),
      buildPublicSurfaceSnapshot(req),
      prisma.analyticsEvent.count(),
      prisma.analyticsEvent.count({
        where: {
          createdAt: {
            gte: window7d,
          },
        },
      }),
      prisma.analyticsEvent.groupBy({
        by: ["eventType"],
        where: {
          createdAt: {
            gte: window7d,
          },
        },
        _count: {
          _all: true,
        },
      }),
      prisma.fulfillmentAutomationProfile.count(),
      prisma.fulfillmentAutomationProfile.count({
        where: {
          scheduleEnabled: true,
        },
      }),
      prisma.fulfillmentAutomationProfile.count({
        where: {
          digestEnabled: true,
        },
      }),
      prisma.fulfillmentAutomationRun.count({
        where: {
          startedAt: {
            gte: window7d,
          },
        },
      }),
      prisma.fulfillmentAutomationAlert.count({
        where: {
          createdAt: {
            gte: window7d,
          },
        },
      }),
      prisma.fulfillmentAutomationRun.findMany({
        orderBy: {
          startedAt: "desc",
        },
        take: 6,
        select: {
          id: true,
          source: true,
          status: true,
          autoAssignedCount: true,
          overdueLeadCount: true,
          openLeadCount: true,
          unassignedLeadCount: true,
          digestQueued: true,
          escalationQueued: true,
          actorEmail: true,
          startedAt: true,
          completedAt: true,
          business: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.userOfferInbox.findMany({
        where: {
          metadata: {
            path: ["source"],
            equals: SAVED_PRODUCT_MATCH_SOURCE,
          },
        },
        orderBy: {
          assignedAt: "desc",
        },
        take: 6,
        select: {
          id: true,
          userEmail: true,
          status: true,
          assignedAt: true,
          offer: {
            select: {
              id: true,
              title: true,
            },
          },
          business: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.savedProduct.count(),
      prisma.savedOffer.count(),
      prisma.userOfferInbox.count({
        where: {
          status: "ACTIVE",
          metadata: {
            path: ["source"],
            equals: SAVED_PRODUCT_MATCH_SOURCE,
          },
        },
      }),
      prisma.userOfferInbox.count({
        where: {
          assignedAt: {
            gte: window7d,
          },
          metadata: {
            path: ["source"],
            equals: SAVED_PRODUCT_MATCH_SOURCE,
          },
        },
      }),
      prisma.rewardLedger.count(),
      prisma.rewardLedger.count({
        where: {
          createdAt: {
            gte: window7d,
          },
        },
      }),
      prisma.rewardLedger.findMany({
        where: {
          userId: {
            not: null,
          },
        },
        distinct: ["userId"],
        select: {
          userId: true,
        },
      }),
      prisma.rewardLedger.groupBy({
        by: ["userId", "token", "direction"],
        _sum: {
          amount: true,
        },
      }),
      prisma.rewardLedger.findMany({
        orderBy: {
          createdAt: "desc",
        },
        take: 8,
        select: {
          id: true,
          token: true,
          direction: true,
          amount: true,
          reason: true,
          createdAt: true,
          user: {
            select: {
              email: true,
              name: true,
            },
          },
          business: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.subscriptionEntitlement.findMany({
        select: {
          userExternalId: true,
          userEmail: true,
          plan: true,
          status: true,
          mismatchReason: true,
        },
      }),
      prisma.business.findMany({
        orderBy: [{ isVerified: "desc" }, { name: "asc" }],
        select: {
          id: true,
          slug: true,
          name: true,
          status: true,
          isVerified: true,
          storeProfile: {
            select: {
              deliveryEnabled: true,
              pickupEnabled: true,
            },
          },
          _count: {
            select: {
              notificationRecipients: true,
            },
          },
        },
      }),
      prisma.inventoryItem.findMany({
        select: {
          businessId: true,
          productId: true,
          quantityOnHand: true,
          lowStockThreshold: true,
          isActive: true,
        },
      }),
      prisma.offer.findMany({
        select: {
          businessId: true,
          productId: true,
          status: true,
          featured: true,
        },
      }),
      prisma.deliveryLead.findMany({
        where: {
          requestedAt: {
            gte: window30d,
          },
        },
        select: {
          businessId: true,
          status: true,
          totalCents: true,
        },
      }),
      prisma.rewardLedger.findMany({
        where: {
          createdAt: {
            gte: window30d,
          },
        },
        select: {
          businessId: true,
          token: true,
          direction: true,
          amount: true,
        },
      }),
      prisma.identityAutoHealRun.findMany({
        orderBy: {
          createdAt: "desc",
        },
        take: 6,
        select: {
          id: true,
          mode: true,
          wsApiAvailable: true,
          scannedCount: true,
          roleMismatchBefore: true,
          roleMismatchAfter: true,
          localOnlyCount: true,
          wsApiOnlyCount: true,
          wsApiRoleUpdated: true,
          localUsersCreated: true,
          createdAt: true,
        },
      }),
      prisma.publicSurfaceProbeRun.findMany({
        orderBy: {
          createdAt: "desc",
        },
        take: 6,
        select: {
          id: true,
          origin: true,
          homeStatus: true,
          hasOgImage: true,
          hasTwitterCard: true,
          hasSummaryLargeImage: true,
          createdAt: true,
        },
      }),
      prisma.accountRescueRun.findMany({
        orderBy: {
          createdAt: "desc",
        },
        take: 6,
        select: {
          id: true,
          targetEmail: true,
          wsApiAvailable: true,
          localPasswordUpdated: true,
          wsApiPasswordUpdated: true,
          resetDispatchDelivered: true,
          resetDispatchProvider: true,
          resetDispatchReason: true,
          actorEmail: true,
          createdAt: true,
        },
      }),
      fetchTmailSnapshot(passwordResetEmailConfig),
      fetchPulseReadinessSnapshot(pulseConfig),
    ]);

    const latestIdentityRun = recentIdentityRuns[0] ?? null;
    const latestPublicProbeRun = recentPublicProbeRuns[0] ?? null;

    const analyticsEvents7dByType = analyticsEvents7dByTypeRaw
      .map((row) => ({
        eventType: row.eventType,
        count: row._count._all,
      }))
      .sort((a, b) => b.count - a.count);

    const accessTokenRaw = auth.token.wsApiAccessToken;
    const wsAccessToken =
      typeof accessTokenRaw === "string" && accessTokenRaw.trim().length > 0
        ? accessTokenRaw.trim()
        : null;
    const identityOfferBadgeCounts = new Map(
      identityOfferBadgeCountsRaw.map((row) => [row.userEmail, row._count._all]),
    );
    const {
      wsApiSnapshot,
      identityLiveSnapshot,
      liveWsUsers,
      walletLinks,
      walletError,
      remoteRewardReport,
      remoteRewardError,
      notificationJobs,
      notificationAuditLogs,
      notificationError,
    } = await loadWsApiControlTowerSection({
      baseUrl: wsApiBaseUrl,
      generatedAt: now.toISOString(),
      accessToken: wsAccessToken,
      identityLocalUsers,
      identityOfferBadgeCounts,
    });

    const {
      memberValueSnapshot,
      notificationSnapshot,
      operationsSnapshot,
      businessRadarSnapshot,
      sectionDiagnostics,
    } = await loadAdminControlTowerSections({
      generatedAt: now.toISOString(),
      accessTokenPresent: Boolean(wsAccessToken),
      localUsers: identityLocalUsers.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
      })),
      wsUsers: liveWsUsers.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
      })),
      walletLinks,
      walletError,
      subscriptions,
      rewardBalanceRows,
      rewardEntriesTotal: rewardEntriesTotalCount,
      rewardEntries7d: rewardEntries7dCount,
      rewardedUsers: rewardedUsersRaw.length,
      recentRewards: recentRewardEntries,
      remoteRewardReport,
      remoteRewardError,
      notificationJobs,
      notificationAuditLogs,
      notificationError,
      recentFulfillmentRuns: recentFulfillmentRuns.map((run) => ({
        id: run.id,
        source: run.source,
        status: run.status,
        autoAssignedCount: run.autoAssignedCount,
        overdueLeadCount: run.overdueLeadCount,
        openLeadCount: run.openLeadCount,
        unassignedLeadCount: run.unassignedLeadCount,
        digestQueued: run.digestQueued,
        escalationQueued: run.escalationQueued,
        actorEmail: run.actorEmail,
        startedAt: run.startedAt.toISOString(),
        completedAt: toIsoString(run.completedAt),
        business: {
          id: run.business.id,
          name: run.business.name,
        },
      })),
      recentSavedMatchAssignments: recentSavedMatchAssignments.map((assignment) => ({
        id: assignment.id,
        userEmail: assignment.userEmail,
        status: assignment.status,
        assignedAt: assignment.assignedAt.toISOString(),
        offer: {
          id: assignment.offer.id,
          title: assignment.offer.title,
        },
        business: {
          id: assignment.business.id,
          name: assignment.business.name,
        },
      })),
      recentIdentityRuns: recentIdentityRuns.map((run) => ({
        id: run.id,
        mode: run.mode,
        wsApiAvailable: run.wsApiAvailable,
        scannedCount: run.scannedCount,
        roleMismatchBefore: run.roleMismatchBefore,
        roleMismatchAfter: run.roleMismatchAfter,
        localOnlyCount: run.localOnlyCount,
        wsApiOnlyCount: run.wsApiOnlyCount,
        wsApiRoleUpdated: run.wsApiRoleUpdated,
        localUsersCreated: run.localUsersCreated,
        createdAt: run.createdAt.toISOString(),
      })),
      recentPublicProbeRuns: recentPublicProbeRuns.map((run) => ({
        id: run.id,
        origin: run.origin,
        homeStatus: run.homeStatus,
        hasOgImage: run.hasOgImage,
        hasTwitterCard: run.hasTwitterCard,
        hasSummaryLargeImage: run.hasSummaryLargeImage,
        createdAt: run.createdAt.toISOString(),
      })),
      recentAccountRescueRuns: recentAccountRescueRuns.map((run) => ({
        id: run.id,
        targetEmail: run.targetEmail,
        wsApiAvailable: run.wsApiAvailable,
        localPasswordUpdated: run.localPasswordUpdated,
        wsApiPasswordUpdated: run.wsApiPasswordUpdated,
        resetDispatchDelivered: run.resetDispatchDelivered,
        resetDispatchProvider: run.resetDispatchProvider,
        resetDispatchReason: run.resetDispatchReason,
        actorEmail: run.actorEmail,
        createdAt: run.createdAt.toISOString(),
      })),
      passwordResetRecentDispatches: passwordResetRecentDispatches.map((dispatch) => ({
        id: dispatch.id,
        email: dispatch.email,
        source: dispatch.source,
        provider: dispatch.provider,
        delivered: dispatch.delivered,
        reason: dispatch.reason,
        requestedByEmail: dispatch.requestedByEmail,
        createdAt: dispatch.createdAt.toISOString(),
      })),
      businessRadarBusinesses: businessRadarBusinesses.map((business) => ({
        id: business.id,
        slug: business.slug,
        name: business.name,
        status: business.status,
        isVerified: business.isVerified,
        storeProfile: business.storeProfile,
        counts: {
          notificationRecipients: business._count.notificationRecipients,
        },
      })),
      businessRadarInventoryItems,
      businessRadarOffers,
      businessRadarLeads30d,
      businessRadarRewards30d,
    });

    const latestFulfillmentRun = recentFulfillmentRuns[0] ?? null;
    const latestSavedMatchAssignment = recentSavedMatchAssignments[0] ?? null;
    const newestUser = recentUsers[0] ?? null;

    const builderFeed: BuilderFeedItem[] = buildAdminBuilderFeed({
      buildMeta,
      nowIso: now.toISOString(),
      wsApiSnapshot,
      identityLiveSnapshot,
      memberValueSnapshot,
      notificationSnapshot,
      operationsSnapshot,
      businessRadarSnapshot,
      pulseSnapshot,
      tmailSnapshot,
      latestPublicProbeRun,
      latestIdentityRun,
      latestFulfillmentRun,
      latestSavedMatchAssignment,
      newestUser,
    });

    return NextResponse.json({
      generatedAt: now.toISOString(),
      release: {
        app: {
          ...buildMeta,
          ageMinutes: ageMinutesFromIso(buildMeta.builtAt),
        },
        runtime: {
          nodeEnv: process.env.NODE_ENV ?? "development",
          siteOrigin,
          nextAuthUrl: normalizeText(process.env.NEXTAUTH_URL),
          wsApiBaseUrl,
        },
      },
      localDb: {
        usersCount,
        ownerAdminUsersCount,
        articlesCount,
        commentsCount,
        reactionsCount,
        businessesCount,
        offersCount,
        liveOffersCount,
        userOfferInboxActiveCount,
        passwordResetPendingCount,
        authRegistrationEvents30dCount,
        authFunnelEvents30dCount,
        passwordResetDelivered7dCount,
        passwordResetFailed7dCount,
      },
      wsApi: wsApiSnapshot,
      identity: {
        live: identityLiveSnapshot,
        latestRun: latestIdentityRun
          ? {
              id: latestIdentityRun.id,
              mode: latestIdentityRun.mode,
              wsApiAvailable: latestIdentityRun.wsApiAvailable,
              scannedCount: latestIdentityRun.scannedCount,
              roleMismatchBefore: latestIdentityRun.roleMismatchBefore,
              roleMismatchAfter: latestIdentityRun.roleMismatchAfter,
              localOnlyCount: latestIdentityRun.localOnlyCount,
              wsApiOnlyCount: latestIdentityRun.wsApiOnlyCount,
              wsApiRoleUpdated: latestIdentityRun.wsApiRoleUpdated,
              localUsersCreated: latestIdentityRun.localUsersCreated,
              createdAt: latestIdentityRun.createdAt.toISOString(),
            }
          : null,
      },
      integrations: {
        passwordResetEmail: {
          provider: passwordResetEmailConfig.provider,
          configured: passwordResetEmailConfig.configured,
          debugLinkExposureEnabled: passwordResetDebugLinkExposureEnabled,
          from: passwordResetEmailConfig.from,
          apiBaseUrl: passwordResetEmailConfig.apiBaseUrl,
          tmailIdentityId: passwordResetEmailConfig.tmailIdentityId,
        },
        wsApiBridge: {
          configured: wsApiBridgeConfigured,
        },
      },
      tmail: tmailSnapshot,
      analytics: {
        totalEvents: analyticsEventsCount,
        last7dEvents: analyticsEvents7dCount,
        eventTypeCounts7d: analyticsEvents7dByType,
      },
      businessRadar: businessRadarSnapshot,
      memberValue: memberValueSnapshot,
      notifications: notificationSnapshot,
      operations: operationsSnapshot,
      sectionDiagnostics,
      pulse: pulseSnapshot,
      automations: {
        fulfillment: {
          profileCount: fulfillmentProfileCount,
          scheduleEnabledCount: fulfillmentScheduleEnabledCount,
          digestEnabledCount: fulfillmentDigestEnabledCount,
          runCount7d: fulfillmentRuns7dCount,
          alertCount7d: fulfillmentAlerts7dCount,
          lastRunAt: toIsoString(latestFulfillmentRun?.startedAt),
          lastRunStatus: latestFulfillmentRun?.status ?? null,
          recentRuns: recentFulfillmentRuns,
        },
        savedMatch: {
          savedProductsCount,
          savedOffersCount,
          activeInboxCount: savedMatchActiveInboxCount,
          assignmentCount7d: savedMatchAssignments7dCount,
          lastAssignmentAt: toIsoString(latestSavedMatchAssignment?.assignedAt),
          recentAssignments: recentSavedMatchAssignments,
        },
      },
      builderFeed,
      publicSurface,
      passwordResetRecentDispatches,
      recentUsers,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to load system snapshot",
        detail: safeErrorMessage(error),
      },
      { status: 500 },
    );
  }
}
