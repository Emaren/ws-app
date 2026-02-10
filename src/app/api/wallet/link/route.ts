import { NextResponse, type NextRequest } from "next/server";
import { forwardWsApiWalletRequest } from "@/lib/wsApiWalletProxy";
import { requireWalletAccessToken } from "../_shared";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const accessTokenOrResponse = await requireWalletAccessToken(req);
  if (accessTokenOrResponse instanceof NextResponse) {
    return accessTokenOrResponse;
  }

  return forwardWsApiWalletRequest({
    path: "/auth/wallet",
    method: "GET",
    accessToken: accessTokenOrResponse,
  });
}

export async function POST(req: NextRequest) {
  const accessTokenOrResponse = await requireWalletAccessToken(req);
  if (accessTokenOrResponse instanceof NextResponse) {
    return accessTokenOrResponse;
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  return forwardWsApiWalletRequest({
    path: "/auth/wallet/link",
    method: "POST",
    accessToken: accessTokenOrResponse,
    body,
  });
}

export async function DELETE(req: NextRequest) {
  const accessTokenOrResponse = await requireWalletAccessToken(req);
  if (accessTokenOrResponse instanceof NextResponse) {
    return accessTokenOrResponse;
  }

  return forwardWsApiWalletRequest({
    path: "/auth/wallet",
    method: "DELETE",
    accessToken: accessTokenOrResponse,
  });
}
