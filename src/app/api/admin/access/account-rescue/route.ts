import bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";
import { AuthProvider, PasswordResetDispatchSource, Prisma, Role } from "@prisma/client";
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
import { wsApiBridgeResetPassword } from "@/lib/wsApiAuth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const LOCAL_AUTH_PASSWORD_SALT_ROUNDS = 10;

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function parsePositiveInt(value: string | null, fallback: number, max: number): number {
  const parsed = Number.parseInt(value || "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.min(parsed, max);
}

function generateTemporaryPassword(length = 18): string {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*+=?";
  const bytes = randomBytes(length);
  let output = "";
  for (let i = 0; i < length; i += 1) {
    output += chars[bytes[i] % chars.length];
  }
  return output;
}

function deriveNameFromEmail(email: string): string {
  return email.split("@")[0] || "user";
}

function normalizeRole(input: string | null | undefined): Role {
  const value = (input || "").trim().toUpperCase();
  if (value === "OWNER") return Role.OWNER;
  if (value === "ADMIN") return Role.ADMIN;
  if (value === "EDITOR") return Role.EDITOR;
  if (value === "CONTRIBUTOR") return Role.CONTRIBUTOR;
  return Role.USER;
}

export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext(req);
  if (!auth.token || !hasAnyRole(auth.role, RBAC_ROLE_GROUPS.ownerAdmin)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const page = parsePositiveInt(req.nextUrl.searchParams.get("page"), 1, 10_000);
  const pageSize = parsePositiveInt(req.nextUrl.searchParams.get("pageSize"), 10, 100);
  const query = (req.nextUrl.searchParams.get("query") || "").trim().toLowerCase();
  const skip = (page - 1) * pageSize;

  const where = query
    ? {
        OR: [
          {
            targetEmail: {
              contains: query,
              mode: "insensitive" as const,
            },
          },
          {
            actorEmail: {
              contains: query,
              mode: "insensitive" as const,
            },
          },
        ],
      }
    : undefined;

  const [total, rows] = await Promise.all([
    prisma.accountRescueRun.count({ where }),
    prisma.accountRescueRun.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    rows,
  });
}

export async function POST(req: NextRequest) {
  const auth = await getApiAuthContext(req);
  if (!auth.token || !hasAnyRole(auth.role, RBAC_ROLE_GROUPS.ownerAdmin)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as
    | {
        email?: unknown;
      }
    | null;
  const email = normalizeEmail(body?.email);
  if (!email) {
    return NextResponse.json({ message: "Email is required" }, { status: 400 });
  }

  try {
    const warnings: string[] = [];
    let targetUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    const temporaryPassword = generateTemporaryPassword();
    const temporaryPasswordHash = await bcrypt.hash(
      temporaryPassword,
      LOCAL_AUTH_PASSWORD_SALT_ROUNDS,
    );

    let localPasswordUpdated = false;
    if (targetUser) {
      await prisma.user.update({
        where: { id: targetUser.id },
        data: {
          password: temporaryPasswordHash,
          lastAuthProvider: AuthProvider.CREDENTIALS,
          lastAuthAt: new Date(),
        },
      });
      localPasswordUpdated = true;
    }

    const wsBridgeResult = await wsApiBridgeResetPassword(email, temporaryPassword);
    const wsApiAvailable = wsBridgeResult !== null;
    const wsApiPasswordUpdated = Boolean(wsBridgeResult?.user);

    if (!wsApiAvailable) {
      warnings.push("ws-api bridge key is not configured.");
    } else if (!wsApiPasswordUpdated) {
      warnings.push(wsBridgeResult?.message || "ws-api user not found for bridge reset.");
    }

    if (!targetUser && wsApiPasswordUpdated) {
      const created = await prisma.user.create({
        data: {
          email,
          name: wsBridgeResult?.user?.name?.trim() || deriveNameFromEmail(email),
          role: normalizeRole(wsBridgeResult?.user?.role),
          password: temporaryPasswordHash,
          registeredVia: AuthProvider.OTHER,
          lastAuthProvider: AuthProvider.CREDENTIALS,
          lastAuthAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      });
      targetUser = created;
      localPasswordUpdated = true;
      warnings.push("Local user was auto-created from ws-api identity during rescue.");
    }

    if (!targetUser) {
      const run = await prisma.accountRescueRun.create({
        data: {
          actorUserId: auth.userId ?? null,
          actorEmail: auth.email ?? null,
          targetUserId: null,
          targetEmail: email,
          wsApiAvailable,
          localPasswordUpdated: false,
          wsApiPasswordUpdated,
          resetDispatchDelivered: false,
          resetDispatchProvider: wsApiAvailable ? "resend" : "bridge_unavailable",
          resetDispatchReason: "target_user_missing_local",
          warnings: warnings.length > 0 ? warnings : Prisma.JsonNull,
        },
      });
      return NextResponse.json(
        {
          message: "User was not found in local db, and no local identity could be created.",
          run,
          warnings,
        },
        { status: 404 },
      );
    }

    const token = await createPasswordResetToken({
      userId: targetUser.id,
      email: targetUser.email,
      request: req,
    });

    const emailResult = await sendPasswordResetEmail({
      to: targetUser.email,
      resetUrl: token.resetUrl,
    });

    await recordPasswordResetDispatch({
      tokenRecordId: token.tokenRecordId,
      userId: targetUser.id,
      email: targetUser.email,
      source: PasswordResetDispatchSource.ADMIN_RESEND,
      emailResult,
      requestedByUserId: auth.userId ?? null,
      requestedByEmail: auth.email ?? null,
      metadata: {
        sourceContext: "admin_account_rescue",
        localPasswordUpdated,
        wsApiPasswordUpdated,
      },
    });

    const run = await prisma.accountRescueRun.create({
      data: {
        actorUserId: auth.userId ?? null,
        actorEmail: auth.email ?? null,
        targetUserId: targetUser.id,
        targetEmail: targetUser.email,
        wsApiAvailable,
        localPasswordUpdated,
        wsApiPasswordUpdated,
        resetDispatchDelivered: emailResult.delivered,
        resetDispatchProvider: emailResult.provider,
        resetDispatchReason: emailResult.reason ?? null,
        warnings: warnings.length > 0 ? warnings : Prisma.JsonNull,
      },
    });

    return NextResponse.json({
      ok: true,
      run,
      email: targetUser.email,
      userId: targetUser.id,
      temporaryPassword,
      resetExpiresAt: token.expiresAt.toISOString(),
      manualResetUrl: token.resetUrl,
      delivered: emailResult.delivered,
      provider: emailResult.provider,
      reason: emailResult.reason ?? null,
      warnings,
      ...(shouldExposeDebugResetUrl(emailResult) ? { debugResetUrl: token.resetUrl } : null),
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to execute account rescue",
        detail: safeErrorMessage(error),
      },
      { status: 500 },
    );
  }
}
