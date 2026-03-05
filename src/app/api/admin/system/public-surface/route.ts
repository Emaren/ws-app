import { Prisma } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiAuthContext } from "@/lib/apiAuth";
import { hasAnyRole, RBAC_ROLE_GROUPS } from "@/lib/rbac";
import { buildPublicSurfaceSnapshot } from "@/lib/publicSurfaceDiagnostics";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

async function assertOwnerAdmin(req: NextRequest) {
  const auth = await getApiAuthContext(req);
  if (!auth.token || !hasAnyRole(auth.role, RBAC_ROLE_GROUPS.ownerAdmin)) {
    return null;
  }
  return auth;
}

export async function GET(req: NextRequest) {
  const auth = await assertOwnerAdmin(req);
  if (!auth) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const page = parsePositiveInt(req.nextUrl.searchParams.get("page"), 1, 10_000);
  const pageSize = parsePositiveInt(req.nextUrl.searchParams.get("pageSize"), 10, 100);
  const skip = (page - 1) * pageSize;

  try {
    const [total, rows] = await Promise.all([
      prisma.publicSurfaceProbeRun.count(),
      prisma.publicSurfaceProbeRun.findMany({
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
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to load public-surface diagnostics history",
        detail: safeErrorMessage(error),
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await assertOwnerAdmin(req);
  if (!auth) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const snapshot = await buildPublicSurfaceSnapshot(req);

    const run = await prisma.publicSurfaceProbeRun.create({
      data: {
        actorUserId: auth.userId ?? null,
        actorEmail: auth.email ?? null,
        origin: snapshot.origin,
        homeUrl: snapshot.homeUrl,
        apexUrl: snapshot.apexUrl,
        socialImageUrl: snapshot.socialImageUrl,
        xCardBypassUrl: snapshot.xCardBypassUrl,
        homeStatus: snapshot.homeProbe.status,
        apexStatus: snapshot.apexProbe.status,
        socialImageStatus: snapshot.socialImageProbe.status,
        homeRedirectedTo: snapshot.homeProbe.redirectedTo,
        apexRedirectedTo: snapshot.apexProbe.redirectedTo,
        socialImageContentType: snapshot.socialImageProbe.contentType,
        hasOgImage: snapshot.homeMeta.hasOgImage,
        hasTwitterCard: snapshot.homeMeta.hasTwitterCard,
        hasSummaryLargeImage: snapshot.homeMeta.hasSummaryLargeImage,
        snapshot: snapshot as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      ok: true,
      run,
      snapshot,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to execute public-surface diagnostics run",
        detail: safeErrorMessage(error),
      },
      { status: 500 },
    );
  }
}
