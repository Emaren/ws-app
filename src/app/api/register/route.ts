import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import type { Prisma } from "@prisma/client";
import { AuthProvider, AuthRegistrationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordAuthRegistrationEvent } from "@/lib/authTelemetry";
import { recordAuthFunnelEvent } from "@/lib/authFunnel";
import { normalizeAppRole } from "@/lib/rbac";
import { WsApiHttpError, wsApiRegister } from "@/lib/wsApiAuth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const LOCAL_PASSWORD_SALT_ROUNDS = 10;

type LocalRegisterUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
};

function toLocalResponseUser(user: LocalRegisterUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: normalizeAppRole(user.role) ?? "USER",
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

async function upsertLocalMirror(input: {
  email: string;
  password: string;
  name: string;
  role: string;
}): Promise<LocalRegisterUser> {
  const passwordHash = await bcrypt.hash(
    input.password,
    LOCAL_PASSWORD_SALT_ROUNDS,
  );

  return prisma.user.upsert({
    where: { email: input.email },
    update: {
      name: input.name,
      role: normalizeAppRole(input.role) ?? "USER",
      password: passwordHash,
      lastAuthProvider: AuthProvider.CREDENTIALS,
      lastAuthAt: new Date(),
    },
    create: {
      email: input.email,
      name: input.name,
      role: normalizeAppRole(input.role) ?? "USER",
      password: passwordHash,
      registeredVia: AuthProvider.CREDENTIALS,
      lastAuthProvider: AuthProvider.CREDENTIALS,
      lastAuthAt: new Date(),
    },
  });
}

async function createLocalOnlyUser(input: {
  email: string;
  password: string;
  name: string;
}): Promise<LocalRegisterUser> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  if (existing) {
    throw new WsApiHttpError(409, "User already exists", {
      source: "local_fallback",
      reason: "email_exists",
    });
  }

  const passwordHash = await bcrypt.hash(
    input.password,
    LOCAL_PASSWORD_SALT_ROUNDS,
  );

  return prisma.user.create({
    data: {
      email: input.email,
      password: passwordHash,
      name: input.name,
      role: "USER",
      registeredVia: AuthProvider.CREDENTIALS,
      lastAuthProvider: AuthProvider.CREDENTIALS,
      lastAuthAt: new Date(),
    },
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { email?: string; password?: string; name?: string }
    | null;

  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const nameRaw = typeof body?.name === "string" ? body.name.trim() : "";
  const name = nameRaw || email.split("@")[0] || "user";

  async function logFailure(
    failureCode: string,
    failureMessage: string,
    details?: Record<string, unknown>,
  ) {
    await recordAuthRegistrationEvent({
      status: AuthRegistrationStatus.FAILURE,
      provider: AuthProvider.CREDENTIALS,
      email: email.toLowerCase() || null,
      failureCode,
      failureMessage,
      headers: req.headers,
      metadata: (details ?? null) as Prisma.InputJsonValue | null,
    });
  }

  if (!email || !password) {
    await logFailure("MISSING_FIELDS", "Email and password required");
    return NextResponse.json(
      { message: "Email and password required" },
      { status: 400 },
    );
  }

  try {
    const result = await wsApiRegister(email, password, name);
    await upsertLocalMirror({
      email: result.user.email,
      password,
      name: result.user.name,
      role: result.user.role,
    });

    const localUser = await prisma.user.findUnique({
      where: { email: result.user.email.toLowerCase() },
      select: { id: true, email: true },
    });
    await recordAuthRegistrationEvent({
      status: AuthRegistrationStatus.SUCCESS,
      provider: AuthProvider.CREDENTIALS,
      email: localUser?.email ?? result.user.email.toLowerCase(),
      userId: localUser?.id ?? null,
      headers: req.headers,
      metadata: {
        source: "ws_api_register",
      },
    });
    await recordAuthFunnelEvent({
      stage: "REGISTER_SUCCESS",
      provider: AuthProvider.CREDENTIALS,
      email: localUser?.email ?? result.user.email.toLowerCase(),
      userId: localUser?.id ?? null,
      sourceContext: "register_api",
      metadata: { source: "ws_api_register" },
      headers: req.headers,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof WsApiHttpError) {
      const isLocalDev = process.env.NODE_ENV !== "production";

      if (isLocalDev && error.statusCode === 409) {
        try {
          const localUser = await upsertLocalMirror({
            email: email.toLowerCase(),
            password,
            name,
            role: "USER",
          });

          await logFailure(
            "USER_EXISTS",
            "User already exists. Registration was converted into local credential refresh.",
            {
              source: "local_dev_wsapi_409_sync",
              userId: localUser.id,
            },
          );

          return NextResponse.json(
            {
              message:
                "Account already exists in ws-api. Local dev credentials were refreshed so you can continue.",
              user: toLocalResponseUser(localUser),
              source: "local_dev_wsapi_409_sync",
            },
            { status: 201 },
          );
        } catch (localError) {
          await logFailure(
            "USER_EXISTS",
            "User already exists in ws-api. Use Login or Forgot Password.",
            {
              source: "local_dev_wsapi_409_sync",
              localError:
                localError instanceof Error ? localError.message : String(localError),
            },
          );
          return NextResponse.json(
            {
              message: "User already exists in ws-api. Use Login or Forgot Password.",
              details: localError instanceof Error ? localError.message : String(localError),
            },
            { status: 409 },
          );
        }
      }

      const localFallbackAllowed =
        isLocalDev &&
        (error.statusCode === 502 || error.statusCode === 504);

      if (localFallbackAllowed) {
        try {
          const localUser = await createLocalOnlyUser({
            email: email.toLowerCase(),
            password,
            name,
          });

          await recordAuthRegistrationEvent({
            status: AuthRegistrationStatus.SUCCESS,
            provider: AuthProvider.CREDENTIALS,
            email: localUser.email,
            userId: localUser.id,
            headers: req.headers,
            metadata: {
              source: "local_fallback_wsapi_unavailable",
            },
          });
          await recordAuthFunnelEvent({
            stage: "REGISTER_SUCCESS",
            provider: AuthProvider.CREDENTIALS,
            email: localUser.email,
            userId: localUser.id,
            sourceContext: "register_api_local_fallback",
            metadata: { source: "local_fallback_wsapi_unavailable" },
            headers: req.headers,
          });

          return NextResponse.json(
            {
              message:
                "User created in local mode (ws-api unavailable). Login is enabled locally and will sync when ws-api returns.",
              user: toLocalResponseUser(localUser),
            },
            { status: 201 },
          );
        } catch (localError) {
          if (localError instanceof WsApiHttpError) {
            await logFailure(
              "LOCAL_FALLBACK_CONFLICT",
              localError.message,
              {
                source: "local_fallback",
                payload: localError.payload,
              },
            );
            return NextResponse.json(
              { message: localError.message, details: localError.payload },
              { status: localError.statusCode },
            );
          }

          await logFailure(
            "LOCAL_FALLBACK_FAILED",
            localError instanceof Error ? localError.message : String(localError),
            {
              source: "local_fallback",
            },
          );
          return NextResponse.json(
            {
              message: "Local fallback registration failed",
              details: localError instanceof Error ? localError.message : String(localError),
            },
            { status: 500 },
          );
        }
      }

      await logFailure(
        `WS_API_${error.statusCode}`,
        error.message,
        {
          payload: error.payload,
        },
      );
      return NextResponse.json(
        { message: error.message, details: error.payload },
        { status: error.statusCode },
      );
    }

    await logFailure(
      "REQUEST_FAILED",
      error instanceof Error ? error.message : "Registration request failed",
    );
    return NextResponse.json(
      { message: "Registration request failed" },
      { status: 502 },
    );
  }
}
