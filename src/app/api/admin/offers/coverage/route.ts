import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeRequestUrl } from "@/lib/safeRequestUrl";
import { listWsApiUsers, requireOffersManagerWsToken } from "../_shared";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isOfferLiveNow(offer: {
  status: string;
  startsAt: Date | null;
  endsAt: Date | null;
}): boolean {
  if (offer.status !== "LIVE") {
    return false;
  }

  const nowMs = Date.now();
  const startMs = offer.startsAt ? offer.startsAt.getTime() : null;
  const endMs = offer.endsAt ? offer.endsAt.getTime() : null;

  if (startMs !== null && nowMs < startMs) {
    return false;
  }
  if (endMs !== null && nowMs > endMs) {
    return false;
  }
  return true;
}

export async function GET(req: NextRequest) {
  const auth = await requireOffersManagerWsToken(req);
  if (auth instanceof NextResponse) {
    return auth;
  }

  try {
    const url = safeRequestUrl(req);
    const businessId = url.searchParams.get("businessId")?.trim() || null;
    const scopedBusinessIds = businessId
      ? [businessId]
      : auth.managedBusinessIds;

    if (businessId && auth.managedBusinessIds && !auth.managedBusinessIds.includes(businessId)) {
      return NextResponse.json(
        { message: "Forbidden: business is outside your scope" },
        { status: 403 },
      );
    }

    if (auth.managedBusinessIds && auth.managedBusinessIds.length === 0) {
      return NextResponse.json({
        generatedAt: new Date().toISOString(),
        scope: {
          mode: "BUSINESS",
          managedBusinessIds: [],
        },
        businesses: [],
        products: [],
        offers: [],
        users: [],
        summary: {
          totalUsers: 0,
          usersWithOffers: 0,
          zeroOfferUsers: 0,
          activeBadgeTotal: 0,
        },
      });
    }

    const [wsUsers, businesses, products, offers, inbox, recipients] = await Promise.all([
      listWsApiUsers(auth.accessToken),
      prisma.business.findMany({
        where: scopedBusinessIds ? { id: { in: scopedBusinessIds } } : undefined,
        select: { id: true, slug: true, name: true, status: true },
        orderBy: { name: "asc" },
      }),
      prisma.product.findMany({
        select: {
          id: true,
          slug: true,
          name: true,
          category: true,
          brand: {
            select: {
              name: true,
            },
          },
          _count: {
            select: {
              reviewProfiles: true,
            },
          },
        },
        orderBy: [{ name: "asc" }],
      }),
      prisma.offer.findMany({
        where: scopedBusinessIds ? { businessId: { in: scopedBusinessIds } } : undefined,
        select: {
          id: true,
          businessId: true,
          business: {
            select: {
              name: true,
            },
          },
          product: {
            select: {
              id: true,
              slug: true,
              name: true,
            },
          },
          title: true,
          status: true,
          startsAt: true,
          endsAt: true,
          featured: true,
          discountPriceCents: true,
          badgeText: true,
        },
        orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
      }),
      prisma.userOfferInbox.findMany({
        where: {
          ...(scopedBusinessIds ? { businessId: { in: scopedBusinessIds } } : {}),
          status: { in: ["ACTIVE", "SEEN"] },
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: {
          id: true,
          userExternalId: true,
          userEmail: true,
          offerId: true,
          assignedAt: true,
          status: true,
          offer: {
            select: {
              id: true,
              status: true,
              startsAt: true,
              endsAt: true,
            },
          },
        },
      }),
      prisma.notificationRecipient.findMany({
        where: scopedBusinessIds ? { businessId: { in: scopedBusinessIds } } : undefined,
        select: {
          email: true,
          userId: true,
        },
      }),
    ]);

    const liveOfferIds = new Set(
      offers.filter((offer) => isOfferLiveNow(offer)).map((offer) => offer.id),
    );

    const countsByUserId = new Map<string, number>();
    const latestAssignedByUserId = new Map<string, Date>();

    const usersById = new Map(wsUsers.map((user) => [user.id, user]));
    const usersByEmail = new Map(wsUsers.map((user) => [user.email.toLowerCase(), user]));

    for (const assignment of inbox) {
      if (!liveOfferIds.has(assignment.offerId)) {
        continue;
      }

      const mappedUser = usersById.get(assignment.userExternalId);
      const fallbackUser = !mappedUser
        ? usersByEmail.get(assignment.userEmail.toLowerCase())
        : null;
      const resolvedUserId = mappedUser?.id ?? fallbackUser?.id;

      if (!resolvedUserId) {
        continue;
      }

      countsByUserId.set(
        resolvedUserId,
        (countsByUserId.get(resolvedUserId) ?? 0) + 1,
      );

      const previous = latestAssignedByUserId.get(resolvedUserId);
      if (!previous || assignment.assignedAt > previous) {
        latestAssignedByUserId.set(resolvedUserId, assignment.assignedAt);
      }
    }

    let scopedUsers = wsUsers;
    if (!auth.isOwnerAdmin) {
      const audienceById = new Set<string>();
      const audienceByEmail = new Set<string>();

      for (const assignment of inbox) {
        if (assignment.userExternalId) {
          audienceById.add(assignment.userExternalId);
        }
        if (assignment.userEmail) {
          audienceByEmail.add(assignment.userEmail.toLowerCase());
        }
      }

      for (const recipient of recipients) {
        if (recipient.userId) {
          audienceById.add(recipient.userId);
        }
        if (recipient.email) {
          audienceByEmail.add(recipient.email.toLowerCase());
        }
      }

      if (auth.actorExternalId) {
        audienceById.add(auth.actorExternalId);
      }
      if (auth.actorEmail) {
        audienceByEmail.add(auth.actorEmail.toLowerCase());
      }

      scopedUsers = wsUsers.filter(
        (user) =>
          audienceById.has(user.id) || audienceByEmail.has(user.email.toLowerCase()),
      );
    }

    const userCoverage = scopedUsers.map((user) => {
      const badgeCount = countsByUserId.get(user.id) ?? 0;
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        offerBadgeCount: badgeCount,
        hasOffers: badgeCount > 0,
        lastAssignedAt: latestAssignedByUserId.get(user.id)?.toISOString() ?? null,
      };
    });

    userCoverage.sort((a, b) => {
      if (a.offerBadgeCount !== b.offerBadgeCount) {
        return a.offerBadgeCount - b.offerBadgeCount;
      }
      return a.email.localeCompare(b.email);
    });

    const zeroOfferUsers = userCoverage.filter((user) => user.offerBadgeCount === 0).length;
    const activeBadgeTotal = userCoverage.reduce(
      (total, user) => total + user.offerBadgeCount,
      0,
    );

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      scope: {
        mode: auth.isOwnerAdmin ? "GLOBAL" : "BUSINESS",
        managedBusinessIds: auth.managedBusinessIds ?? businesses.map((business) => business.id),
      },
      businesses,
      products: products.map((product) => ({
        id: product.id,
        slug: product.slug,
        name: product.name,
        brandName: product.brand?.name ?? null,
        category: product.category,
        reviewCount: product._count.reviewProfiles,
      })),
      offers: offers.map((offer) => ({
        ...offer,
        businessName: offer.business.name,
        productId: offer.product?.id ?? null,
        productSlug: offer.product?.slug ?? null,
        productName: offer.product?.name ?? null,
      })),
      users: userCoverage,
      summary: {
        totalUsers: userCoverage.length,
        usersWithOffers: userCoverage.length - zeroOfferUsers,
        zeroOfferUsers,
        activeBadgeTotal,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to load offers coverage",
        cause: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
