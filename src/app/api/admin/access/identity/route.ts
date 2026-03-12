import { Role, OfferInboxStatus } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiAuthContext } from "@/lib/apiAuth";
import { hasAnyRole, RBAC_ROLE_GROUPS } from "@/lib/rbac";
import { updateWsApiUserRole } from "@/lib/wsApiClient";
import { listWsApiUsers, type WsApiUser } from "../../offers/_shared";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ROLE_VALUES = new Set<string>(Object.values(Role));

type IdentityStatus = "MATCHED" | "ROLE_MISMATCH" | "LOCAL_ONLY" | "WSAPI_ONLY";

type LocalIdentity = {
  id: string;
  email: string;
  name: string;
  role: string;
  registeredVia: string;
  registeredAt: string;
  lastAuthProvider: string | null;
  lastAuthAt: string | null;
};

type WsApiIdentity = {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  updatedAt: string;
};

type IdentityRow = {
  email: string;
  status: IdentityStatus;
  offerBadgeCount: number;
  local: LocalIdentity | null;
  wsApi: WsApiIdentity | null;
};

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

function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

function parseStatusFilter(input: string | null): IdentityStatus | null {
  if (!input) return null;
  const normalized = input.trim().toUpperCase();
  if (
    normalized === "MATCHED" ||
    normalized === "ROLE_MISMATCH" ||
    normalized === "LOCAL_ONLY" ||
    normalized === "WSAPI_ONLY"
  ) {
    return normalized;
  }
  return null;
}

function sortStatusPriority(status: IdentityStatus): number {
  if (status === "ROLE_MISMATCH") return 0;
  if (status === "LOCAL_ONLY") return 1;
  if (status === "WSAPI_ONLY") return 2;
  return 3;
}

function toLocalIdentity(row: {
  id: string;
  email: string;
  name: string;
  role: string;
  registeredVia: string;
  registeredAt: Date;
  lastAuthProvider: string | null;
  lastAuthAt: Date | null;
}): LocalIdentity {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    registeredVia: row.registeredVia,
    registeredAt: row.registeredAt.toISOString(),
    lastAuthProvider: row.lastAuthProvider,
    lastAuthAt: row.lastAuthAt ? row.lastAuthAt.toISOString() : null,
  };
}

