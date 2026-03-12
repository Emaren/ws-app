import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import { AuthProvider, Prisma, Role } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiAuthContext } from "@/lib/apiAuth";
import { hasAnyRole, RBAC_ROLE_GROUPS } from "@/lib/rbac";
import { updateWsApiUserRole } from "@/lib/wsApiClient";
import { listWsApiUsers, type WsApiUser } from "../../offers/_shared";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const LOCAL_SYNC_PASSWORD_SALT_ROUNDS = 10;
const ROLE_VALUES = new Set<string>(Object.values(Role));

type AutoHealMode = "dry_run" | "apply";

type IdentitySummary = {
  scannedCount: number;
  roleMismatchCount: number;
  localOnlyCount: number;
  wsApiOnlyCount: number;
};

function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

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

function parseBoolean(input: unknown, fallback: boolean): boolean {
  if (typeof input === "boolean") return input;
  if (typeof input === "string") {
    const normalized = input.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) return true;
    if (["0", "false", "no", "off"].includes(normalized)) return false;
  }
  return fallback;
}

function parseMode(input: unknown): AutoHealMode {
  const value = typeof input === "string" ? input.trim().toLowerCase() : "";
  return value === "apply" ? "apply" : "dry_run";
}

function normalizeRole(input: string | null | undefined): Role {
  const value = (input || "").trim().toUpperCase();
  if (ROLE_VALUES.has(value)) {
    return value as Role;
  }
  return Role.USER;
}

function summarizeIdentity(input: {
  localByEmail: Map<string, Role>;
  wsByEmail: Map<string, Role>;
}): IdentitySummary {
  const mergedEmails = new Set<string>([
    ...input.localByEmail.keys(),
    ...input.wsByEmail.keys(),
  ]);
  let roleMismatchCount = 0;
  let localOnlyCount = 0;
  let wsApiOnlyCount = 0;

  for (const email of mergedEmails) {
    const localRole = input.localByEmail.get(email);
    const wsRole = input.wsByEmail.get(email);
    if (localRole && wsRole) {
      if (localRole !== wsRole) {
        roleMismatchCount += 1;
      }
      continue;
    }
    if (localRole) {
      localOnlyCount += 1;
      continue;
    }
    wsApiOnlyCount += 1;
  }

  return {
    scannedCount: mergedEmails.size,
    roleMismatchCount,
    localOnlyCount,
    wsApiOnlyCount,
  };
}

async function patchWsApiRole(input: {
  accessToken: string;
  wsApiUserId: string;
  role: Role;
}): Promise<void> {
  await updateWsApiUserRole({
    accessToken: input.accessToken,
    userId: input.wsApiUserId,
    role: input.role,
  });
}

async function loadIdentityMaps(accessToken: string | null): Promise<{
  wsApiAvailable: boolean;
  localByEmail: Map<string, Role>;
  wsByEmail: Map<string, Role>;
  wsUsers: WsApiUser[];
}> {
  const wsUsers = accessToken ? await listWsApiUsers(accessToken) : [];
  const localUsers = await prisma.user.findMany({
    select: {
      email: true,
      role: true,
    },
  });

  const localByEmail = new Map<string, Role>();
  const wsByEmail = new Map<string, Role>();
  for (const user of localUsers) {
    localByEmail.set(normalizeEmail(user.email), normalizeRole(user.role));
  }
  for (const user of wsUsers) {
    wsByEmail.set(normalizeEmail(user.email), normalizeRole(user.role));
  }

  return {
    wsApiAvailable: Boolean(accessToken),
    localByEmail,
    wsByEmail,
    wsUsers,
  };
}

