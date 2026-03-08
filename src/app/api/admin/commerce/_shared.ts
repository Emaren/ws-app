import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { getApiAuthContext } from "@/lib/apiAuth";
import { hasAnyRole, RBAC_ROLE_GROUPS, type AppRole } from "@/lib/rbac";

export type CommerceManagerAuthContext = {
  role: AppRole;
  isOwnerAdmin: boolean;
  actorUserId: string | null;
};

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

export function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

export function parseOptionalInt(
  value: unknown,
  fieldName: string,
): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string" && !value.trim()) {
    return null;
  }

  const parsed =
    typeof value === "number"
      ? Math.trunc(value)
      : Number.parseInt(String(value).trim(), 10);

  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} must be an integer`);
  }

  return parsed;
}

export function parseOptionalDate(
  value: unknown,
  fieldName: string,
): Date | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    throw new Error(`${fieldName} must be a valid date`);
  }

  return parsed;
}

export function parseOptionalUrl(
  value: unknown,
  fieldName: string,
): string | null {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error(`${fieldName} must be a valid URL`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`${fieldName} must use http or https`);
  }

  return parsed.toString();
}

export function parseBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }

  return Boolean(value);
}

export function businessScopeWhere(
  auth: CommerceManagerAuthContext,
): Prisma.BusinessWhereInput {
  if (auth.isOwnerAdmin) {
    return {};
  }

  return {
    ownerUserId: auth.actorUserId ?? "__unscoped__",
  };
}

export async function requireCommerceManagerAuth(
  req: NextRequest,
): Promise<CommerceManagerAuthContext | NextResponse> {
  const auth = await getApiAuthContext(req);
  if (!auth.token || !hasAnyRole(auth.role, RBAC_ROLE_GROUPS.staff)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  if (!auth.role) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const isOwnerAdmin = hasAnyRole(auth.role, RBAC_ROLE_GROUPS.ownerAdmin);
  if (!isOwnerAdmin && !auth.userId) {
    return NextResponse.json(
      { message: "Missing actor identity for business-scoped access" },
      { status: 403 },
    );
  }

  return {
    role: auth.role,
    isOwnerAdmin,
    actorUserId: auth.userId ?? null,
  };
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}
