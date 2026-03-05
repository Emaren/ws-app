import { Prisma, Role } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiAuthContext } from "@/lib/apiAuth";
import { hasAnyRole, RBAC_ROLE_GROUPS } from "@/lib/rbac";
import { listWsApiUsers } from "../../offers/_shared";
import { buildPublicSurfaceSnapshot } from "@/lib/publicSurfaceDiagnostics";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function normalizeRole(input: string | null | undefined): Role {
  const value = (input || "").trim().toUpperCase();
  if (value === "OWNER") return Role.OWNER;
  if (value === "ADMIN") return Role.ADMIN;
  if (value === "EDITOR") return Role.EDITOR;
  if (value === "CONTRIBUTOR") return Role.CONTRIBUTOR;
  return Role.USER;
}

function summarizeIdentity(input: {
  localByEmail: Map<string, Role>;
  wsByEmail: Map<string, Role>;
}) {
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
      if (localRole !== wsRole) roleMismatchCount += 1;
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

function resolveCronKey(): string | null {
  const value =
    process.env.SYSTEM_HEALTHCHECK_KEY?.trim() ||
    process.env.HEALTH_CHECK_KEY?.trim() ||
    "";
  return value || null;
}

async function authorize(req: NextRequest): Promise<{
  actorUserId: string | null;
  actorEmail: string | null;
  wsApiAccessToken: string | null;
} | null> {
  const auth = await getApiAuthContext(req);
  if (auth.token && hasAnyRole(auth.role, RBAC_ROLE_GROUPS.ownerAdmin)) {
    const token =
      typeof auth.token.wsApiAccessToken === "string" && auth.token.wsApiAccessToken.trim()
        ? auth.token.wsApiAccessToken.trim()
        : null;
    return {
      actorUserId: auth.userId ?? null,
      actorEmail: auth.email ?? null,
      wsApiAccessToken: token,
    };
  }

  const providedKey = req.headers.get("x-health-check-key")?.trim() || "";
  const configuredKey = resolveCronKey();
  if (!configuredKey || !providedKey || providedKey !== configuredKey) {
    return null;
  }

  return {
    actorUserId: null,
    actorEmail: "system:health-check",
    wsApiAccessToken:
      process.env.WS_API_SYSTEM_ACCESS_TOKEN?.trim() ||
      process.env.WS_API_ACCESS_TOKEN?.trim() ||
      null,
  };
}

export async function POST(req: NextRequest) {
  const authorization = await authorize(req);
  if (!authorization) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const warnings: string[] = [];

  try {
    const [localUsers, publicSurfaceSnapshot] = await Promise.all([
      prisma.user.findMany({
        select: {
          email: true,
          role: true,
        },
      }),
      buildPublicSurfaceSnapshot(req),
    ]);

    const localByEmail = new Map<string, Role>();
    for (const user of localUsers) {
      localByEmail.set(normalizeEmail(user.email), normalizeRole(user.role));
    }

    const wsByEmail = new Map<string, Role>();
    let wsApiAvailable = false;

    if (authorization.wsApiAccessToken) {
      try {
        const wsUsers = await listWsApiUsers(authorization.wsApiAccessToken);
        wsApiAvailable = true;
        for (const user of wsUsers) {
          wsByEmail.set(normalizeEmail(user.email), normalizeRole(user.role));
        }
      } catch (error) {
        warnings.push(`ws-api health probe failed: ${safeErrorMessage(error)}`);
      }
    } else {
      warnings.push("ws-api access token unavailable for scheduled health check.");
    }

    const identitySummary = summarizeIdentity({
      localByEmail,
      wsByEmail,
    });

    const [probeRun, identityRun] = await Promise.all([
      prisma.publicSurfaceProbeRun.create({
        data: {
          actorUserId: authorization.actorUserId,
          actorEmail: authorization.actorEmail,
          origin: publicSurfaceSnapshot.origin,
          homeUrl: publicSurfaceSnapshot.homeUrl,
          apexUrl: publicSurfaceSnapshot.apexUrl,
          socialImageUrl: publicSurfaceSnapshot.socialImageUrl,
          xCardBypassUrl: publicSurfaceSnapshot.xCardBypassUrl,
          homeStatus: publicSurfaceSnapshot.homeProbe.status,
          apexStatus: publicSurfaceSnapshot.apexProbe.status,
          socialImageStatus: publicSurfaceSnapshot.socialImageProbe.status,
          homeRedirectedTo: publicSurfaceSnapshot.homeProbe.redirectedTo,
          apexRedirectedTo: publicSurfaceSnapshot.apexProbe.redirectedTo,
          socialImageContentType: publicSurfaceSnapshot.socialImageProbe.contentType,
          hasOgImage: publicSurfaceSnapshot.homeMeta.hasOgImage,
          hasTwitterCard: publicSurfaceSnapshot.homeMeta.hasTwitterCard,
          hasSummaryLargeImage: publicSurfaceSnapshot.homeMeta.hasSummaryLargeImage,
          snapshot: publicSurfaceSnapshot as Prisma.InputJsonValue,
        },
      }),
      prisma.identityAutoHealRun.create({
        data: {
          actorUserId: authorization.actorUserId,
          actorEmail: authorization.actorEmail,
          mode: "scheduled_probe",
          wsApiAvailable,
          scannedCount: identitySummary.scannedCount,
          roleMismatchBefore: identitySummary.roleMismatchCount,
          roleMismatchAfter: identitySummary.roleMismatchCount,
          localOnlyCount: identitySummary.localOnlyCount,
          wsApiOnlyCount: identitySummary.wsApiOnlyCount,
          wsApiRoleUpdated: 0,
          localUsersCreated: 0,
          warnings: warnings.length > 0 ? warnings : Prisma.JsonNull,
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      ranAt: new Date().toISOString(),
      probeRunId: probeRun.id,
      identityRunId: identityRun.id,
      identitySummary,
      warnings,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to execute scheduled health check",
        detail: safeErrorMessage(error),
      },
      { status: 500 },
    );
  }
}
