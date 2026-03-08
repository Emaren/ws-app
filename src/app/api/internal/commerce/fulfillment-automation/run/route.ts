import { NextResponse, type NextRequest } from "next/server";
import { getApiAuthContext } from "@/lib/apiAuth";
import {
  listDueFulfillmentAutomationBusinessIds,
  runFulfillmentAutomation,
} from "@/lib/fulfillmentAutomationRunner";
import { hasAnyRole, RBAC_ROLE_GROUPS } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function resolveAutomationKey(): string | null {
  const value =
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

  const providedKey = req.headers.get("x-fulfillment-automation-key")?.trim() || "";
  const configuredKey = resolveAutomationKey();
  if (!configuredKey || !providedKey || providedKey !== configuredKey) {
    return null;
  }

  return {
    actorUserId: null,
    actorEmail: "system:fulfillment-automation",
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
    typeof payload.businessId === "string" ? payload.businessId.trim() : "";
  const forceDigest = payload.forceDigest === true;
  const limitRaw =
    typeof payload.limit === "number"
      ? payload.limit
      : typeof payload.limit === "string"
        ? Number.parseInt(payload.limit, 10)
        : NaN;
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 25)) : 10;

  const now = new Date();
  const businessIds = businessId
    ? [businessId]
    : await listDueFulfillmentAutomationBusinessIds({
        limit,
        now,
      });

  const completed: Array<{
    businessId: string;
    runId: string;
    escalationQueued: boolean;
    digestQueued: boolean;
    overdueLeadCount: number;
    autoAssignedCount: number;
  }> = [];
  const failed: Array<{ businessId: string; message: string }> = [];

  for (const scheduledBusinessId of businessIds) {
    try {
      const result = await runFulfillmentAutomation({
        businessId: scheduledBusinessId,
        source: "SCHEDULED",
        actorUserId: authorization.actorUserId,
        actorEmail: authorization.actorEmail,
        wsApiAccessToken: authorization.wsApiAccessToken,
        forceDigest,
        now,
      });

      completed.push({
        businessId: scheduledBusinessId,
        runId: result.runId,
        escalationQueued: result.escalationQueued,
        digestQueued: result.digestQueued,
        overdueLeadCount: result.overdueLeadIds.length,
        autoAssignedCount: result.autoAssignedLeadIds.length,
      });
    } catch (error) {
      failed.push({
        businessId: scheduledBusinessId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return NextResponse.json({
    ok: failed.length === 0,
    generatedAt: now.toISOString(),
    dueBusinessCount: businessIds.length,
    completedCount: completed.length,
    failedCount: failed.length,
    completed,
    failed,
  });
}
