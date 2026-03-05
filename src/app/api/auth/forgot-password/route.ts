import { PasswordResetDispatchSource } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createPasswordResetToken,
  normalizeEmail,
  recordPasswordResetDispatch,
  sendPasswordResetEmail,
  shouldExposeDebugResetUrl,
} from "@/lib/passwordResetSupport";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const GENERIC_MESSAGE =
  "If this email exists, password reset instructions will be sent.";

function isProviderConfigured(provider: string): boolean {
  if (provider === "resend") {
    const apiKey =
      process.env.AUTH_EMAIL_API_KEY ?? process.env.NOTIFICATION_EMAIL_API_KEY;
    const from =
      process.env.AUTH_EMAIL_FROM ?? process.env.NOTIFICATION_EMAIL_FROM;
    return Boolean(apiKey && from);
  }
  return provider !== "dev";
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { email?: unknown }
    | null;

  const email = normalizeEmail(body?.email);
  if (!email) {
    return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 });
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true },
  });

  const configuredProvider = (
    process.env.AUTH_EMAIL_PROVIDER ??
    process.env.NOTIFICATION_EMAIL_PROVIDER ??
    "dev"
  )
    .trim()
    .toLowerCase();
  const emailProviderConfigured = isProviderConfigured(configuredProvider);

  let debugResetUrl: string | undefined;

  if (existingUser) {
    const token = await createPasswordResetToken({
      userId: existingUser.id,
      email: existingUser.email,
      request,
    });
    const emailResult = await sendPasswordResetEmail({
      to: existingUser.email,
      resetUrl: token.resetUrl,
    });

    try {
      await recordPasswordResetDispatch({
        tokenRecordId: token.tokenRecordId,
        userId: existingUser.id,
        email: existingUser.email,
        source: PasswordResetDispatchSource.SELF_SERVICE,
        emailResult,
        metadata: {
          sourceContext: "forgot_password_route",
        },
      });
    } catch (dispatchError) {
      console.warn("password_reset_dispatch_record_failed", dispatchError);
    }

    if (shouldExposeDebugResetUrl(emailResult)) {
      debugResetUrl = token.resetUrl;
    }

    console.info("password_reset_requested", {
      userId: existingUser.id,
      email: existingUser.email,
      provider: emailResult.provider,
      delivered: emailResult.delivered,
      reason: emailResult.reason ?? null,
    });
  }

  return NextResponse.json(
    {
      message: GENERIC_MESSAGE,
      emailProvider: configuredProvider,
      emailProviderConfigured,
      ...(debugResetUrl ? { debugResetUrl } : null),
    },
    { status: 200 },
  );
}
