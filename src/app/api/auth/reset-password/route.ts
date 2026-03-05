import { createHash } from "node:crypto";
import bcrypt from "bcrypt";
import { AuthProvider } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WsApiHttpError, wsApiBridgeResetPassword } from "@/lib/wsApiAuth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_SALT_ROUNDS = 10;

function toTokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { token?: unknown; password?: unknown }
    | null;

  const token = typeof body?.token === "string" ? body.token.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!token || !password || password.length < PASSWORD_MIN_LENGTH) {
    return NextResponse.json(
      {
        message: `Invalid request. Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
      },
      { status: 400 },
    );
  }

  const tokenHash = toTokenHash(token);
  const now = new Date();

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      email: true,
      expiresAt: true,
      usedAt: true,
    },
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt.getTime() <= now.getTime()) {
    return NextResponse.json(
      { message: "Reset link is invalid or expired." },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: resetToken.userId },
      data: {
        password: passwordHash,
        lastAuthProvider: AuthProvider.CREDENTIALS,
        lastAuthAt: new Date(),
      },
    });

    await tx.passwordResetToken.updateMany({
      where: {
        userId: resetToken.userId,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });
  });

  let wsApiSyncStatus: "skipped" | "success" | "not_found" | "failed" = "skipped";
  if (resetToken.email) {
    try {
      const syncResult = await wsApiBridgeResetPassword(resetToken.email, password);
      if (syncResult) {
        wsApiSyncStatus = syncResult.user ? "success" : "not_found";
      }
    } catch (error) {
      wsApiSyncStatus = "failed";
      if (error instanceof WsApiHttpError) {
        console.warn("password_reset_wsapi_sync_failed", {
          statusCode: error.statusCode,
          message: error.message,
          payload: error.payload,
          email: resetToken.email,
        });
      } else {
        console.warn("password_reset_wsapi_sync_failed", {
          message: error instanceof Error ? error.message : String(error),
          email: resetToken.email,
        });
      }
    }
  }

  console.info("password_reset_completed", {
    userId: resetToken.userId,
    email: resetToken.email,
    wsApiSyncStatus,
  });

  return NextResponse.json(
    {
      message: "Password updated. You can now sign in.",
    },
    { status: 200 },
  );
}
