import { type NextRequest, NextResponse } from "next/server";
import { forwardWsApiOpsRequest } from "@/lib/wsApiOpsProxy";
import { requireStaffWsApiToken } from "../_shared";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const tokenOrResponse = await requireStaffWsApiToken(req);
  if (tokenOrResponse instanceof NextResponse) {
    return tokenOrResponse;
  }

  return forwardWsApiOpsRequest({
    route: "/notifications/audit",
    method: "GET",
    accessToken: tokenOrResponse,
    query: req.nextUrl.search,
  });
}
