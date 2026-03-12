import { type NextRequest, NextResponse } from "next/server";
import { forwardWsApiOpsRequest } from "@/lib/wsApiOpsProxy";
import { requireStaffWsApiToken } from "../../../_shared";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tokenOrResponse = await requireStaffWsApiToken(req);
  if (tokenOrResponse instanceof NextResponse) {
    return tokenOrResponse;
  }

  const { id } = await params;
  return forwardWsApiOpsRequest({
    route: "/notifications/jobs/:id/audit",
    method: "GET",
    accessToken: tokenOrResponse,
    pathParams: { id },
    query: req.nextUrl.search,
  });
}
