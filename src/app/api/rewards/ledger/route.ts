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
    path: `/rewards/ledger${query}`,
    method: "GET",
    accessToken: accessTokenOrResponse,
  });
}

export async function POST(req: NextRequest) {
  const accessTokenOrResponse = await requireRewardsAccessToken(req);
  if (accessTokenOrResponse instanceof NextResponse) {
    return accessTokenOrResponse;
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  return forwardWsApiRewardsRequest({
    path: "/rewards/ledger",
    method: "POST",
    accessToken: accessTokenOrResponse,
    body,
  });
}
