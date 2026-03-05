import { createHash, randomBytes } from "node:crypto";
import { Prisma, PasswordResetDispatchSource } from "@prisma/client";
import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_RESEND_API_BASE_URL = "https://api.resend.com";
const DEFAULT_TOKEN_TTL_MINUTES = 45;

export type PasswordResetEmailResult = {
  delivered: boolean;
  provider: string;
  reason?: string;
};

export type CreatedPasswordResetToken = {
  tokenRecordId: string;
  rawToken: string;
  resetUrl: string;
  expiresAt: Date;
};

export function normalizeEmail(input: unknown): string {
  if (typeof input !== "string") {
    return "";
  }
  return input.trim().toLowerCase();
}

export function parsePositiveInt(
  input: string | undefined,
  fallback: number,
): number {
  if (!input) return fallback;
  const parsed = Number.parseInt(input, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export function resolveSiteOrigin(request: NextRequest): string {
  const envOrigin = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_SITE_ORIGIN;
  if (envOrigin) {
    try {
      return new URL(envOrigin).origin;
    } catch {
      // fall through
    }
  }

  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "localhost:3211";
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

function toTokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createPasswordResetToken(input: {
  userId: string;
  email: string;
  request: NextRequest;
}): Promise<CreatedPasswordResetToken> {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = toTokenHash(rawToken);
  const ttlMinutes = parsePositiveInt(
    process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES,
    DEFAULT_TOKEN_TTL_MINUTES,
  );
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);

  const created = await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.updateMany({
      where: {
        userId: input.userId,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    return tx.passwordResetToken.create({
      data: {
        userId: input.userId,
        email: input.email,
        tokenHash,
        expiresAt,
      },
      select: {
        id: true,
      },
    });
  });

  const origin = resolveSiteOrigin(input.request);
  const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(rawToken)}`;

  return {
    tokenRecordId: created.id,
    rawToken,
    resetUrl,
    expiresAt,
  };
}

function envFlagEnabled(value: string | undefined): boolean {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

export function shouldExposeDebugResetUrl(
  emailResult: PasswordResetEmailResult,
): boolean {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  const explicitOptIn = envFlagEnabled(process.env.AUTH_EMAIL_EXPOSE_DEBUG_LINK);
  if (!explicitOptIn) {
    return false;
  }

  return !emailResult.delivered;
}

export async function sendPasswordResetEmail(input: {
  to: string;
  resetUrl: string;
}): Promise<PasswordResetEmailResult> {
  const provider = (
    process.env.AUTH_EMAIL_PROVIDER ??
    process.env.NOTIFICATION_EMAIL_PROVIDER ??
    "dev"
  )
    .trim()
    .toLowerCase();

  if (provider !== "resend") {
    console.info("password_reset_dev_email", {
      to: input.to,
      resetUrl: input.resetUrl,
      provider,
    });
    return {
      delivered: false,
      provider,
      reason: "email_provider_not_configured",
    };
  }

  const apiKey =
    process.env.AUTH_EMAIL_API_KEY ?? process.env.NOTIFICATION_EMAIL_API_KEY;
  const from =
    process.env.AUTH_EMAIL_FROM ?? process.env.NOTIFICATION_EMAIL_FROM;
  const baseUrl =
    process.env.AUTH_EMAIL_API_BASE_URL ??
    process.env.NOTIFICATION_EMAIL_API_BASE_URL ??
    DEFAULT_RESEND_API_BASE_URL;

  if (!apiKey || !from) {
    console.warn("password_reset_email_unavailable", {
      provider: "resend",
      reason: "missing_api_key_or_from",
    });
    return {
      delivered: false,
      provider: "resend",
      reason: "missing_api_key_or_from",
    };
  }

  const text = [
    "You requested a password reset for Wheat & Stone.",
    "",
    `Reset your password: ${input.resetUrl}`,
    "",
    "If you did not request this, you can ignore this email.",
  ].join("\n");

  const html = [
    "<p>You requested a password reset for Wheat & Stone.</p>",
    `<p><a href="${input.resetUrl}">Reset your password</a></p>`,
    "<p>If you did not request this, you can ignore this email.</p>",
  ].join("");

  const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/emails`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: "Reset your Wheat & Stone password",
      html,
      text,
    }),
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => "");
    console.error("password_reset_email_failed", {
      provider: "resend",
      status: response.status,
      response: responseText.slice(0, 500),
    });
    return {
      delivered: false,
      provider: "resend",
      reason: `resend_http_${response.status}`,
    };
  }

  return {
    delivered: true,
    provider: "resend",
  };
}

export async function recordPasswordResetDispatch(input: {
  tokenRecordId: string | null;
  userId: string;
  email: string;
  source: PasswordResetDispatchSource;
  emailResult: PasswordResetEmailResult;
  requestedByUserId?: string | null;
  requestedByEmail?: string | null;
  metadata?: Prisma.InputJsonValue | null;
}): Promise<void> {
  await prisma.passwordResetDispatch.create({
    data: {
      passwordResetTokenId: input.tokenRecordId,
      userId: input.userId,
      email: input.email,
      source: input.source,
      provider: input.emailResult.provider,
      delivered: input.emailResult.delivered,
      reason: input.emailResult.reason ?? null,
      requestedByUserId: input.requestedByUserId ?? null,
      requestedByEmail: input.requestedByEmail ?? null,
      metadata: input.metadata ?? Prisma.JsonNull,
    },
  });
}
