import { createHash } from "node:crypto";
import {
  AuthFunnelStage,
  type AuthProvider,
  type Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeAuthProvider } from "@/lib/authTelemetry";

type HeadersLike =
  | Headers
  | {
      get: (name: string) => string | null;
    };

export type AuthFunnelInput = {
  stage: AuthFunnelStage | string;
  provider?: string | AuthProvider | null;
  email?: string | null;
  userId?: string | null;
  sessionId?: string | null;
  sourceContext?: string | null;
  metadata?: Prisma.InputJsonValue | null;
  headers?: HeadersLike | null;
};

const STAGE_VALUES = new Set<string>(Object.values(AuthFunnelStage));

function normalizeStage(stage: AuthFunnelInput["stage"]): AuthFunnelStage | null {
  if (typeof stage !== "string") return null;
  const normalized = stage.trim().toUpperCase();
  if (!STAGE_VALUES.has(normalized)) {
    return null;
  }
  return normalized as AuthFunnelStage;
}

function firstForwardedIp(headers?: HeadersLike | null): string | null {
  if (!headers) {
    return null;
  }

  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  return null;
}

function hashIp(ip: string | null): string | null {
  if (!ip) {
    return null;
  }
  return createHash("sha256").update(ip).digest("hex");
}

function mergeMetadata(
  original: Prisma.InputJsonValue | null | undefined,
  extra: Prisma.JsonObject,
): Prisma.InputJsonValue {
  if (original && typeof original === "object" && !Array.isArray(original)) {
    return {
      ...(original as Record<string, unknown>),
      ...extra,
    } as Prisma.InputJsonValue;
  }
  return extra as Prisma.InputJsonValue;
}

export async function recordAuthFunnelEvent(input: AuthFunnelInput): Promise<void> {
  const stage = normalizeStage(input.stage);
  if (!stage) {
    return;
  }

  const normalizedEmail = input.email?.trim().toLowerCase() || null;
  const sessionId = input.sessionId?.trim() || null;
  const sourceContext = input.sourceContext?.trim() || null;
  const method = input.provider ? normalizeAuthProvider(input.provider) : null;
  const ipHash = hashIp(firstForwardedIp(input.headers));
  const userAgent = input.headers?.get("user-agent")?.trim() || null;

  const metadata = mergeMetadata(input.metadata ?? null, {
    ipHash,
    userAgent,
  } satisfies Prisma.JsonObject);

  try {
    await prisma.authFunnelEvent.create({
      data: {
        stage,
        method,
        userId: input.userId ?? null,
        email: normalizedEmail,
        sessionId,
        sourceContext,
        metadata,
      },
    });
  } catch (error) {
    console.warn("auth funnel telemetry failed", error);
  }
}

export async function recordFirstLoginSuccess(input: {
  userId: string | null | undefined;
  email?: string | null;
  provider?: string | AuthProvider | null;
  sourceContext?: string | null;
  metadata?: Prisma.InputJsonValue | null;
  headers?: HeadersLike | null;
}): Promise<boolean> {
  if (!input.userId) {
    return false;
  }

  try {
    const existing = await prisma.authFunnelEvent.findFirst({
      where: {
        userId: input.userId,
        stage: AuthFunnelStage.FIRST_LOGIN_SUCCESS,
      },
      select: { id: true },
    });

    if (existing) {
      return false;
    }

    await recordAuthFunnelEvent({
      stage: AuthFunnelStage.FIRST_LOGIN_SUCCESS,
      provider: input.provider ?? null,
      userId: input.userId,
      email: input.email ?? null,
      sourceContext: input.sourceContext ?? "auth_sign_in",
      metadata: input.metadata ?? null,
      headers: input.headers ?? null,
    });
    return true;
  } catch (error) {
    console.warn("first login telemetry failed", error);
    return false;
  }
}
