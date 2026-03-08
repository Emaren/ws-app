import type { Prisma } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { getApiAuthContext } from "@/lib/apiAuth";
import {
  applyTemplate,
  DEFAULT_ESCALATION_TEMPLATE,
  isOpenLead,
  isOverdueLead,
  summarizeFulfillmentLeads,
} from "@/lib/fulfillmentAutomation";
import { prisma } from "@/lib/prisma";
import { hasAnyRole, RBAC_ROLE_GROUPS } from "@/lib/rbac";
import { getWsApiBaseUrl } from "@/lib/wsApiBaseUrl";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const REQUEST_TIMEOUT_MS = 10_000;

function appendAutomationNote(existing: string | null, note: string, timestamp: string): string {
  const entry = `[${timestamp}] ${note}`;
  if (!existing?.trim()) {
    return entry;
  }

  return `${existing.trim()}\n\n${entry}`.slice(0, 2400);
}

function businessScopeWhere(input: { isOwnerAdmin: boolean; actorUserId: string | null }) {
  if (input.isOwnerAdmin) {
    return {};
  }

  return {
    ownerUserId: input.actorUserId ?? "__unscoped__",
  };
}

async function wsApiJson<T>(input: {
  path: string;
  method: "POST";
  accessToken: string;
  body: unknown;
}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${getWsApiBaseUrl()}${input.path}`, {
      method: input.method,
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${input.accessToken}`,
      },
      body: JSON.stringify(input.body),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message =
        payload && typeof payload === "object" && "message" in payload
          ? String(payload.message)
          : `ws-api request failed (${response.status})`;
      throw new Error(message);
    }

    return payload as T;
  } finally {
    clearTimeout(timer);
  }
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
  const businessId =
    typeof payload.businessId === "string" ? payload.businessId.trim() : "";
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
      name: true,
      fulfillmentAutomationProfile: {
        select: {
          id: true,
          defaultAssigneeUserId: true,
          defaultAssigneeName: true,
          autoAssignEnabled: true,
          autoEscalateEnabled: true,
          slaHours: true,
          escalationCooldownHours: true,
          escalationEmail: true,
          escalationTemplate: true,
          lastEscalationAt: true,
        },
      },
    },
  });

  if (!business) {
    return NextResponse.json(
      { message: "Business not found in your commerce scope" },
      { status: 404 },
    );
  }

  const profile = business.fulfillmentAutomationProfile;
  if (!profile) {
    return NextResponse.json(
      { message: "Create a fulfillment automation profile first" },
      { status: 400 },
    );
  }

  const leads = await prisma.deliveryLead.findMany({
    where: {
      businessId,
    },
    orderBy: [{ requestedAt: "asc" }],
    select: {
      id: true,
      status: true,
      assignedToUserId: true,
      assignedToName: true,
      requestedAt: true,
      fulfillBy: true,
      notes: true,
      deliveryAddress: true,
      recipient: {
        select: {
          name: true,
          email: true,
          phone: true,
        },
      },
      inventoryItem: {
        select: {
          name: true,
        },
      },
      offer: {
        select: {
          title: true,
        },
      },
    },
  });

  const now = new Date();
  const autoAssignableLeads = leads.filter(
    (lead) =>
      isOpenLead(lead.status) &&
      !lead.assignedToUserId &&
      profile.autoAssignEnabled &&
      profile.defaultAssigneeUserId,
  );

  const autoAssignedLeadIds: string[] = [];
  if (autoAssignableLeads.length > 0 && profile.defaultAssigneeUserId) {
    const updates: Prisma.PrismaPromise<unknown>[] = autoAssignableLeads.map((lead) => {
      const fulfillBy =
        lead.fulfillBy ??
        new Date(lead.requestedAt.getTime() + profile.slaHours * 60 * 60 * 1000);
      autoAssignedLeadIds.push(lead.id);

      return prisma.deliveryLead.update({
        where: {
          id: lead.id,
        },
        data: {
          assignedToUserId: profile.defaultAssigneeUserId,
          assignedToName: profile.defaultAssigneeName,
          assignedAt: now,
          fulfillBy,
          notes: appendAutomationNote(
            lead.notes,
            `Auto-assigned to ${profile.defaultAssigneeName ?? "default operator"} by fulfillment automation.`,
            now.toISOString(),
          ),
        },
      });
    });

    await prisma.$transaction(updates);
  }

  const refreshedLeads = await prisma.deliveryLead.findMany({
    where: {
      businessId,
    },
    select: {
      id: true,
      status: true,
      assignedToUserId: true,
      fulfillBy: true,
      requestedAt: true,
      deliveryAddress: true,
      recipient: {
        select: {
          name: true,
          email: true,
        },
      },
      inventoryItem: {
        select: {
          name: true,
        },
      },
      offer: {
        select: {
          title: true,
        },
      },
    },
  });

  const overdueLeads = refreshedLeads.filter((lead) => isOverdueLead(lead, now));

  let escalationQueued = false;
  let escalationSkippedReason: string | null = null;
  let processSummary:
    | { processed: number; sent: number; retried: number; failed: number }
    | null = null;

  const accessToken =
    typeof auth.token.wsApiAccessToken === "string"
      ? auth.token.wsApiAccessToken.trim()
      : "";

  if (profile.autoEscalateEnabled && overdueLeads.length > 0) {
    if (!profile.escalationEmail) {
      escalationSkippedReason = "Escalation email not configured.";
    } else if (!accessToken) {
      escalationSkippedReason = "ws-api notification access token unavailable.";
    } else if (
      profile.lastEscalationAt &&
      now.getTime() - profile.lastEscalationAt.getTime() <
        profile.escalationCooldownHours * 60 * 60 * 1000
    ) {
      escalationSkippedReason = `Escalation cooldown active (${profile.escalationCooldownHours}h).`;
    } else {
      const overdueLeadLines = overdueLeads
        .slice(0, 12)
        .map((lead) => {
          const customer =
            lead.recipient?.name || lead.recipient?.email || "Unknown customer";
          const item = lead.offer?.title || lead.inventoryItem?.name || "Delivery request";
          const due =
            lead.fulfillBy && Number.isFinite(new Date(lead.fulfillBy).getTime())
              ? new Date(lead.fulfillBy).toLocaleString()
              : "No due target";
          return `- ${customer} · ${item} · ${due} · ${lead.deliveryAddress || "No address"}`;
        })
        .join("\n");

      const summary = summarizeFulfillmentLeads(refreshedLeads, {
        autoAssignEnabled: profile.autoAssignEnabled,
        defaultAssigneeUserId: profile.defaultAssigneeUserId,
      });

      const message = applyTemplate(
        profile.escalationTemplate?.trim() || DEFAULT_ESCALATION_TEMPLATE,
        {
          businessName: business.name,
          openLeadCount: summary.openLeadCount,
          unassignedLeadCount: summary.unassignedLeadCount,
          overdueLeadCount: summary.overdueLeadCount,
          autoAssignedCount: autoAssignedLeadIds.length,
          overdueLeadLines: overdueLeadLines || "- No overdue leads",
        },
      );

      await wsApiJson({
        path: "/notifications/jobs",
        method: "POST",
        accessToken,
        body: {
          businessId,
          channel: "email",
          audience: profile.escalationEmail,
          subject: `Fulfillment escalation: ${business.name} (${overdueLeads.length} overdue)`,
          message,
          maxAttempts: 3,
          metadata: {
            source: "ws-app-fulfillment-automation",
            automation: "overdue_escalation",
            businessId,
            leadIds: overdueLeads.map((lead) => lead.id),
            overdueLeadCount: overdueLeads.length,
            autoAssignedCount: autoAssignedLeadIds.length,
            generatedAt: now.toISOString(),
          },
        },
      });

      processSummary = await wsApiJson<{
        processed: number;
        sent: number;
        retried: number;
        failed: number;
      }>({
        path: "/notifications/jobs/process",
        method: "POST",
        accessToken,
        body: {
          limit: 25,
        },
      });

      escalationQueued = true;
    }
  }

  const lastRunSummary = {
    executedAt: now.toISOString(),
    autoAssignedCount: autoAssignedLeadIds.length,
    overdueLeadCount: overdueLeads.length,
    escalationQueued,
    escalationSkippedReason,
  };

  await prisma.fulfillmentAutomationProfile.update({
    where: {
      businessId,
    },
    data: {
      lastRunAt: now,
      lastEscalationAt: escalationQueued ? now : profile.lastEscalationAt,
      lastRunSummary,
    },
  });

  return NextResponse.json({
    ok: true,
    generatedAt: now.toISOString(),
    businessId,
    autoAssignedLeadIds,
    overdueLeadIds: overdueLeads.map((lead) => lead.id),
    escalationQueued,
    escalationSkippedReason,
    processSummary,
    summary: summarizeFulfillmentLeads(refreshedLeads, {
      autoAssignEnabled: profile.autoAssignEnabled,
      defaultAssigneeUserId: profile.defaultAssigneeUserId,
    }),
    lastRunSummary,
  });
}
