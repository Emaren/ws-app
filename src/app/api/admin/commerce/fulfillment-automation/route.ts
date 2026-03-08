import { type Role } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import {
  applyTemplate,
  buildOperatorPerformance,
  createEmptyFulfillmentAutomationSummary,
  DEFAULT_CUSTOMER_CONTACT_TEMPLATE,
  DEFAULT_DELAY_UPDATE_TEMPLATE,
  DEFAULT_DIGEST_TEMPLATE,
  DEFAULT_ESCALATION_TEMPLATE,
  formatCadenceLabel,
  nextCadenceAt,
  renderOperatorBoard,
  summarizeFulfillmentLeads,
} from "@/lib/fulfillmentAutomation";
import { prisma } from "@/lib/prisma";
import {
  businessScopeWhere,
  normalizeOptionalString,
  parseBoolean,
  parseOptionalInt,
  requireCommerceManagerAuth,
} from "../_shared";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STAFF_ROLES = ["OWNER", "ADMIN", "EDITOR"] satisfies Role[];

function normalizeEmail(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const next = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) {
    throw new Error("Email must be valid");
  }
  return next;
}

function boundedInt(value: unknown, field: string, fallback: number, min: number, max: number) {
  const parsed = parseOptionalInt(value, field);
  const resolved = parsed ?? fallback;
  if (resolved < min || resolved > max) {
    throw new Error(`${field} must be between ${min} and ${max}`);
  }
  return resolved;
}

function boundedTemplate(value: unknown, fallback: string): string {
  const normalized = normalizeOptionalString(value);
  return (normalized ?? fallback).slice(0, 4000);
}

function presentConfig(input: {
  businessId: string;
  defaultAssigneeUserId?: string | null;
  defaultAssigneeName?: string | null;
  autoAssignEnabled?: boolean;
  autoEscalateEnabled?: boolean;
  scheduleEnabled?: boolean;
  scheduleIntervalHours?: number;
  slaHours?: number;
  digestEnabled?: boolean;
  digestCadenceHours?: number;
  escalationCooldownHours?: number;
  escalationEmail?: string | null;
  digestEmail?: string | null;
  customerContactTemplate?: string | null;
  delayUpdateTemplate?: string | null;
  escalationTemplate?: string | null;
  digestTemplate?: string | null;
  lastRunAt?: Date | string | null;
  lastEscalationAt?: Date | string | null;
  lastDigestAt?: Date | string | null;
  lastRunSummary?: unknown;
}) {
  return {
    businessId: input.businessId,
    defaultAssigneeUserId: input.defaultAssigneeUserId ?? null,
    defaultAssigneeName: input.defaultAssigneeName ?? null,
    autoAssignEnabled: Boolean(input.autoAssignEnabled),
    autoEscalateEnabled: Boolean(input.autoEscalateEnabled),
    scheduleEnabled: Boolean(input.scheduleEnabled),
    scheduleIntervalHours: input.scheduleIntervalHours ?? 6,
    slaHours: input.slaHours ?? 24,
    digestEnabled: Boolean(input.digestEnabled),
    digestCadenceHours: input.digestCadenceHours ?? 24,
    escalationCooldownHours: input.escalationCooldownHours ?? 6,
    escalationEmail: input.escalationEmail ?? null,
    digestEmail: input.digestEmail ?? null,
    customerContactTemplate:
      input.customerContactTemplate?.trim() || DEFAULT_CUSTOMER_CONTACT_TEMPLATE,
    delayUpdateTemplate: input.delayUpdateTemplate?.trim() || DEFAULT_DELAY_UPDATE_TEMPLATE,
    escalationTemplate: input.escalationTemplate?.trim() || DEFAULT_ESCALATION_TEMPLATE,
    digestTemplate: input.digestTemplate?.trim() || DEFAULT_DIGEST_TEMPLATE,
    lastRunAt:
      input.lastRunAt instanceof Date ? input.lastRunAt.toISOString() : input.lastRunAt ?? null,
    lastEscalationAt:
      input.lastEscalationAt instanceof Date
        ? input.lastEscalationAt.toISOString()
        : input.lastEscalationAt ?? null,
    lastDigestAt:
      input.lastDigestAt instanceof Date
        ? input.lastDigestAt.toISOString()
        : input.lastDigestAt ?? null,
    lastRunSummary: input.lastRunSummary ?? null,
  };
}

