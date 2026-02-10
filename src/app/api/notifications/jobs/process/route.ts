import { type NextRequest, NextResponse } from "next/server";
import { forwardWsApiOpsRequest } from "@/lib/wsApiOpsProxy";
import { readJsonObjectBody, requireStaffWsApiToken } from "../../_shared";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const tokenOrResponse = await requireStaffWsApiToken(req);
  if (tokenOrResponse instanceof NextResponse) {
    return tokenOrResponse;
  }

  const body = (await readJsonObjectBody(req)) ?? {};

  return forwardWsApiOpsRequest({
    path: "/notifications/jobs/process",
    method: "POST",
    accessToken: tokenOrResponse,
    body,
  });
}
