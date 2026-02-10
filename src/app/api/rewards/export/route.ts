import { NextResponse, type NextRequest } from "next/server";
import { forwardWsApiRewardsRequest } from "@/lib/wsApiRewardsProxy";
import { requireRewardsAccessToken } from "../_shared";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const accessTokenOrResponse = await requireRewardsAccessToken(req);
  if (accessTokenOrResponse instanceof NextResponse) {
    return accessTokenOrResponse;
  }

  const query = req.nextUrl.search;
  return forwardWsApiRewardsRequest({
    path: `/rewards/export${query}`,
    method: "GET",
    accessToken: accessTokenOrResponse,
  });
}
