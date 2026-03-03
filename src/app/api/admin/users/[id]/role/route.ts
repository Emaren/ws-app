import { NextResponse, type NextRequest } from "next/server";
import { getWsApiBaseUrl } from "@/lib/wsApiBaseUrl";
import { requireOwnerAdminWsToken } from "../../../offers/_shared";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const VALID_ROLES = new Set(["OWNER", "ADMIN", "EDITOR", "CONTRIBUTOR", "USER"]);

function payloadFromUnknown(value: unknown): unknown {
  if (value === null || value === undefined) {
    return {};
  }
  if (typeof value === "string") {
    return { message: value };
  }
  return value;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireOwnerAdminWsToken(req);
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id } = await params;
  if (!id.trim()) {
    return NextResponse.json({ message: "User id is required" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const role = typeof body?.role === "string" ? body.role.trim().toUpperCase() : "";
  if (!VALID_ROLES.has(role)) {
    return NextResponse.json({ message: "Invalid role" }, { status: 400 });
  }

  const response = await fetch(`${getWsApiBaseUrl()}/users/${encodeURIComponent(id)}/role`, {
    method: "PATCH",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.accessToken}`,
    },
    body: JSON.stringify({ role }),
  });

  const payload = await response
    .json()
    .catch(async () => response.text().catch(() => ""));

  return NextResponse.json(payloadFromUnknown(payload), {
    status: response.status,
  });
}
