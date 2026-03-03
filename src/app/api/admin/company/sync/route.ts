import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeAppRole } from "@/lib/rbac";
import {
  listWsApiBusinesses,
  listWsApiUsers,
  requireOwnerAdminWsToken,
  type WsApiBusiness,
  type WsApiUser,
} from "../../offers/_shared";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PLACEHOLDER_PASSWORD = "__ws_api_managed__";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function normalizeStatus(raw: string): "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED" {
  const upper = raw.trim().toUpperCase();
  if (upper === "DRAFT" || upper === "ACTIVE" || upper === "PAUSED" || upper === "ARCHIVED") {
    return upper;
  }
  return "ACTIVE";
}

function sanitizeSlug(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "business";
}

async function ensureUniqueBusinessSlug(baseSlug: string, businessId: string): Promise<string> {
  let candidate = sanitizeSlug(baseSlug);
  let suffix = 2;

  while (true) {
    const existing = await prisma.business.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === businessId) {
      return candidate;
    }

    candidate = `${sanitizeSlug(baseSlug)}-${suffix}`;
    suffix += 1;
  }
}

async function ensureLocalOwnerUser(
  wsUser: WsApiUser | null,
): Promise<{ ownerUserId: string | null; warning?: string }> {
  if (!wsUser) {
    return { ownerUserId: null, warning: "Missing ws-api owner user record" };
  }

  const normalizedRole = normalizeAppRole(wsUser.role) ?? "USER";
  const email = wsUser.email.trim().toLowerCase();

  const [byId, byEmail] = await Promise.all([
    prisma.user.findUnique({
      where: { id: wsUser.id },
      select: { id: true, email: true, name: true, role: true },
    }),
    prisma.user.findUnique({
      where: { email },
      select: { id: true },
    }),
  ]);

  if (!byId && byEmail && byEmail.id !== wsUser.id) {
    await prisma.user.update({
      where: { id: byEmail.id },
      data: {
        name: wsUser.name,
        role: normalizedRole,
      },
    });

    return {
      ownerUserId: byEmail.id,
      warning: `Mapped owner ${email} to existing local user id ${byEmail.id} (ws-api id ${wsUser.id} differs).`,
    };
  }

  if (byId && byEmail && byEmail.id !== byId.id) {
    await prisma.user.update({
      where: { id: byId.id },
      data: {
        name: wsUser.name,
        role: normalizedRole,
      },
    });

    return {
      ownerUserId: byId.id,
      warning: `Kept existing owner id ${byId.id}; email ${email} already belongs to another local account ${byEmail.id}.`,
    };
  }

  await prisma.user.upsert({
    where: { id: wsUser.id },
    update: {
      email,
      name: wsUser.name,
      role: normalizedRole,
    },
    create: {
      id: wsUser.id,
      email,
      name: wsUser.name,
      role: normalizedRole,
      password: PLACEHOLDER_PASSWORD,
    },
  });

  return { ownerUserId: wsUser.id };
}

async function syncBusinessToPrisma(input: {
  business: WsApiBusiness;
  usersById: Map<string, WsApiUser>;
}): Promise<{ id: string; slug: string; name: string; warning?: string }> {
  const ownerWsUser =
    input.business.ownerUserId && input.usersById.has(input.business.ownerUserId)
      ? input.usersById.get(input.business.ownerUserId) ?? null
      : null;
  const ownerResolution = await ensureLocalOwnerUser(ownerWsUser);
  const baseSlug = input.business.slug || input.business.name || input.business.id;
  const slug = await ensureUniqueBusinessSlug(baseSlug, input.business.id);

  const synced = await prisma.business.upsert({
    where: { id: input.business.id },
    update: {
      slug,
      name: input.business.name,
      contactEmail: input.business.contactEmail ?? null,
      status: normalizeStatus(input.business.status),
      isVerified: input.business.isVerified,
      ownerUserId: ownerResolution.ownerUserId,
    },
    create: {
      id: input.business.id,
      slug,
      name: input.business.name,
      contactEmail: input.business.contactEmail ?? null,
      status: normalizeStatus(input.business.status),
      isVerified: input.business.isVerified,
      ownerUserId: ownerResolution.ownerUserId,
    },
    select: {
      id: true,
      slug: true,
      name: true,
    },
  });

  return {
    ...synced,
    warning: ownerResolution.warning,
  };
}

export async function POST(req: NextRequest) {
  const auth = await requireOwnerAdminWsToken(req);
  if (auth instanceof NextResponse) {
    return auth;
  }

  const body = asRecord(await req.json().catch(() => null)) ?? {};
  const businessIds = Array.isArray(body.businessIds)
    ? body.businessIds
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean)
    : [];

  try {
    const [wsBusinesses, wsUsers] = await Promise.all([
      listWsApiBusinesses(auth.accessToken),
      listWsApiUsers(auth.accessToken),
    ]);

    const targets =
      businessIds.length > 0
        ? wsBusinesses.filter((business) => businessIds.includes(business.id))
        : wsBusinesses;

    if (targets.length === 0) {
      return NextResponse.json(
        { message: "No businesses found to sync" },
        { status: 404 },
      );
    }

    const usersById = new Map(wsUsers.map((user) => [user.id, user]));
    const syncedRows: Array<{
      id: string;
      slug: string;
      name: string;
      warning?: string;
    }> = [];
    const warnings: string[] = [];

    for (const business of targets) {
      const synced = await syncBusinessToPrisma({ business, usersById });
      syncedRows.push(synced);
      if (synced.warning) {
        warnings.push(`${synced.name}: ${synced.warning}`);
      }
    }

    return NextResponse.json({
      ok: true,
      syncedCount: syncedRows.length,
      businesses: syncedRows,
      warnings,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to sync company dashboards into offers engine",
        cause: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