function emptyPerformance() {
  return {
    runs30d: 0,
    manualRuns30d: 0,
    scheduledRuns30d: 0,
    successRate30d: 0,
    escalationsQueued30d: 0,
    digestsQueued30d: 0,
    avgOverdueLeadCount30d: 0,
    avgAutoAssignedCount30d: 0,
    fulfilledLeadCount30d: 0,
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireCommerceManagerAuth(req);
  if (auth instanceof NextResponse) {
    return auth;
  }

  const scopeWhere = businessScopeWhere(auth);
  const requestedBusinessId = req.nextUrl.searchParams.get("businessId")?.trim() ?? "";
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [businesses, operators] = await Promise.all([
    prisma.business.findMany({
      where: scopeWhere,
      orderBy: [{ isVerified: "desc" }, { name: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
      },
    }),
    prisma.user.findMany({
      where: {
        role: {
          in: STAFF_ROLES,
        },
      },
      orderBy: [{ name: "asc" }, { email: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    }),
  ]);

  const selectedBusinessId = requestedBusinessId || businesses[0]?.id || null;
  if (requestedBusinessId && !businesses.some((business) => business.id === requestedBusinessId)) {
    return NextResponse.json({ message: "Business not found in your commerce scope" }, { status: 404 });
  }

  const businessIds = businesses.map((business) => business.id);

  const [profiles, allScopedLeads, recentRuns, recentAlerts] = businessIds.length
    ? await Promise.all([
        prisma.fulfillmentAutomationProfile.findMany({
          where: {
            businessId: {
              in: businessIds,
            },
          },
          select: {
            businessId: true,
            defaultAssigneeUserId: true,
            defaultAssigneeName: true,
            autoAssignEnabled: true,
            autoEscalateEnabled: true,
            scheduleEnabled: true,
            scheduleIntervalHours: true,
            slaHours: true,
            digestEnabled: true,
            digestCadenceHours: true,
            escalationCooldownHours: true,
            escalationEmail: true,
            digestEmail: true,
            customerContactTemplate: true,
            delayUpdateTemplate: true,
            escalationTemplate: true,
            digestTemplate: true,
            lastRunAt: true,
            lastEscalationAt: true,
            lastDigestAt: true,
            lastRunSummary: true,
          },
        }),
        prisma.deliveryLead.findMany({
          where: {
            businessId: {
              in: businessIds,
            },
          },
          select: {
            businessId: true,
            status: true,
            assignedToUserId: true,
            assignedToName: true,
            fulfillBy: true,
            fulfilledAt: true,
            requestedAt: true,
          },
        }),
        prisma.fulfillmentAutomationRun.findMany({
          where: {
            businessId: selectedBusinessId ?? "__none__",
          },
          orderBy: [{ startedAt: "desc" }],
          take: 8,
          select: {
            id: true,
            source: true,
            status: true,
            actorEmail: true,
            autoAssignedCount: true,
            overdueLeadCount: true,
            openLeadCount: true,
            unassignedLeadCount: true,
            escalationQueued: true,
            digestQueued: true,
            escalationSkippedReason: true,
            digestSkippedReason: true,
            startedAt: true,
            completedAt: true,
          },
        }),
        prisma.fulfillmentAutomationAlert.findMany({
          where: {
            businessId: selectedBusinessId ?? "__none__",
          },
          orderBy: [{ createdAt: "desc" }],
          take: 10,
          select: {
            id: true,
            type: true,
            status: true,
            recipientEmail: true,
            subject: true,
            leadCount: true,
            reason: true,
            createdAt: true,
          },
        }),
      ])
    : [[], [], [], []];

  const profileByBusinessId = new Map(profiles.map((profile) => [profile.businessId, profile]));
  const leadsByBusinessId = new Map<string, typeof allScopedLeads>();
  for (const lead of allScopedLeads) {
    const bucket = leadsByBusinessId.get(lead.businessId) ?? [];
    bucket.push(lead);
    leadsByBusinessId.set(lead.businessId, bucket);
  }

  const config = selectedBusinessId
    ? presentConfig({
        businessId: selectedBusinessId,
        ...(profileByBusinessId.get(selectedBusinessId) ?? {}),
      })
    : null;

  const selectedLeads = selectedBusinessId ? leadsByBusinessId.get(selectedBusinessId) ?? [] : [];
  const summary =
    config && selectedBusinessId
      ? summarizeFulfillmentLeads(
          selectedLeads.map((lead) => ({
            status: lead.status,
            assignedToUserId: lead.assignedToUserId,
            fulfillBy: lead.fulfillBy,
          })),
          {
            autoAssignEnabled: config.autoAssignEnabled,
            defaultAssigneeUserId: config.defaultAssigneeUserId,
          },
          now,
        )
      : createEmptyFulfillmentAutomationSummary();

  const operatorPerformance = buildOperatorPerformance(selectedLeads, now);
  const recentLeads30d = selectedLeads.filter(
    (lead) =>
      lead.requestedAt.getTime() >= thirtyDaysAgo.getTime() ||
      Boolean(lead.fulfilledAt && lead.fulfilledAt.getTime() >= thirtyDaysAgo.getTime()),
  );
  const recentRuns30d = recentRuns.filter((run) => run.startedAt.getTime() >= thirtyDaysAgo.getTime());
  const successfulRuns30d = recentRuns30d.filter((run) => run.status === "SUCCESS").length;
  const performance = recentRuns30d.length
    ? {
        runs30d: recentRuns30d.length,
        manualRuns30d: recentRuns30d.filter((run) => run.source === "MANUAL").length,
        scheduledRuns30d: recentRuns30d.filter((run) => run.source === "SCHEDULED").length,
        successRate30d: Math.round((successfulRuns30d / recentRuns30d.length) * 100),
        escalationsQueued30d: recentRuns30d.filter((run) => run.escalationQueued).length,
        digestsQueued30d: recentRuns30d.filter((run) => run.digestQueued).length,
        avgOverdueLeadCount30d:
          Math.round(
            recentRuns30d.reduce((sum, run) => sum + run.overdueLeadCount, 0) /
              recentRuns30d.length,
          ) || 0,
        avgAutoAssignedCount30d:
          Math.round(
            recentRuns30d.reduce((sum, run) => sum + run.autoAssignedCount, 0) /
              recentRuns30d.length,
          ) || 0,
        fulfilledLeadCount30d: recentLeads30d.filter((lead) => lead.status === "FULFILLED").length,
      }
    : emptyPerformance();

  const schedulerOverview = businesses.map((business) => {
    const profile = profileByBusinessId.get(business.id);
    const leadSummary = summarizeFulfillmentLeads(
      (leadsByBusinessId.get(business.id) ?? []).map((lead) => ({
        status: lead.status,
        assignedToUserId: lead.assignedToUserId,
        fulfillBy: lead.fulfillBy,
      })),
      {
        autoAssignEnabled: Boolean(profile?.autoAssignEnabled),
        defaultAssigneeUserId: profile?.defaultAssigneeUserId,
      },
      now,
    );

    const nextRunAt = profile?.scheduleEnabled
      ? nextCadenceAt(profile.lastRunAt, profile.scheduleIntervalHours, now).toISOString()
      : null;
    const nextDigestAt = profile?.digestEnabled
      ? nextCadenceAt(profile.lastDigestAt, profile.digestCadenceHours, now).toISOString()
      : null;

    return {
      businessId: business.id,
      businessName: business.name,
      scheduleEnabled: Boolean(profile?.scheduleEnabled),
      scheduleIntervalHours: profile?.scheduleIntervalHours ?? 6,
      autoAssignEnabled: Boolean(profile?.autoAssignEnabled),
      autoEscalateEnabled: Boolean(profile?.autoEscalateEnabled),
      digestEnabled: Boolean(profile?.digestEnabled),
      lastRunAt: profile?.lastRunAt?.toISOString() ?? null,
      lastDigestAt: profile?.lastDigestAt?.toISOString() ?? null,
      nextRunAt,
      nextDigestAt,
      nextRunLabel: profile?.scheduleEnabled
        ? formatCadenceLabel(profile.lastRunAt, profile.scheduleIntervalHours, now)
        : "Scheduler off",
      nextDigestLabel: profile?.digestEnabled
        ? formatCadenceLabel(profile.lastDigestAt, profile.digestCadenceHours, now)
        : "Digest off",
      summary: leadSummary,
    };
  });

  const networkSummary = schedulerOverview.reduce(
    (accumulator, row) => {
      if (row.scheduleEnabled) {
        accumulator.scheduledStores += 1;
        if (row.nextRunLabel === "Due now") {
          accumulator.scheduledDueNow += 1;
        }
      }
      if (row.digestEnabled) {
        accumulator.digestStores += 1;
        if (row.nextDigestLabel === "Due now") {
          accumulator.digestDueNow += 1;
        }
      }
      accumulator.openLeadCount += row.summary.openLeadCount;
      accumulator.overdueLeadCount += row.summary.overdueLeadCount;
      return accumulator;
    },
    {
      scheduledStores: 0,
      scheduledDueNow: 0,
      digestStores: 0,
      digestDueNow: 0,
      openLeadCount: 0,
      overdueLeadCount: 0,
    },
  );

  const selectedBusiness = businesses.find((business) => business.id === selectedBusinessId) ?? null;

  return NextResponse.json({
    generatedAt: now.toISOString(),
    selectedBusinessId,
    businesses,
    operators: operators.map((operator) => ({
      id: operator.id,
      name: operator.name,
      email: operator.email,
      role: operator.role,
    })),
    config,
    summary,
    previews: config
      ? {
          customerContact: applyTemplate(config.customerContactTemplate, {
            customerName: "Customer",
            itemLabel: "Featured organic delivery item",
            assigneeName: config.defaultAssigneeName || "Fulfillment team",
            fulfillByLabel: "the current fulfillment target",
            businessName: selectedBusiness?.name || "Wheat & Stone",
          }),
          delayUpdate: applyTemplate(config.delayUpdateTemplate, {
            customerName: "Customer",
            itemLabel: "Featured organic delivery item",
            fulfillByLabel: "the revised fulfillment target",
            businessName: selectedBusiness?.name || "Wheat & Stone",
          }),
          escalation: applyTemplate(config.escalationTemplate, {
            businessName: selectedBusiness?.name || "Wheat & Stone",
            openLeadCount: summary.openLeadCount,
            unassignedLeadCount: summary.unassignedLeadCount,
            overdueLeadCount: summary.overdueLeadCount,
            autoAssignedCount: summary.autoAssignableLeadCount,
            overdueLeadLines:
              summary.overdueLeadCount > 0
                ? "- Overdue lead summary will appear here on run"
                : "- No overdue leads currently",
          }),
          digest: applyTemplate(config.digestTemplate, {
            businessName: selectedBusiness?.name || "Wheat & Stone",
            openLeadCount: summary.openLeadCount,
            unassignedLeadCount: summary.unassignedLeadCount,
            overdueLeadCount: summary.overdueLeadCount,
            fulfilledLeadCount: performance.fulfilledLeadCount30d,
            operatorBoard: renderOperatorBoard(operatorPerformance),
            recentRunDigest:
              recentRuns.length > 0
                ? recentRuns
                    .slice(0, 3)
                    .map(
                      (run) =>
                        `- ${run.startedAt.toLocaleString()} · ${run.source.toLowerCase()} · ${run.overdueLeadCount} overdue`,
                    )
                    .join("\n")
                : "- No recent automation runs yet",
          }),
        }
      : null,
    recentRuns: recentRuns.map((run) => ({
      ...run,
      startedAt: run.startedAt.toISOString(),
      completedAt: run.completedAt?.toISOString() ?? null,
    })),
    recentAlerts: recentAlerts.map((alert) => ({
      ...alert,
      createdAt: alert.createdAt.toISOString(),
    })),
    performance,
    operatorPerformance,
    schedulerOverview,
    networkSummary,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireCommerceManagerAuth(req);
  if (auth instanceof NextResponse) {
    return auth;
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  try {
    const payload = body as Record<string, unknown>;
    const businessId = normalizeOptionalString(payload.businessId);
    if (!businessId) {
      return NextResponse.json({ message: "businessId is required" }, { status: 400 });
    }

    const scopeWhere = businessScopeWhere(auth);
    const business = await prisma.business.findFirst({
      where: {
        id: businessId,
        ...scopeWhere,
      },
      select: {
        id: true,
      },
    });

    if (!business) {
      return NextResponse.json({ message: "Business not found in your commerce scope" }, { status: 404 });
    }

    const defaultAssigneeUserId = normalizeOptionalString(payload.defaultAssigneeUserId);
    let defaultAssigneeName: string | null = null;
    if (defaultAssigneeUserId) {
      const assignee = await prisma.user.findFirst({
        where: {
          id: defaultAssigneeUserId,
          role: {
            in: STAFF_ROLES,
          },
        },
        select: {
          name: true,
        },
      });

      if (!assignee) {
        return NextResponse.json({ message: "Default assignee must be a staff operator" }, { status: 400 });
      }

      defaultAssigneeName = assignee.name;
    }

    const upserted = await prisma.fulfillmentAutomationProfile.upsert({
      where: {
        businessId,
      },
      create: {
        businessId,
        defaultAssigneeUserId,
        defaultAssigneeName,
        autoAssignEnabled: parseBoolean(payload.autoAssignEnabled),
        autoEscalateEnabled: parseBoolean(payload.autoEscalateEnabled),
        scheduleEnabled: parseBoolean(payload.scheduleEnabled),
        scheduleIntervalHours: boundedInt(payload.scheduleIntervalHours, "scheduleIntervalHours", 6, 1, 168),
        slaHours: boundedInt(payload.slaHours, "slaHours", 24, 1, 240),
        digestEnabled: parseBoolean(payload.digestEnabled),
        digestCadenceHours: boundedInt(payload.digestCadenceHours, "digestCadenceHours", 24, 6, 168),
        escalationCooldownHours: boundedInt(
          payload.escalationCooldownHours,
          "escalationCooldownHours",
          6,
          1,
          168,
        ),
        escalationEmail: normalizeEmail(normalizeOptionalString(payload.escalationEmail)),
        digestEmail: normalizeEmail(normalizeOptionalString(payload.digestEmail)),
        customerContactTemplate: boundedTemplate(
          payload.customerContactTemplate,
          DEFAULT_CUSTOMER_CONTACT_TEMPLATE,
        ),
        delayUpdateTemplate: boundedTemplate(payload.delayUpdateTemplate, DEFAULT_DELAY_UPDATE_TEMPLATE),
        escalationTemplate: boundedTemplate(payload.escalationTemplate, DEFAULT_ESCALATION_TEMPLATE),
        digestTemplate: boundedTemplate(payload.digestTemplate, DEFAULT_DIGEST_TEMPLATE),
      },
      update: {
        defaultAssigneeUserId,
        defaultAssigneeName,
        autoAssignEnabled: parseBoolean(payload.autoAssignEnabled),
        autoEscalateEnabled: parseBoolean(payload.autoEscalateEnabled),
        scheduleEnabled: parseBoolean(payload.scheduleEnabled),
        scheduleIntervalHours: boundedInt(payload.scheduleIntervalHours, "scheduleIntervalHours", 6, 1, 168),
        slaHours: boundedInt(payload.slaHours, "slaHours", 24, 1, 240),
        digestEnabled: parseBoolean(payload.digestEnabled),
        digestCadenceHours: boundedInt(payload.digestCadenceHours, "digestCadenceHours", 24, 6, 168),
        escalationCooldownHours: boundedInt(
          payload.escalationCooldownHours,
          "escalationCooldownHours",
          6,
          1,
          168,
        ),
        escalationEmail: normalizeEmail(normalizeOptionalString(payload.escalationEmail)),
        digestEmail: normalizeEmail(normalizeOptionalString(payload.digestEmail)),
        customerContactTemplate: boundedTemplate(
          payload.customerContactTemplate,
          DEFAULT_CUSTOMER_CONTACT_TEMPLATE,
        ),
        delayUpdateTemplate: boundedTemplate(payload.delayUpdateTemplate, DEFAULT_DELAY_UPDATE_TEMPLATE),
        escalationTemplate: boundedTemplate(payload.escalationTemplate, DEFAULT_ESCALATION_TEMPLATE),
        digestTemplate: boundedTemplate(payload.digestTemplate, DEFAULT_DIGEST_TEMPLATE),
      },
      select: {
        businessId: true,
        defaultAssigneeUserId: true,
        defaultAssigneeName: true,
        autoAssignEnabled: true,
        autoEscalateEnabled: true,
        scheduleEnabled: true,
        scheduleIntervalHours: true,
        slaHours: true,
        digestEnabled: true,
        digestCadenceHours: true,
        escalationCooldownHours: true,
        escalationEmail: true,
        digestEmail: true,
        customerContactTemplate: true,
        delayUpdateTemplate: true,
        escalationTemplate: true,
        digestTemplate: true,
        lastRunAt: true,
        lastEscalationAt: true,
        lastDigestAt: true,
        lastRunSummary: true,
      },
    });

    return NextResponse.json({
      ok: true,
      config: presentConfig(upserted),
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unexpected error" },
      { status: 400 },
    );
  }
}
