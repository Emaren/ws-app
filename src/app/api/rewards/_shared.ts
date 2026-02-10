import { NextResponse, type NextRequest } from "next/server";
import { getApiAuthContext } from "@/lib/apiAuth";

export async function requireRewardsAccessToken(
  req: NextRequest,
): Promise<string | NextResponse> {
  const auth = await getApiAuthContext(req);
  if (!auth.token) {
    return NextResponse.json({ message: "Authentication required" }, { status: 401 });
  }

  const accessToken =
    typeof auth.token.wsApiAccessToken === "string"
      ? auth.token.wsApiAccessToken
      : "";

  if (!accessToken) {
    return NextResponse.json({ message: "Authentication required" }, { status: 401 });
  }

  return accessToken;
}
