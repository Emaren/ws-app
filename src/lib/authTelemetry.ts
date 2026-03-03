import { createHash } from "node:crypto";
import {
  AuthProvider,
  AuthRegistrationStatus,
  type Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

type HeadersLike =
  | Headers
  | {
      get: (name: string) => string | null;
    };

export type AuthTelemetryInput = {
  status: AuthRegistrationStatus;
  provider?: string | AuthProvider | null;
  email?: string | null;
  userId?: string | null;
  failureCode?: string | null;
  failureMessage?: string | null;
  metadata?: Prisma.InputJsonValue | null;
  headers?: HeadersLike | null;
};

const PROVIDER_MAP: Record<string, AuthProvider> = {
  credentials: AuthProvider.CREDENTIALS,
  google: AuthProvider.GOOGLE,
  apple: AuthProvider.APPLE,
  facebook: AuthProvider.FACEBOOK,
  "azure-ad": AuthProvider.MICROSOFT,
  microsoft: AuthProvider.MICROSOFT,
  github: AuthProvider.GITHUB,
};

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

export function normalizeAuthProvider(
  provider?: string | AuthProvider | null,
): AuthProvider {
  if (!provider) {
    return AuthProvider.OTHER;
  }

  if (Object.values(AuthProvider).includes(provider as AuthProvider)) {
    return provider as AuthProvider;
  }

  const normalized = provider.trim().toLowerCase();
  return PROVIDER_MAP[normalized] ?? AuthProvider.OTHER;
}

export async function recordAuthRegistrationEvent(
  input: AuthTelemetryInput,
): Promise<void> {
  const normalizedEmail = input.email?.trim().toLowerCase() || null;
  const method = normalizeAuthProvider(input.provider);
  const ipHash = hashIp(firstForwardedIp(input.headers));
  const userAgent = input.headers?.get("user-agent")?.trim() || null;

  try {
    await prisma.authRegistrationEvent.create({
      data: {
        userId: input.userId ?? null,
        email: normalizedEmail,
        method,
        status: input.status,
        failureCode: input.failureCode ?? null,
        failureMessage: input.failureMessage ?? null,
        ipHash,
        userAgent,
        metadata: input.metadata ?? undefined,
      },
    });
  } catch (error) {
    console.warn("auth registration telemetry failed", error);
  }
}

