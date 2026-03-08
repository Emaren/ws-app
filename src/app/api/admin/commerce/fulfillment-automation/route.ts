import { type Role } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  applyTemplate,
  DEFAULT_CUSTOMER_CONTACT_TEMPLATE,
  DEFAULT_DELAY_UPDATE_TEMPLATE,
  DEFAULT_ESCALATION_TEMPLATE,
  summarizeFulfillmentLeads,
} from "@/lib/fulfillmentAutomation";
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
    throw new Error("Escalation email must be valid");
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
  slaHours?: number;
  escalationCooldownHours?: number;
  escalationEmail?: string | null;
  customerContactTemplate?: string | null;
  delayUpdateTemplate?: string | null;
  escalationTemplate?: string | null;
  lastRunAt?: Date | string | null;
  lastEscalationAt?: Date | string | null;
  lastRunSummary?: unknown;
}) {
  return {
    businessId: input.businessId,
    defaultAssigneeUserId: input.defaultAssigneeUserId ?? null,
    defaultAssigneeName: input.defaultAssigneeName ?? null,
    autoAssignEnabled: Boolean(input.autoAssignEnabled),
    autoEscalateEnabled: Boolean(input.autoEscalateEnabled),
    slaHours: input.slaHours ?? 24,
    escalationCooldownHours: input.escalationCooldownHours ?? 6,
    escalationEmail: input.escalationEmail ?? null,
    customerContactTemplate:
      input.customerContactTemplate?.trim() || DEFAULT_CUSTOMER_CONTACT_TEMPLATE,
    delayUpdateTemplate:
      input.delayUpdateTemplate?.trim() || DEFAULT_DELAY_UPDATE_TEMPLATE,
    escalationTemplate:
      input.escalationTemplate?.trim() || DEFAULT_ESCALATION_TEMPLATE,
    lastRunAt:
      input.lastRunAt instanceof Date
        ? input.lastRunAt.toISOString()
        : input.lastRunAt ?? null,
    lastEscalationAt:
      input.lastEscalationAt instanceof Date
        ? input.lastEscalationAt.toISOString()
        : input.lastEscalationAt ?? null,
    lastRunSummary: input.lastRunSummary ?? null,
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireCommerceManagerAuth(req);
  if (auth instanceof NextResponse) {
    return auth;
  }

  const scopeWhere = businessScopeWhere(auth);
  const requestedBusinessId = req.nextUrl.searchParams.get("businessId")?.trim() ?? "";

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

  const [profile, leads] = selectedBusinessId
    ? await Promise.all([
        prisma.fulfillmentAutomationProfile.findUnique({
          where: {
            businessId: selectedBusinessId,
          },
          select: {
            businessId: true,
            defaultAssigneeUserId: true,
            defaultAssigneeName: true,
            autoAssignEnabled: true,
            autoEscalateEnabled: true,
            slaHours: true,
            escalationCooldownHours: true,
            escalationEmail: true,
            customerContactTemplate: true,
            delayUpdateTemplate: true,
            escalationTemplate: true,
            lastRunAt: true,
            lastEscalationAt: true,
            lastRunSummary: true,
          },
        }),
        prisma.deliveryLead.findMany({
          where: {
            businessId: selectedBusinessId,
          },
          select: {
            status: true,
            assignedToUserId: true,
            fulfillBy: true,
          },
        }),
      ])
    : [null, []];

  const config = selectedBusinessId
    ? presentConfig({
        businessId: selectedBusinessId,
        ...(profile ?? {}),
      })
    : null;

  const summary =
    config && selectedBusinessId
      ? summarizeFulfillmentLeads(leads, {
          autoAssignEnabled: config.autoAssignEnabled,
          defaultAssigneeUserId: config.defaultAssigneeUserId,
        })
      : {
          openLeadCount: 0,
          unassignedLeadCount: 0,
          overdueLeadCount: 0,
          autoAssignableLeadCount: 0,
          escalationCandidateCount: 0,
        };

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
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
            businessName:
              businesses.find((business) => business.id === selectedBusinessId)?.name ||
              "Wheat & Stone",
          }),
          delayUpdate: applyTemplate(config.delayUpdateTemplate, {
            customerName: "Customer",
            itemLabel: "Featured organic delivery item",
            fulfillByLabel: "the revised fulfillment target",
            businessName:
              businesses.find((business) => business.id === selectedBusinessId)?.name ||
              "Wheat & Stone",
          }),
          escalation: applyTemplate(config.escalationTemplate, {
            businessName:
              businesses.find((business) => business.id === selectedBusinessId)?.name ||
              "Wheat & Stone",
            openLeadCount: summary.openLeadCount,
            unassignedLeadCount: summary.unassignedLeadCount,
            overdueLeadCount: summary.overdueLeadCount,
            autoAssignedCount: summary.autoAssignableLeadCount,
            overdueLeadLines:
              summary.overdueLeadCount > 0
                ? "- Overdue lead summary will appear here on run"
                : "- No overdue leads currently",
          }),
        }
      : null,
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
          id: true,
          name: true,
          email: true,
        },
      });

      if (!assignee) {
        return NextResponse.json({ message: "Default assignee not found" }, { status: 400 });
      }

      defaultAssigneeName = assignee.name?.trim() || assignee.email;
    }

    const data = {
      defaultAssigneeUserId: defaultAssigneeUserId ?? null,
      defaultAssigneeName,
      autoAssignEnabled: parseBoolean(payload.autoAssignEnabled),
      autoEscalateEnabled: parseBoolean(payload.autoEscalateEnabled),
      slaHours: boundedInt(payload.slaHours, "slaHours", 24, 1, 168),
      escalationCooldownHours: boundedInt(
        payload.escalationCooldownHours,
        "escalationCooldownHours",
        6,
        1,
        168,
      ),
      escalationEmail: normalizeEmail(normalizeOptionalString(payload.escalationEmail)),
      customerContactTemplate: boundedTemplate(
        payload.customerContactTemplate,
        DEFAULT_CUSTOMER_CONTACT_TEMPLATE,
      ),
      delayUpdateTemplate: boundedTemplate(
        payload.delayUpdateTemplate,
        DEFAULT_DELAY_UPDATE_TEMPLATE,
      ),
      escalationTemplate: boundedTemplate(
        payload.escalationTemplate,
        DEFAULT_ESCALATION_TEMPLATE,
      ),
    };

    const saved = await prisma.fulfillmentAutomationProfile.upsert({
      where: {
        businessId,
      },
      update: data,
      create: {
        businessId,
        ...data,
      },
      select: {
        businessId: true,
        defaultAssigneeUserId: true,
        defaultAssigneeName: true,
        autoAssignEnabled: true,
        autoEscalateEnabled: true,
        slaHours: true,
        escalationCooldownHours: true,
        escalationEmail: true,
        customerContactTemplate: true,
        delayUpdateTemplate: true,
        escalationTemplate: true,
        lastRunAt: true,
        lastEscalationAt: true,
        lastRunSummary: true,
      },
    });

    const leads = await prisma.deliveryLead.findMany({
      where: {
        businessId,
      },
      select: {
        status: true,
        assignedToUserId: true,
        fulfillBy: true,
      },
    });

    return NextResponse.json({
      ok: true,
      config: presentConfig(saved),
      summary: summarizeFulfillmentLeads(leads, {
        autoAssignEnabled: saved.autoAssignEnabled,
        defaultAssigneeUserId: saved.defaultAssigneeUserId,
      }),
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unexpected error" },
      { status: 400 },
    );
  }
}
