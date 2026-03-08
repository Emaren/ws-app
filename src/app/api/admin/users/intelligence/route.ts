import { NextResponse, type NextRequest } from "next/server";
import { getAdminUserIntelligence } from "@/lib/adminUserIntelligence";
import { requireOwnerAdminWsToken } from "../../offers/_shared";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const auth = await requireOwnerAdminWsToken(req);
  if (auth instanceof NextResponse) {
    return auth;
  }

  try {
    const payload = await getAdminUserIntelligence({
      query: req.nextUrl.searchParams.get("query") ?? "",
      accessToken: auth.accessToken,
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
