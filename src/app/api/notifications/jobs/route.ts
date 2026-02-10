import { type NextRequest, NextResponse } from "next/server";
import { safeRequestUrl } from "@/lib/safeRequestUrl";
import { forwardWsApiOpsRequest } from "@/lib/wsApiOpsProxy";
import { invalidBody, readJsonObjectBody, requireStaffWsApiToken } from "../_shared";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const tokenOrResponse = await requireStaffWsApiToken(req);
  if (tokenOrResponse instanceof NextResponse) {
    return tokenOrResponse;
  }

  const query = safeRequestUrl(req).search;
  return forwardWsApiOpsRequest({
    path: `/notifications/jobs${query}`,
    method: "GET",
    accessToken: tokenOrResponse,
  });
}

export async function POST(req: NextRequest) {
  const tokenOrResponse = await requireStaffWsApiToken(req);
  if (tokenOrResponse instanceof NextResponse) {
    return tokenOrResponse;
  }

  const body = await readJsonObjectBody(req);
  if (!body) {
    return invalidBody();
  }

  return forwardWsApiOpsRequest({
    path: "/notifications/jobs",
    method: "POST",
    accessToken: tokenOrResponse,
    body,
  });
}
