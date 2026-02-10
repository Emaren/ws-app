import { type NextRequest, NextResponse } from "next/server";
import { safeRequestUrl } from "@/lib/safeRequestUrl";
import { forwardWsApiOpsRequest } from "@/lib/wsApiOpsProxy";
import { requireStaffWsApiToken } from "../_shared";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const tokenOrResponse = await requireStaffWsApiToken(req);
  if (tokenOrResponse instanceof NextResponse) {
    return tokenOrResponse;
  }

  const query = safeRequestUrl(req).search;

  return forwardWsApiOpsRequest({
    path: `/notifications/audit${query}`,
    method: "GET",
    accessToken: tokenOrResponse,
  });
}
