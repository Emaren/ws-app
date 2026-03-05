import { PasswordResetDispatchSource } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiAuthContext } from "@/lib/apiAuth";
import { hasAnyRole, RBAC_ROLE_GROUPS } from "@/lib/rbac";
import {
  createPasswordResetToken,
  normalizeEmail,
  recordPasswordResetDispatch,
  sendPasswordResetEmail,
  shouldExposeDebugResetUrl,
} from "@/lib/passwordResetSupport";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function parsePositiveInt(
  value: string | null,
  fallback: number,
  max: number,
): number {
  const parsed = Number.parseInt(value || "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.min(parsed, max);
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

type AuthSupportAction = "resend" | "manual_link";

function parseAction(input: unknown): AuthSupportAction {
  const value = typeof input === "string" ? input.trim().toLowerCase() : "";
  return value === "manual_link" ? "manual_link" : "resend";
}

export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext(req);
  if (!auth.token || !hasAnyRole(auth.role, RBAC_ROLE_GROUPS.ownerAdmin)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const page = parsePositiveInt(req.nextUrl.searchParams.get("page"), 1, 10_000);
  const pageSize = parsePositiveInt(req.nextUrl.searchParams.get("pageSize"), 25, 100);
  const query = (req.nextUrl.searchParams.get("query") || "").trim().toLowerCase();
  const skip = (page - 1) * pageSize;
  const now = new Date();

  try {
    const where = query
      ? {
          OR: [
            {
              email: {
                contains: query,
                mode: "insensitive" as const,
              },
            },
            {
              user: {
                name: {
                  contains: query,
                  mode: "insensitive" as const,
                },
              },
            },
            {
              requestedByEmail: {
                contains: query,
                mode: "insensitive" as const,
              },
            },
            {
              reason: {
                contains: query,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : undefined;

    const [total, rows, summary] = await Promise.all([
      prisma.passwordResetDispatch.count({ where }),
      prisma.passwordResetDispatch.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: pageSize,
        select: {
          id: true,
          email: true,
          source: true,
          provider: true,
          delivered: true,
          reason: true,
          requestedByEmail: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
          passwordResetToken: {
            select: {
              id: true,
              expiresAt: true,
              usedAt: true,
            },
          },
        },
      }),
      Promise.all([
        prisma.passwordResetDispatch.count(),
        prisma.passwordResetDispatch.count({
          where: {
            delivered: true,
          },
        }),
        prisma.passwordResetDispatch.count({
          where: {
            delivered: false,
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
      ]),
    ]);

    const [totalDispatches, deliveredDispatches, failedDispatches, activeTokens] = summary;

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      query,
      summary: {
        totalDispatches,
        deliveredDispatches,
        failedDispatches,
        activeTokens,
      },
      rows,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to load auth support data",
        detail: safeErrorMessage(error),
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await getApiAuthContext(req);
  if (!auth.token || !hasAnyRole(auth.role, RBAC_ROLE_GROUPS.ownerAdmin)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as
    | { email?: unknown; action?: unknown }
    | null;
  const email = normalizeEmail(body?.email);
  const action = parseAction(body?.action);

  if (!email) {
    return NextResponse.json({ message: "Email is required" }, { status: 400 });
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (!existingUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const token = await createPasswordResetToken({
      userId: existingUser.id,
      email: existingUser.email,
      request: req,
    });

    if (action === "manual_link") {
      await recordPasswordResetDispatch({
        tokenRecordId: token.tokenRecordId,
        userId: existingUser.id,
        email: existingUser.email,
        source: PasswordResetDispatchSource.ADMIN_MANUAL,
        emailResult: {
          delivered: false,
          provider: "manual",
          reason: "manual_reset_link_generated",
        },
        requestedByUserId: auth.userId ?? null,
        requestedByEmail: auth.email ?? null,
        metadata: {
          sourceContext: "admin_auth_support",
        },
      });

      return NextResponse.json({
        ok: true,
        action,
        email: existingUser.email,
        expiresAt: token.expiresAt.toISOString(),
        resetUrl: token.resetUrl,
      });
    }

    const emailResult = await sendPasswordResetEmail({
      to: existingUser.email,
      resetUrl: token.resetUrl,
    });

    await recordPasswordResetDispatch({
      tokenRecordId: token.tokenRecordId,
      userId: existingUser.id,
      email: existingUser.email,
      source: PasswordResetDispatchSource.ADMIN_RESEND,
      emailResult,
      requestedByUserId: auth.userId ?? null,
      requestedByEmail: auth.email ?? null,
      metadata: {
        sourceContext: "admin_auth_support",
      },
    });

    return NextResponse.json({
      ok: true,
      action,
      email: existingUser.email,
      delivered: emailResult.delivered,
      provider: emailResult.provider,
      reason: emailResult.reason ?? null,
      expiresAt: token.expiresAt.toISOString(),
      ...(shouldExposeDebugResetUrl(emailResult) ? { debugResetUrl: token.resetUrl } : null),
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to execute auth support action",
        detail: safeErrorMessage(error),
      },
      { status: 500 },
    );
  }
}
