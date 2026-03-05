import { PasswordResetDispatchSource } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiAuthContext } from "@/lib/apiAuth";
import { hasAnyRole, RBAC_ROLE_GROUPS } from "@/lib/rbac";
import {
  createPasswordResetToken,
  normalizeEmail,
  recordPasswordResetDispatch,
} from "@/lib/passwordResetSupport";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function POST(req: NextRequest) {
  const auth = await getApiAuthContext(req);
  if (!auth.token || !hasAnyRole(auth.role, RBAC_ROLE_GROUPS.ownerAdmin)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as
    | { email?: unknown }
    | null;
  const email = normalizeEmail(body?.email);
  if (!email) {
    return NextResponse.json({ message: "Email is required" }, { status: 400 });
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true },
    });

    if (!existingUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const token = await createPasswordResetToken({
      userId: existingUser.id,
      email: existingUser.email,
      request: req,
    });
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
        sourceContext: "admin_access_reset_link",
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Manual reset link generated",
      email: existingUser.email,
      userId: existingUser.id,
      expiresAt: token.expiresAt.toISOString(),
      resetUrl: token.resetUrl,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to generate reset link",
        detail: safeErrorMessage(error),
      },
      { status: 500 },
    );
  }
}
