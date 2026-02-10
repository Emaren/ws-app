import { NextResponse, type NextRequest } from "next/server";
import { getApiAuthContext } from "@/lib/apiAuth";
import { hasAnyRole, RBAC_ROLE_GROUPS } from "@/lib/rbac";
import {
  forwardWsApiOpsRequest,
  isAllowedOpsResource,
} from "@/lib/wsApiOpsProxy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function forbidden() {
  return NextResponse.json({ message: "Forbidden" }, { status: 403 });
}

function unsupported() {
  return NextResponse.json({ message: "Unsupported ops resource" }, { status: 404 });
}

async function requireOpsToken(req: NextRequest): Promise<string | NextResponse> {
  const auth = await getApiAuthContext(req);
  const isStaff = hasAnyRole(auth.role, RBAC_ROLE_GROUPS.staff);
  if (!auth.token || !isStaff) {
    return forbidden();
  }

  const accessToken =
    typeof auth.token.wsApiAccessToken === "string"
      ? auth.token.wsApiAccessToken
      : "";

  if (!accessToken) {
    return forbidden();
  }

  return accessToken;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ resource: string; id: string }> },
) {
  const { resource, id } = await params;
  if (!isAllowedOpsResource(resource)) {
    return unsupported();
  }

  const tokenOrResponse = await requireOpsToken(req);
  if (tokenOrResponse instanceof NextResponse) {
    return tokenOrResponse;
  }

  const query = req.nextUrl.search;
  return forwardWsApiOpsRequest({
    path: `/ops/${resource}/${encodeURIComponent(id)}${query}`,
    method: "GET",
    accessToken: tokenOrResponse,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ resource: string; id: string }> },
) {
  const { resource, id } = await params;
  if (!isAllowedOpsResource(resource)) {
    return unsupported();
  }

  const tokenOrResponse = await requireOpsToken(req);
  if (tokenOrResponse instanceof NextResponse) {
    return tokenOrResponse;
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  return forwardWsApiOpsRequest({
    path: `/ops/${resource}/${encodeURIComponent(id)}`,
    method: "PATCH",
    accessToken: tokenOrResponse,
    body,
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ resource: string; id: string }> },
) {
  const { resource, id } = await params;
  if (!isAllowedOpsResource(resource)) {
    return unsupported();
  }

  const tokenOrResponse = await requireOpsToken(req);
  if (tokenOrResponse instanceof NextResponse) {
    return tokenOrResponse;
  }

  return forwardWsApiOpsRequest({
    path: `/ops/${resource}/${encodeURIComponent(id)}`,
    method: "DELETE",
    accessToken: tokenOrResponse,
  });
}

