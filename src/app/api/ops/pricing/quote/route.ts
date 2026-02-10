import { NextResponse, type NextRequest } from "next/server";
import { getApiAuthContext } from "@/lib/apiAuth";
import { hasAnyRole, RBAC_ROLE_GROUPS } from "@/lib/rbac";
import { forwardWsApiOpsRequest } from "@/lib/wsApiOpsProxy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function forbidden() {
  return NextResponse.json({ message: "Forbidden" }, { status: 403 });
}

async function requireOpsToken(req: NextRequest): Promise<string | NextResponse> {
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

export async function POST(req: NextRequest) {
  const tokenOrResponse = await requireOpsToken(req);
  if (tokenOrResponse instanceof NextResponse) {
    return tokenOrResponse;
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  return forwardWsApiOpsRequest({
    path: "/ops/pricing/quote",
    method: "POST",
    accessToken: tokenOrResponse,
    body,
  });
}
