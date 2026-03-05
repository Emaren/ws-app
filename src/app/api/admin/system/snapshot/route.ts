import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiAuthContext } from "@/lib/apiAuth";
import { hasAnyRole, RBAC_ROLE_GROUPS } from "@/lib/rbac";
import { listWsApiUsers } from "@/app/api/admin/offers/_shared";
import { buildPublicSurfaceSnapshot } from "@/lib/publicSurfaceDiagnostics";
import { getWsApiBaseUrl } from "@/lib/wsApiBaseUrl";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type WsApiSnapshot = {
  available: boolean;
  hasAccessToken: boolean;
  usersCount: number | null;
  usersRepository: "postgres" | "memory" | null;
  healthUsersCount: number | null;
  healthReachable: boolean;
  healthError: string | null;
  error: string | null;
};

type WsApiHealthPayload = {
  status?: string;
  modules?: {
    users?: number;
  };
  storage?: {
    users?: "postgres" | "memory";
  };
};

async function fetchWsApiHealthSnapshot(): Promise<{
  reachable: boolean;
  usersRepository: "postgres" | "memory" | null;
  usersCount: number | null;
  error: string | null;
}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(`${getWsApiBaseUrl()}/health`, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      return {
        reachable: false,
        usersRepository: null,
        usersCount: null,
        error: `health endpoint returned ${response.status}`,
      };
    }
    const payload = (await response.json().catch(() => null)) as
      | WsApiHealthPayload
      | null;
    return {
      reachable: true,
      usersRepository:
        payload?.storage?.users === "postgres" || payload?.storage?.users === "memory"
          ? payload.storage.users
          : null,
      usersCount:
        typeof payload?.modules?.users === "number" ? payload.modules.users : null,
      error: null,
    };
  } catch (error) {
    return {
      reachable: false,
      usersRepository: null,
      usersCount: null,
      error: safeErrorMessage(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function envFlagEnabled(value: string | undefined): boolean {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext(req);
  if (!auth.token || !hasAnyRole(auth.role, RBAC_ROLE_GROUPS.ownerAdmin)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const window30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const window7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const passwordResetProvider = (
    process.env.AUTH_EMAIL_PROVIDER ??
    process.env.NOTIFICATION_EMAIL_PROVIDER ??
    "dev"
  )
    .trim()
    .toLowerCase();
  const passwordResetApiKey =
    process.env.AUTH_EMAIL_API_KEY ?? process.env.NOTIFICATION_EMAIL_API_KEY;
  const passwordResetFrom =
    process.env.AUTH_EMAIL_FROM ?? process.env.NOTIFICATION_EMAIL_FROM;
  const passwordResetConfigured =
    passwordResetProvider === "resend"
      ? Boolean(passwordResetApiKey && passwordResetFrom)
      : passwordResetProvider !== "dev";
  const passwordResetDebugLinkExposureEnabled = envFlagEnabled(
    process.env.AUTH_EMAIL_EXPOSE_DEBUG_LINK,
  );
  const wsApiBridgeConfigured = Boolean(
    process.env.WS_API_BRIDGE_KEY?.trim() ||
      process.env.AUTH_BRIDGE_SHARED_SECRET?.trim(),
  );

  try {
    const [
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
      publicSurface,
    ] = await Promise.all([
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
      buildPublicSurfaceSnapshot(req),
    ]);

    const accessTokenRaw = auth.token.wsApiAccessToken;
    const wsAccessToken =
      typeof accessTokenRaw === "string" && accessTokenRaw.trim().length > 0
        ? accessTokenRaw.trim()
        : null;

    const wsApiSnapshot: WsApiSnapshot = {
      available: false,
      hasAccessToken: Boolean(wsAccessToken),
      usersCount: null,
      usersRepository: null,
      healthUsersCount: null,
      healthReachable: false,
      healthError: null,
      error: null,
    };

    const wsApiHealth = await fetchWsApiHealthSnapshot();
    wsApiSnapshot.healthReachable = wsApiHealth.reachable;
    wsApiSnapshot.usersRepository = wsApiHealth.usersRepository;
    wsApiSnapshot.healthUsersCount = wsApiHealth.usersCount;
    wsApiSnapshot.healthError = wsApiHealth.error;

    if (wsAccessToken) {
      try {
        const users = await listWsApiUsers(wsAccessToken);
        wsApiSnapshot.available = true;
        wsApiSnapshot.usersCount = users.length;
      } catch (error) {
        wsApiSnapshot.available = false;
        wsApiSnapshot.error = safeErrorMessage(error);
      }
    }

    return NextResponse.json({
      generatedAt: now.toISOString(),
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
      integrations: {
        passwordResetEmail: {
          provider: passwordResetProvider,
          configured: passwordResetConfigured,
          debugLinkExposureEnabled: passwordResetDebugLinkExposureEnabled,
        },
        wsApiBridge: {
          configured: wsApiBridgeConfigured,
        },
      },
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
