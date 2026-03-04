import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiAuthContext } from "@/lib/apiAuth";
import { hasAnyRole, RBAC_ROLE_GROUPS } from "@/lib/rbac";
import { listWsApiUsers } from "@/app/api/admin/offers/_shared";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type WsApiSnapshot = {
  available: boolean;
  hasAccessToken: boolean;
  usersCount: number | null;
  error: string | null;
};

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
      recentUsers,
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
      error: null,
    };

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
      },
      wsApi: wsApiSnapshot,
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

