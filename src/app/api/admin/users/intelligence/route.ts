import { NextResponse, type NextRequest } from "next/server";
import { getApiAuthContext } from "@/lib/apiAuth";
import { getAdminUserIntelligence } from "@/lib/adminUserIntelligence";
import { hasAnyRole, RBAC_ROLE_GROUPS } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext(req);
  if (!auth.token || !hasAnyRole(auth.role, RBAC_ROLE_GROUPS.ownerAdmin)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const accessToken =
      auth.token && typeof auth.token.wsApiAccessToken === "string"
        ? auth.token.wsApiAccessToken.trim()
        : "";

    const payload = await getAdminUserIntelligence({
      query: req.nextUrl.searchParams.get("query") ?? "",
      accessToken,
    });

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to load user intelligence",
        cause: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
