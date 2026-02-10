import { type NextRequest, NextResponse } from "next/server";
import { forwardWsApiOpsRequest } from "@/lib/wsApiOpsProxy";
import { requireStaffWsApiToken } from "../../../_shared";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tokenOrResponse = await requireStaffWsApiToken(req);
  if (tokenOrResponse instanceof NextResponse) {
    return tokenOrResponse;
  }

  const { id } = await params;

  return forwardWsApiOpsRequest({
    path: `/notifications/jobs/${encodeURIComponent(id)}/retry`,
    method: "POST",
    accessToken: tokenOrResponse,
    body: {},
  });
}
