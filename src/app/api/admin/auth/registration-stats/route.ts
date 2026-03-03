import { NextResponse, type NextRequest } from "next/server";
import { AuthRegistrationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getApiAuthContext } from "@/lib/apiAuth";
import { hasAnyRole, RBAC_ROLE_GROUPS } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function parseDays(req: NextRequest): number {
  const raw = req.nextUrl.searchParams.get("days");
  const parsed = Number.parseInt(raw || "30", 10);
  if (!Number.isFinite(parsed)) {
    return 30;
  }
  return Math.min(180, Math.max(7, parsed));
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext(req);
  if (!auth.token || !hasAnyRole(auth.role, RBAC_ROLE_GROUPS.ownerAdmin)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const days = parseDays(req);
  const windowStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    const [grouped, recentSuccesses, recentFailures, topFailureCodes] =
      await Promise.all([
        prisma.authRegistrationEvent.groupBy({
          by: ["method", "status"],
          where: {
            createdAt: { gte: windowStart },
          },
          _count: { _all: true },
        }),
        prisma.authRegistrationEvent.findMany({
          where: {
            status: AuthRegistrationStatus.SUCCESS,
            createdAt: { gte: windowStart },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            email: true,
            method: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        }),
        prisma.authRegistrationEvent.findMany({
          where: {
            status: AuthRegistrationStatus.FAILURE,
            createdAt: { gte: windowStart },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            email: true,
            method: true,
            failureCode: true,
            failureMessage: true,
            createdAt: true,
          },
        }),
        prisma.authRegistrationEvent.groupBy({
          by: ["failureCode"],
          where: {
            status: AuthRegistrationStatus.FAILURE,
            createdAt: { gte: windowStart },
          },
          _count: { _all: true },
          orderBy: {
            _count: { failureCode: "desc" },
          },
          take: 8,
        }),
      ]);

    const providerMap = new Map<
      string,
      {
        method: string;
        success: number;
        failure: number;
      }
    >();

    for (const row of grouped) {
      const key = row.method;
      const existing = providerMap.get(key) ?? {
        method: key,
        success: 0,
        failure: 0,
      };
      if (row.status === AuthRegistrationStatus.SUCCESS) {
        existing.success = row._count._all;
      } else {
        existing.failure = row._count._all;
      }
      providerMap.set(key, existing);
    }

    const providers = [...providerMap.values()]
      .map((row) => {
        const total = row.success + row.failure;
        return {
          ...row,
          total,
          successRate: total > 0 ? Number(((row.success / total) * 100).toFixed(1)) : 0,
        };
      })
      .sort((a, b) => b.total - a.total);

    const totals = providers.reduce(
      (acc, row) => {
        acc.success += row.success;
        acc.failure += row.failure;
        acc.total += row.total;
        return acc;
      },
      { success: 0, failure: 0, total: 0 },
    );

    return NextResponse.json({
      windowDays: days,
      generatedAt: new Date().toISOString(),
      totals: {
        ...totals,
        successRate:
          totals.total > 0
            ? Number(((totals.success / totals.total) * 100).toFixed(1))
            : 0,
      },
      providers,
      recentSuccesses: recentSuccesses.map((row) => ({
        id: row.id,
        email: row.email,
        method: row.method,
        createdAt: row.createdAt,
        user: row.user,
      })),
      recentFailures: recentFailures.map((row) => ({
        id: row.id,
        email: row.email,
        method: row.method,
        failureCode: row.failureCode,
        failureMessage: row.failureMessage,
        createdAt: row.createdAt,
      })),
      topFailureCodes: topFailureCodes.map((row) => ({
        code: row.failureCode || "UNKNOWN",
        count: row._count._all,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to load registration analytics",
        details: safeErrorMessage(error),
      },
      { status: 500 },
    );
  }
}

