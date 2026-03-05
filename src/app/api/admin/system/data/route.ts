import { NextResponse, type NextRequest } from "next/server";
import {
  Prisma,
  AuthFunnelStage,
  AuthProvider,
  AuthRegistrationStatus,
  OfferStatus,
  PasswordResetDispatchSource,
  ReactionScope,
  ReactionType,
  Role,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getApiAuthContext } from "@/lib/apiAuth";
import { hasAnyRole, RBAC_ROLE_GROUPS } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ENTITY_VALUES = [
  "users",
  "offers",
  "reactions",
  "resetTokens",
  "resetDispatches",
  "registrationEvents",
  "funnelEvents",
] as const;
type DataEntity = (typeof ENTITY_VALUES)[number];

function parsePositiveInt(value: string | null, fallback: number, max: number): number {
  const parsed = Number.parseInt(value || "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.min(parsed, max);
}

function normalizeEntity(input: string | null): DataEntity {
  if (!input) return "users";
  const normalized = input.trim();
  if (ENTITY_VALUES.includes(normalized as DataEntity)) {
    return normalized as DataEntity;
  }
  return "users";
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isRoleValue(value: string): value is Role {
  return value in Role;
}

function isOfferStatusValue(value: string): value is OfferStatus {
  return value in OfferStatus;
}

function isReactionTypeValue(value: string): value is ReactionType {
  return value in ReactionType;
}

function isReactionScopeValue(value: string): value is ReactionScope {
  return value in ReactionScope;
}

function isAuthProviderValue(value: string): value is AuthProvider {
  return value in AuthProvider;
}

function isAuthRegistrationStatusValue(value: string): value is AuthRegistrationStatus {
  return value in AuthRegistrationStatus;
}

function isAuthFunnelStageValue(value: string): value is AuthFunnelStage {
  return value in AuthFunnelStage;
}

function isPasswordResetDispatchSourceValue(
  value: string,
): value is PasswordResetDispatchSource {
  return value in PasswordResetDispatchSource;
}

export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext(req);
  if (!auth.token || !hasAnyRole(auth.role, RBAC_ROLE_GROUPS.ownerAdmin)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const entity = normalizeEntity(req.nextUrl.searchParams.get("entity"));
  const page = parsePositiveInt(req.nextUrl.searchParams.get("page"), 1, 10_000);
  const pageSize = parsePositiveInt(req.nextUrl.searchParams.get("pageSize"), 25, 100);
  const query = (req.nextUrl.searchParams.get("query") || "").trim();
  const skip = (page - 1) * pageSize;

  try {
    if (entity === "users") {
      const where: Prisma.UserWhereInput | undefined = query
        ? {
            OR: [
              { email: { contains: query, mode: "insensitive" } },
              { name: { contains: query, mode: "insensitive" } },
              { id: { contains: query, mode: "insensitive" } },
              ...(isRoleValue(query.toUpperCase())
                ? [{ role: query.toUpperCase() as Role }]
                : []),
            ],
          }
        : undefined;

      const [total, rows] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          orderBy: { registeredAt: "desc" },
          skip,
          take: pageSize,
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

      return NextResponse.json({
        entity,
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        query,
        rows,
      });
    }

    if (entity === "offers") {
      const where: Prisma.OfferWhereInput | undefined = query
        ? {
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { couponCode: { contains: query, mode: "insensitive" } },
              ...(isOfferStatusValue(query.toUpperCase())
                ? [{ status: query.toUpperCase() as OfferStatus }]
                : []),
              { business: { name: { contains: query, mode: "insensitive" } } },
              { business: { slug: { contains: query, mode: "insensitive" } } },
            ],
          }
        : undefined;

      const [total, rows] = await Promise.all([
        prisma.offer.count({ where }),
        prisma.offer.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: pageSize,
          select: {
            id: true,
            businessId: true,
            title: true,
            couponCode: true,
            status: true,
            startsAt: true,
            endsAt: true,
            createdAt: true,
            business: {
              select: {
                name: true,
                slug: true,
              },
            },
          },
        }),
      ]);

      return NextResponse.json({
        entity,
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        query,
        rows,
      });
    }

  if (entity === "reactions") {
      const where: Prisma.ReactionWhereInput | undefined = query
        ? {
            OR: [
              { id: { contains: query, mode: "insensitive" } },
              ...(isReactionTypeValue(query.toUpperCase())
                ? [{ type: query.toUpperCase() as ReactionType }]
                : []),
              ...(isReactionScopeValue(query.toUpperCase())
                ? [{ scope: query.toUpperCase() as ReactionScope }]
                : []),
              { productSlug: { contains: query, mode: "insensitive" } },
              { userId: { contains: query, mode: "insensitive" } },
              { article: { slug: { contains: query, mode: "insensitive" } } },
              { article: { title: { contains: query, mode: "insensitive" } } },
              { user: { email: { contains: query, mode: "insensitive" } } },
            ],
          }
        : undefined;

      const [total, rows] = await Promise.all([
        prisma.reaction.count({ where }),
        prisma.reaction.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: pageSize,
          select: {
            id: true,
            articleId: true,
            userId: true,
            ipHash: true,
            type: true,
            scope: true,
            productSlug: true,
            createdAt: true,
            article: {
              select: {
                slug: true,
                title: true,
              },
            },
            user: {
              select: {
                email: true,
                name: true,
              },
            },
          },
        }),
      ]);

      return NextResponse.json({
        entity,
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        query,
        rows,
      });
    }

    if (entity === "resetDispatches") {
      const upperQuery = query.toUpperCase();
      const boolQuery =
        upperQuery === "TRUE"
          ? true
          : upperQuery === "FALSE"
            ? false
            : null;

      const where: Prisma.PasswordResetDispatchWhereInput | undefined = query
        ? {
            OR: [
              { id: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
              { provider: { contains: query, mode: "insensitive" } },
              { reason: { contains: query, mode: "insensitive" } },
              ...(isPasswordResetDispatchSourceValue(upperQuery)
                ? [{ source: upperQuery as PasswordResetDispatchSource }]
                : []),
              { requestedByEmail: { contains: query, mode: "insensitive" } },
              { userId: { contains: query, mode: "insensitive" } },
              { requestedByUserId: { contains: query, mode: "insensitive" } },
              ...(boolQuery === null ? [] : [{ delivered: boolQuery }]),
              { user: { email: { contains: query, mode: "insensitive" } } },
              { user: { name: { contains: query, mode: "insensitive" } } },
            ],
          }
        : undefined;

      const [total, rows] = await Promise.all([
        prisma.passwordResetDispatch.count({ where }),
        prisma.passwordResetDispatch.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: pageSize,
          select: {
            id: true,
            email: true,
            userId: true,
            source: true,
            provider: true,
            delivered: true,
            reason: true,
            requestedByUserId: true,
            requestedByEmail: true,
            createdAt: true,
            user: {
              select: {
                email: true,
                name: true,
              },
            },
          },
        }),
      ]);

      return NextResponse.json({
        entity,
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        query,
        rows,
      });
    }

    if (entity === "registrationEvents") {
      const upperQuery = query.toUpperCase();
      const where: Prisma.AuthRegistrationEventWhereInput | undefined = query
        ? {
            OR: [
              { id: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
              { userId: { contains: query, mode: "insensitive" } },
              { failureCode: { contains: query, mode: "insensitive" } },
              { failureMessage: { contains: query, mode: "insensitive" } },
              ...(isAuthProviderValue(upperQuery)
                ? [{ method: upperQuery as AuthProvider }]
                : []),
              ...(isAuthRegistrationStatusValue(upperQuery)
                ? [{ status: upperQuery as AuthRegistrationStatus }]
                : []),
              { user: { email: { contains: query, mode: "insensitive" } } },
              { user: { name: { contains: query, mode: "insensitive" } } },
            ],
          }
        : undefined;

      const [total, rows] = await Promise.all([
        prisma.authRegistrationEvent.count({ where }),
        prisma.authRegistrationEvent.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: pageSize,
          select: {
            id: true,
            userId: true,
            email: true,
            method: true,
            status: true,
            failureCode: true,
            failureMessage: true,
            createdAt: true,
            user: {
              select: {
                email: true,
                name: true,
              },
            },
          },
        }),
      ]);

      return NextResponse.json({
        entity,
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        query,
        rows,
      });
    }

    if (entity === "funnelEvents") {
      const upperQuery = query.toUpperCase();
      const where: Prisma.AuthFunnelEventWhereInput | undefined = query
        ? {
            OR: [
              { id: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
              { userId: { contains: query, mode: "insensitive" } },
              { sessionId: { contains: query, mode: "insensitive" } },
              { sourceContext: { contains: query, mode: "insensitive" } },
              ...(isAuthFunnelStageValue(upperQuery)
                ? [{ stage: upperQuery as AuthFunnelStage }]
                : []),
              ...(isAuthProviderValue(upperQuery)
                ? [{ method: upperQuery as AuthProvider }]
                : []),
              { user: { email: { contains: query, mode: "insensitive" } } },
              { user: { name: { contains: query, mode: "insensitive" } } },
            ],
          }
        : undefined;

      const [total, rows] = await Promise.all([
        prisma.authFunnelEvent.count({ where }),
        prisma.authFunnelEvent.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: pageSize,
          select: {
            id: true,
            stage: true,
            method: true,
            userId: true,
            email: true,
            sessionId: true,
            sourceContext: true,
            createdAt: true,
            user: {
              select: {
                email: true,
                name: true,
              },
            },
          },
        }),
      ]);

      return NextResponse.json({
        entity,
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        query,
        rows,
      });
    }

    const where: Prisma.PasswordResetTokenWhereInput | undefined = query
      ? {
          OR: [
            { id: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { userId: { contains: query, mode: "insensitive" } },
            { user: { name: { contains: query, mode: "insensitive" } } },
          ],
        }
      : undefined;

    const [total, rows] = await Promise.all([
      prisma.passwordResetToken.count({ where }),
      prisma.passwordResetToken.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        select: {
          id: true,
          userId: true,
          email: true,
          tokenHash: true,
          expiresAt: true,
          usedAt: true,
          createdAt: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      entity,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      query,
      rows: rows.map((row) => ({
        ...row,
        tokenHashPreview: `${row.tokenHash.slice(0, 10)}...`,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to load data explorer view",
        detail: safeErrorMessage(error),
      },
      { status: 500 },
    );
  }
}