function toWsApiIdentity(row: WsApiUser): WsApiIdentity {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function rowStatus(local: LocalIdentity | null, wsApi: WsApiIdentity | null): IdentityStatus {
  if (local && wsApi) {
    return local.role === wsApi.role ? "MATCHED" : "ROLE_MISMATCH";
  }
  if (local) return "LOCAL_ONLY";
  return "WSAPI_ONLY";
}

async function patchWsApiRole(input: {
  accessToken: string;
  wsApiUserId: string;
  role: string;
}): Promise<void> {
  await updateWsApiUserRole({
    accessToken: input.accessToken,
    userId: input.wsApiUserId,
    role: input.role,
  });
}

export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext(req);
  if (!auth.token || !hasAnyRole(auth.role, RBAC_ROLE_GROUPS.ownerAdmin)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const query = (req.nextUrl.searchParams.get("query") || "").trim().toLowerCase();
  const statusFilter = parseStatusFilter(req.nextUrl.searchParams.get("status"));
  const page = parsePositiveInt(req.nextUrl.searchParams.get("page"), 1, 10_000);
  const pageSize = parsePositiveInt(req.nextUrl.searchParams.get("pageSize"), 20, 200);

  try {
    const accessToken =
      typeof auth.token.wsApiAccessToken === "string"
        ? auth.token.wsApiAccessToken.trim()
        : "";

    const [localUsers, wsUsersRaw, inboxGrouped] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          registeredVia: true,
          registeredAt: true,
          lastAuthProvider: true,
          lastAuthAt: true,
        },
        orderBy: { email: "asc" },
      }),
      accessToken ? listWsApiUsers(accessToken) : Promise.resolve<WsApiUser[]>([]),
      prisma.userOfferInbox.groupBy({
        by: ["userEmail"],
        where: {
          status: OfferInboxStatus.ACTIVE,
        },
        _count: { _all: true },
      }),
    ]);

    const localByEmail = new Map<string, LocalIdentity>();
    const wsByEmail = new Map<string, WsApiIdentity>();
    const offerBadgeByEmail = new Map<string, number>();

    for (const row of inboxGrouped) {
      const email = normalizeEmail(row.userEmail);
      offerBadgeByEmail.set(email, row._count._all);
    }

    for (const user of localUsers) {
      localByEmail.set(normalizeEmail(user.email), toLocalIdentity(user));
    }
    for (const user of wsUsersRaw) {
      wsByEmail.set(normalizeEmail(user.email), toWsApiIdentity(user));
    }

    const mergedEmails = [...new Set([...localByEmail.keys(), ...wsByEmail.keys()])];
    const rowsUnfiltered: IdentityRow[] = mergedEmails.map((email) => {
      const local = localByEmail.get(email) ?? null;
      const wsApi = wsByEmail.get(email) ?? null;
      return {
        email,
        status: rowStatus(local, wsApi),
        offerBadgeCount: offerBadgeByEmail.get(email) ?? 0,
        local,
        wsApi,
      };
    });

    const rowsFiltered = rowsUnfiltered
      .filter((row) => {
        if (statusFilter && row.status !== statusFilter) {
          return false;
        }
        if (!query) {
          return true;
        }
        const localRole = row.local?.role?.toLowerCase() ?? "";
        const wsRole = row.wsApi?.role?.toLowerCase() ?? "";
        const localName = row.local?.name?.toLowerCase() ?? "";
        const wsName = row.wsApi?.name?.toLowerCase() ?? "";
        return (
          row.email.includes(query) ||
          row.status.toLowerCase().includes(query) ||
          localRole.includes(query) ||
          wsRole.includes(query) ||
          localName.includes(query) ||
          wsName.includes(query)
        );
      })
      .sort((a, b) => {
        const statusSort = sortStatusPriority(a.status) - sortStatusPriority(b.status);
        if (statusSort !== 0) return statusSort;
        return a.email.localeCompare(b.email);
      });

    const total = rowsFiltered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const paginatedRows = rowsFiltered.slice(start, start + pageSize);

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      wsApiAvailable: accessToken.length > 0,
      summary: {
        total: rowsUnfiltered.length,
        matched: rowsUnfiltered.filter((row) => row.status === "MATCHED").length,
        roleMismatches: rowsUnfiltered.filter((row) => row.status === "ROLE_MISMATCH").length,
        localOnly: rowsUnfiltered.filter((row) => row.status === "LOCAL_ONLY").length,
        wsApiOnly: rowsUnfiltered.filter((row) => row.status === "WSAPI_ONLY").length,
        zeroOfferUsers: rowsUnfiltered.filter((row) => row.offerBadgeCount === 0).length,
      },
      filters: {
        query,
        status: statusFilter,
      },
      page: safePage,
      pageSize,
      total,
      totalPages,
      rows: paginatedRows,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to load identity snapshot",
        detail: safeErrorMessage(error),
      },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await getApiAuthContext(req);
  if (!auth.token || !hasAnyRole(auth.role, RBAC_ROLE_GROUPS.ownerAdmin)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as
    | { email?: unknown; role?: unknown }
    | null;
  const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";
  const role = typeof body?.role === "string" ? body.role.trim().toUpperCase() : "";

  if (!email) {
    return NextResponse.json({ message: "Email is required" }, { status: 400 });
  }
  if (!ROLE_VALUES.has(role)) {
    return NextResponse.json({ message: "Invalid role" }, { status: 400 });
  }

  try {
    const [localUser, wsUsers] = await Promise.all([
      prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, role: true },
      }),
      typeof auth.token.wsApiAccessToken === "string" &&
      auth.token.wsApiAccessToken.trim().length > 0
        ? listWsApiUsers(auth.token.wsApiAccessToken.trim())
        : Promise.resolve<WsApiUser[]>([]),
    ]);

    const wsUser = wsUsers.find((user) => normalizeEmail(user.email) === email) ?? null;
    if (!localUser && !wsUser) {
      return NextResponse.json(
        { message: "User not found in local db or ws-api" },
        { status: 404 },
      );
    }

    if (localUser) {
      await prisma.user.update({
        where: { id: localUser.id },
        data: { role: role as Role },
      });
    }

    let wsApiUpdated = false;
    if (wsUser && typeof auth.token.wsApiAccessToken === "string" && auth.token.wsApiAccessToken.trim()) {
      await patchWsApiRole({
        accessToken: auth.token.wsApiAccessToken.trim(),
        wsApiUserId: wsUser.id,
        role,
      });
      wsApiUpdated = true;
    }

    return NextResponse.json({
      ok: true,
      email,
      role,
      localUpdated: Boolean(localUser),
      wsApiUpdated,
      warning:
        !wsApiUpdated && wsUser
          ? "ws-api role was not updated because session token was unavailable."
          : null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to update role",
        detail: safeErrorMessage(error),
      },
      { status: 500 },
    );
  }
}
