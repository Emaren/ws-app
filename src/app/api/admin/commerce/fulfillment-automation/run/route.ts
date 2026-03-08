import { NextResponse, type NextRequest } from "next/server";
import { getApiAuthContext } from "@/lib/apiAuth";
import { runFulfillmentAutomation } from "@/lib/fulfillmentAutomationRunner";
import { prisma } from "@/lib/prisma";
import { hasAnyRole, RBAC_ROLE_GROUPS } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function businessScopeWhere(input: { isOwnerAdmin: boolean; actorUserId: string | null }) {
  if (input.isOwnerAdmin) {
    return {};
  }

  return {
    ownerUserId: input.actorUserId ?? "__unscoped__",
  };
}

export async function POST(req: NextRequest) {
  const auth = await getApiAuthContext(req);
  const isStaff = hasAnyRole(auth.role, RBAC_ROLE_GROUPS.staff);
  const isOwnerAdmin = hasAnyRole(auth.role, RBAC_ROLE_GROUPS.ownerAdmin);

  if (!auth.token || !isStaff) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const businessId = typeof payload.businessId === "string" ? payload.businessId.trim() : "";
  if (!businessId) {
    return NextResponse.json({ message: "businessId is required" }, { status: 400 });
  }

  const business = await prisma.business.findFirst({
    where: {
      id: businessId,
      ...businessScopeWhere({
        isOwnerAdmin,
        actorUserId: auth.userId ?? null,
      }),
    },
    select: {
      id: true,
    },
  });

  if (!business) {
    return NextResponse.json(
      { message: "Business not found in your commerce scope" },
      { status: 404 },
    );
  }

  try {
    const result = await runFulfillmentAutomation({
      businessId,
      source: "MANUAL",
      actorUserId: auth.userId ?? null,
      actorEmail: auth.email ?? null,
      wsApiAccessToken:
        typeof auth.token.wsApiAccessToken === "string" ? auth.token.wsApiAccessToken : null,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unexpected error" },
      { status: 400 },
    );
  }
}
