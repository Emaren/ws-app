import { NextResponse, type NextRequest } from "next/server";
import { getApiAuthContext } from "@/lib/apiAuth";
import { hasAnyRole, RBAC_ROLE_GROUPS } from "@/lib/rbac";
import { runSavedProductMatchAutomation } from "@/lib/savedOfferAutomation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function resolveAutomationKey(): string | null {
  const value =
    process.env.SAVED_MATCH_AUTOMATION_KEY?.trim() ||
    process.env.FULFILLMENT_AUTOMATION_KEY?.trim() ||
    process.env.SYSTEM_HEALTHCHECK_KEY?.trim() ||
    process.env.HEALTH_CHECK_KEY?.trim() ||
    "";

  return value || null;
}

async function authorize(req: NextRequest): Promise<{
  actorUserId: string | null;
  actorEmail: string | null;
  wsApiAccessToken: string | null;
} | null> {
  const auth = await getApiAuthContext(req);
  if (auth.token && hasAnyRole(auth.role, RBAC_ROLE_GROUPS.ownerAdmin)) {
    return {
      actorUserId: auth.userId ?? null,
      actorEmail: auth.email ?? null,
      wsApiAccessToken:
        typeof auth.token.wsApiAccessToken === "string" ? auth.token.wsApiAccessToken.trim() : null,
    };
  }

  const providedKey = req.headers.get("x-saved-match-automation-key")?.trim() || "";
  const configuredKey = resolveAutomationKey();
  if (!configuredKey || !providedKey || configuredKey !== providedKey) {
    return null;
  }

  return {
    actorUserId: null,
    actorEmail: "system:saved-match-automation",
    wsApiAccessToken:
      process.env.WS_API_SYSTEM_ACCESS_TOKEN?.trim() ||
      process.env.WS_API_ACCESS_TOKEN?.trim() ||
      null,
  };
}

export async function POST(req: NextRequest) {
  const authorization = await authorize(req);
  if (!authorization) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const payload =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};

  const businessId =
    typeof payload.businessId === "string" && payload.businessId.trim()
      ? payload.businessId.trim()
      : null;
  const offerId =
    typeof payload.offerId === "string" && payload.offerId.trim()
      ? payload.offerId.trim()
      : null;

  const result = await runSavedProductMatchAutomation({
    source: "SCHEDULED",
    actorUserId: authorization.actorUserId,
    actorEmail: authorization.actorEmail,
    businessId,
    offerId,
    wsApiAccessToken: authorization.wsApiAccessToken,
    now: new Date(),
  });

  return NextResponse.json(result);
}