export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext(req);
  if (!auth.token || !hasAnyRole(auth.role, RBAC_ROLE_GROUPS.ownerAdmin)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const page = parsePositiveInt(req.nextUrl.searchParams.get("page"), 1, 10_000);
  const pageSize = parsePositiveInt(req.nextUrl.searchParams.get("pageSize"), 15, 100);
  const skip = (page - 1) * pageSize;

  const [total, rows] = await Promise.all([
    prisma.identityAutoHealRun.count(),
    prisma.identityAutoHealRun.findMany({
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
        mode?: unknown;
        alignWsApiRoles?: unknown;
        createLocalForWsApiOnly?: unknown;
      }
    | null;

  const mode = parseMode(body?.mode);
  const applyChanges = mode === "apply";
  const alignWsApiRoles = parseBoolean(body?.alignWsApiRoles, true);
  const createLocalForWsApiOnly = parseBoolean(body?.createLocalForWsApiOnly, true);

  const accessTokenRaw = auth.token.wsApiAccessToken;
  const accessToken =
    typeof accessTokenRaw === "string" && accessTokenRaw.trim().length > 0
      ? accessTokenRaw.trim()
      : null;

  const warnings: string[] = [];
  if (!accessToken) {
    warnings.push("No ws-api access token in session; ws-api updates are unavailable.");
  }

  try {
    const before = await loadIdentityMaps(accessToken);
    const beforeSummary = summarizeIdentity({
      localByEmail: before.localByEmail,
      wsByEmail: before.wsByEmail,
    });

    let wsApiRoleUpdated = 0;
    let localUsersCreated = 0;

    if (applyChanges && accessToken) {
      if (alignWsApiRoles) {
        for (const wsUser of before.wsUsers) {
          const email = normalizeEmail(wsUser.email);
          const localRole = before.localByEmail.get(email);
          if (!localRole) continue;
          const wsRole = before.wsByEmail.get(email);
          if (!wsRole || wsRole === localRole) continue;
          try {
            await patchWsApiRole({
              accessToken,
              wsApiUserId: wsUser.id,
              role: localRole,
            });
            wsApiRoleUpdated += 1;
          } catch (error) {
            warnings.push(
              `Role sync failed for ${email}: ${safeErrorMessage(error)}`,
            );
          }
        }
      }

      if (createLocalForWsApiOnly) {
        for (const wsUser of before.wsUsers) {
          const email = normalizeEmail(wsUser.email);
          if (before.localByEmail.has(email)) continue;
          try {
            await prisma.user.create({
              data: {
                email,
                name:
                  wsUser.name?.trim() ||
                  email.split("@")[0] ||
                  "user",
                role: normalizeRole(wsUser.role),
                password: await bcrypt.hash(
                  randomUUID(),
                  LOCAL_SYNC_PASSWORD_SALT_ROUNDS,
                ),
                registeredVia: AuthProvider.OTHER,
                lastAuthProvider: AuthProvider.OTHER,
                lastAuthAt: new Date(),
              },
            });
            localUsersCreated += 1;
          } catch (error) {
            if (
              error instanceof Prisma.PrismaClientKnownRequestError &&
              error.code === "P2002"
            ) {
              continue;
            }
            warnings.push(
              `Local sync failed for ${email}: ${safeErrorMessage(error)}`,
            );
          }
        }
      }
    }

    const after = applyChanges
      ? await loadIdentityMaps(accessToken)
      : before;
    const afterSummary = summarizeIdentity({
      localByEmail: after.localByEmail,
      wsByEmail: after.wsByEmail,
    });

    const run = await prisma.identityAutoHealRun.create({
      data: {
        actorUserId: auth.userId ?? null,
        actorEmail: auth.email ?? null,
        mode,
        wsApiAvailable: before.wsApiAvailable,
        scannedCount: afterSummary.scannedCount,
        roleMismatchBefore: beforeSummary.roleMismatchCount,
        roleMismatchAfter: afterSummary.roleMismatchCount,
        localOnlyCount: afterSummary.localOnlyCount,
        wsApiOnlyCount: afterSummary.wsApiOnlyCount,
        wsApiRoleUpdated,
        localUsersCreated,
        warnings: warnings.length > 0 ? warnings : Prisma.JsonNull,
      },
    });

    return NextResponse.json({
      ok: true,
      run,
      mode,
      applied: applyChanges,
      options: {
        alignWsApiRoles,
        createLocalForWsApiOnly,
      },
      summary: {
        before: beforeSummary,
        after: afterSummary,
        wsApiRoleUpdated,
        localUsersCreated,
        warnings,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to run identity auto-heal",
        detail: safeErrorMessage(error),
      },
      { status: 500 },
    );
  }
}
