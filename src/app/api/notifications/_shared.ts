import { NextResponse, type NextRequest } from "next/server";
import { getApiAuthContext } from "@/lib/apiAuth";
import { hasAnyRole, RBAC_ROLE_GROUPS } from "@/lib/rbac";

function forbidden() {
  return NextResponse.json({ message: "Forbidden" }, { status: 403 });
}

export function invalidBody() {
  return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
}

export async function requireStaffWsApiToken(
  req: NextRequest,
): Promise<string | NextResponse> {
  const auth = await getApiAuthContext(req);
  const isStaff = hasAnyRole(auth.role, RBAC_ROLE_GROUPS.staff);
  if (!auth.token || !isStaff) {
    return forbidden();
  }

  const accessToken =
    typeof auth.token.wsApiAccessToken === "string"
      ? auth.token.wsApiAccessToken
      : "";

  if (!accessToken) {
    return forbidden();
  }

  return accessToken;
}

export async function readJsonObjectBody(req: NextRequest): Promise<Record<string, unknown> | null> {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }
  return body as Record<string, unknown>;
}
