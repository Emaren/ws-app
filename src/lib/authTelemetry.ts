import { createHash } from "node:crypto";
import {
  AuthProvider,
  type AuthRegistrationStatus,
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

const AUTH_PROVIDER_VALUES = new Set<AuthProvider>(
  Object.values(AuthProvider ?? {}) as AuthProvider[],
);

const PROVIDER_MAP: Record<string, AuthProvider> = {
  credentials: "CREDENTIALS" as AuthProvider,
  google: "GOOGLE" as AuthProvider,
  apple: "APPLE" as AuthProvider,
  facebook: "FACEBOOK" as AuthProvider,
  instagram: "INSTAGRAM" as AuthProvider,
  "azure-ad": "MICROSOFT" as AuthProvider,
  microsoft: "MICROSOFT" as AuthProvider,
  github: "GITHUB" as AuthProvider,
};

const OTHER_PROVIDER = "OTHER" as AuthProvider;

function isAuthProvider(value: unknown): value is AuthProvider {
  return typeof value === "string" && AUTH_PROVIDER_VALUES.has(value as AuthProvider);
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

export function normalizeAuthProvider(
  provider?: string | AuthProvider | null,
): AuthProvider {
  if (!provider) {
    return OTHER_PROVIDER;
  }

  if (isAuthProvider(provider)) {
    return provider as AuthProvider;
  }

  const normalized = provider.trim().toLowerCase();
  const mapped = PROVIDER_MAP[normalized];
  if (mapped && isAuthProvider(mapped)) {
    return mapped;
  }
  return OTHER_PROVIDER;
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
