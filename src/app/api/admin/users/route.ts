import { NextResponse, type NextRequest } from "next/server";
import { listWsApiUsers, requireOwnerAdminWsToken } from "../offers/_shared";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const auth = await requireOwnerAdminWsToken(req);
  if (auth instanceof NextResponse) {
    return auth;
  }

  try {
    const users = await listWsApiUsers(auth.accessToken);
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to load users",
        cause: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
