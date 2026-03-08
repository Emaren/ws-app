import type {
  FulfillmentAutomationAlertStatus,
  FulfillmentAutomationAlertType,
  FulfillmentAutomationRunSource,
  FulfillmentAutomationRunStatus,
  Prisma,
} from "@prisma/client";
import {
  applyTemplate,
  buildOperatorPerformance,
  createEmptyFulfillmentAutomationSummary,
  DEFAULT_DIGEST_TEMPLATE,
  DEFAULT_ESCALATION_TEMPLATE,
  isCadenceDue,
  isOpenLead,
  isOverdueLead,
  renderOperatorBoard,
  summarizeFulfillmentLeads,
} from "@/lib/fulfillmentAutomation";
import { prisma } from "@/lib/prisma";
import { getWsApiBaseUrl } from "@/lib/wsApiBaseUrl";

const REQUEST_TIMEOUT_MS = 10_000;

type WsApiProcessSummary = {
  processed: number;
  sent: number;
  retried: number;
  failed: number;
};

type LeadRecord = {
  id: string;
  status: string;
  assignedToUserId: string | null;
  assignedToName: string | null;
  requestedAt: Date;
  fulfillBy: Date | null;
  notes: string | null;
  deliveryAddress: string | null;
  fulfilledAt: Date | null;
  recipient: {
    name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  inventoryItem: {
    name: string;
  } | null;
  offer: {
    title: string;
  } | null;
};

type QueuedNotification = {
  type: FulfillmentAutomationAlertType;
  recipientEmail: string;
  subject: string;
  message: string;
  leadCount: number;
  metadata: Record<string, unknown>;
};

type AlertDraft = {
  type: FulfillmentAutomationAlertType;
  status: FulfillmentAutomationAlertStatus;
  recipientEmail: string | null;
  subject: string | null;
  leadCount: number;
  reason: string | null;
  metadata: Prisma.InputJsonValue | undefined;
};

type AutomationProfileRecord = {
  id: string;
  businessId: string;
  defaultAssigneeUserId: string | null;
  defaultAssigneeName: string | null;
  autoAssignEnabled: boolean;
  autoEscalateEnabled: boolean;
  scheduleEnabled: boolean;
  scheduleIntervalHours: number;
  slaHours: number;
  digestEnabled: boolean;
  digestCadenceHours: number;
  escalationCooldownHours: number;
  escalationEmail: string | null;
  digestEmail: string | null;
  customerContactTemplate: string | null;
  delayUpdateTemplate: string | null;
  escalationTemplate: string | null;
  digestTemplate: string | null;
  lastRunAt: Date | null;
  lastEscalationAt: Date | null;
  lastDigestAt: Date | null;
};

type AutomationBusinessContext = {
  id: string;
  name: string;
  fulfillmentAutomationProfile: AutomationProfileRecord;
};

export type FulfillmentAutomationRunResult = {
  ok: true;
  runId: string;
  generatedAt: string;
  businessId: string;
  autoAssignedLeadIds: string[];
  dueTargetedLeadIds: string[];
  overdueLeadIds: string[];
  escalationQueued: boolean;
  escalationSkippedReason: string | null;
  digestQueued: boolean;
  digestSkippedReason: string | null;
  processSummary: WsApiProcessSummary | null;
  summary: ReturnType<typeof summarizeFulfillmentLeads>;
  operatorPerformance: ReturnType<typeof buildOperatorPerformance>;
  lastRunSummary: Record<string, unknown>;
};

function appendAutomationNote(existing: string | null, notes: string[], timestamp: string): string {
  const cleaned = notes.map((note) => note.trim()).filter(Boolean);
  if (!cleaned.length) {
    return existing?.trim() || "";
  }

  const entry = `[${timestamp}] ${cleaned.join(" ")}`;
  if (!existing?.trim()) {
    return entry;
  }

  return `${existing.trim()}\n\n${entry}`.slice(0, 2400);
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

function buildLastRunSummary(input: {
  now: Date;
  autoAssignedCount: number;
  dueTargetedCount: number;
  overdueLeadCount: number;
  escalationQueued: boolean;
  escalationSkippedReason: string | null;
  digestQueued: boolean;
  digestSkippedReason: string | null;
  processSummary: WsApiProcessSummary | null;
}) {
  return {
    executedAt: input.now.toISOString(),
    autoAssignedCount: input.autoAssignedCount,
    dueTargetedCount: input.dueTargetedCount,
    overdueLeadCount: input.overdueLeadCount,
    escalationQueued: input.escalationQueued,
    escalationSkippedReason: input.escalationSkippedReason,
    digestQueued: input.digestQueued,
    digestSkippedReason: input.digestSkippedReason,
    processSummary: input.processSummary,
  };
}

async function loadBusinessAutomationContext(
  businessId: string,
): Promise<AutomationBusinessContext> {
  const business = await prisma.business.findUnique({
    where: {
      id: businessId,
    },
    select: {
      id: true,
      name: true,
      fulfillmentAutomationProfile: {
        select: {
          id: true,
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
        },
      },
    },
  });

  if (!business) {
    throw new Error("Business not found in your commerce scope");
  }

  if (!business.fulfillmentAutomationProfile) {
    throw new Error("Create a fulfillment automation profile first");
  }

  return {
    id: business.id,
    name: business.name,
    fulfillmentAutomationProfile: business.fulfillmentAutomationProfile,
  };
}

async function loadBusinessLeads(businessId: string): Promise<LeadRecord[]> {
  return prisma.deliveryLead.findMany({
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
      fulfilledAt: true,
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
}

function overdueLeadLines(leads: LeadRecord[]): string {
  return leads
    .slice(0, 12)
    .map((lead) => {
      const customer = lead.recipient?.name || lead.recipient?.email || "Unknown customer";
      const item = lead.offer?.title || lead.inventoryItem?.name || "Delivery request";
      const due = lead.fulfillBy ? new Date(lead.fulfillBy).toLocaleString() : "No due target";
      return `- ${customer} · ${item} · ${due} · ${lead.deliveryAddress || "No address"}`;
    })
    .join("\n");
}

function recentRunDigest(
  runs: Array<{
    source: FulfillmentAutomationRunSource;
    startedAt: Date;
    overdueLeadCount: number;
    escalationQueued: boolean;
    digestQueued: boolean;
  }>,
): string {
  if (!runs.length) {
    return "- No recent automation runs yet";
  }

  return runs
    .slice(0, 3)
    .map(
      (run) =>
        `- ${run.startedAt.toLocaleString()} · ${run.source.toLowerCase()} · ${run.overdueLeadCount} overdue · escalation ${
          run.escalationQueued ? "queued" : "quiet"
        } · digest ${run.digestQueued ? "queued" : "quiet"}`,
    )
    .join("\n");
}

export async function runFulfillmentAutomation(input: {
  businessId: string;
  source: FulfillmentAutomationRunSource;
  actorUserId?: string | null;
  actorEmail?: string | null;
  wsApiAccessToken?: string | null;
  forceDigest?: boolean;
  now?: Date;
}): Promise<FulfillmentAutomationRunResult> {
  const now = input.now ?? new Date();
  const business = await loadBusinessAutomationContext(input.businessId);
  const profile = business.fulfillmentAutomationProfile;
  const timestamp = now.toISOString();

  const leads = await loadBusinessLeads(input.businessId);
  const updates: Prisma.PrismaPromise<unknown>[] = [];
  const autoAssignedLeadIds: string[] = [];
  const dueTargetedLeadIds: string[] = [];

  for (const lead of leads) {
    if (!isOpenLead(lead.status)) {
      continue;
    }

    const data: Prisma.DeliveryLeadUncheckedUpdateInput = {};
    const notes: string[] = [];
    const dueAt =
      lead.fulfillBy ??
      new Date(lead.requestedAt.getTime() + profile.slaHours * 60 * 60 * 1000);

    if (!lead.fulfillBy) {
      data.fulfillBy = dueAt;
      dueTargetedLeadIds.push(lead.id);
      notes.push("Applied SLA target from fulfillment automation.");
    }

    if (!lead.assignedToUserId && profile.autoAssignEnabled && profile.defaultAssigneeUserId) {
      data.assignedToUserId = profile.defaultAssigneeUserId;
      data.assignedToName = profile.defaultAssigneeName;
      data.assignedAt = now;
      autoAssignedLeadIds.push(lead.id);
      notes.push(
        `Auto-assigned to ${profile.defaultAssigneeName ?? "default operator"} by fulfillment automation.`,
      );
    }

    if (!Object.keys(data).length) {
      continue;
    }

    data.notes = appendAutomationNote(lead.notes, notes, timestamp);
    updates.push(
      prisma.deliveryLead.update({
        where: {
          id: lead.id,
        },
        data,
      }),
    );
  }

  if (updates.length > 0) {
    await prisma.$transaction(updates);
  }

  const refreshedLeads = await loadBusinessLeads(input.businessId);
  const summary = summarizeFulfillmentLeads(refreshedLeads, {
    autoAssignEnabled: profile.autoAssignEnabled,
    defaultAssigneeUserId: profile.defaultAssigneeUserId,
  }, now);

  const overdueLeads = refreshedLeads.filter((lead) => isOverdueLead(lead, now));
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentLeads = refreshedLeads.filter(
    (lead) =>
      lead.requestedAt.getTime() >= thirtyDaysAgo.getTime() ||
      Boolean(lead.fulfilledAt && lead.fulfilledAt.getTime() >= thirtyDaysAgo.getTime()),
  );
  const operatorPerformance = buildOperatorPerformance(recentLeads, now);
  const fulfilledLeadCount = recentLeads.filter((lead) => lead.status === "FULFILLED").length;

  const notificationsToQueue: QueuedNotification[] = [];
  const alertDrafts: AlertDraft[] = [];
  let escalationQueued = false;
  let digestQueued = false;
  let escalationSkippedReason: string | null = null;
  let digestSkippedReason: string | null = null;

  const wsApiAccessToken = input.wsApiAccessToken?.trim() || "";

  if (profile.autoEscalateEnabled && overdueLeads.length > 0) {
    if (!profile.escalationEmail?.trim()) {
      escalationSkippedReason = "Escalation email not configured.";
    } else if (!wsApiAccessToken) {
      escalationSkippedReason = "ws-api notification access token unavailable.";
    } else if (
      profile.lastEscalationAt &&
      now.getTime() - profile.lastEscalationAt.getTime() <
        profile.escalationCooldownHours * 60 * 60 * 1000
    ) {
      escalationSkippedReason = `Escalation cooldown active (${profile.escalationCooldownHours}h).`;
    } else {
      notificationsToQueue.push({
        type: "ESCALATION",
        recipientEmail: profile.escalationEmail.trim(),
        subject: `Fulfillment escalation: ${business.name} (${overdueLeads.length} overdue)`,
        message: applyTemplate(
          profile.escalationTemplate?.trim() || DEFAULT_ESCALATION_TEMPLATE,
          {
            businessName: business.name,
            openLeadCount: summary.openLeadCount,
            unassignedLeadCount: summary.unassignedLeadCount,
            overdueLeadCount: summary.overdueLeadCount,
            autoAssignedCount: autoAssignedLeadIds.length,
            overdueLeadLines: overdueLeadLines(overdueLeads) || "- No overdue leads",
          },
        ),
        leadCount: overdueLeads.length,
        metadata: {
          source: "ws-app-fulfillment-automation",
          automation: "overdue_escalation",
          businessId: input.businessId,
          generatedAt: timestamp,
          leadIds: overdueLeads.map((lead) => lead.id),
        },
      });
    }
  }

  const digestDue =
    profile.digestEnabled &&
    (input.forceDigest || isCadenceDue(profile.lastDigestAt, profile.digestCadenceHours, now));

  if (digestDue) {
    if (!profile.digestEmail?.trim()) {
      digestSkippedReason = "Digest email not configured.";
    } else if (!wsApiAccessToken) {
      digestSkippedReason = "ws-api notification access token unavailable.";
    } else {
      const recentRuns = await prisma.fulfillmentAutomationRun.findMany({
        where: {
          businessId: input.businessId,
        },
        orderBy: [{ startedAt: "desc" }],
        take: 3,
        select: {
          source: true,
          startedAt: true,
          overdueLeadCount: true,
          escalationQueued: true,
          digestQueued: true,
        },
      });

      notificationsToQueue.push({
        type: "DIGEST",
        recipientEmail: profile.digestEmail.trim(),
        subject: `Fulfillment digest: ${business.name}`,
        message: applyTemplate(
          profile.digestTemplate?.trim() || DEFAULT_DIGEST_TEMPLATE,
          {
            businessName: business.name,
            openLeadCount: summary.openLeadCount,
            unassignedLeadCount: summary.unassignedLeadCount,
            overdueLeadCount: summary.overdueLeadCount,
            fulfilledLeadCount,
            operatorBoard: renderOperatorBoard(operatorPerformance),
            recentRunDigest: recentRunDigest(recentRuns),
          },
        ),
        leadCount: summary.openLeadCount,
        metadata: {
          source: "ws-app-fulfillment-automation",
          automation: "operations_digest",
          businessId: input.businessId,
          generatedAt: timestamp,
          openLeadCount: summary.openLeadCount,
          overdueLeadCount: summary.overdueLeadCount,
          fulfilledLeadCount,
        },
      });
    }
  }

  let processSummary: WsApiProcessSummary | null = null;
  const queuedNotifications: Array<Pick<QueuedNotification, "type" | "recipientEmail" | "subject" | "leadCount" | "metadata">> = [];
  let runStatus: FulfillmentAutomationRunStatus = "SUCCESS";

  for (const notification of notificationsToQueue) {
    try {
      await wsApiJson({
        path: "/notifications/jobs",
        method: "POST",
        accessToken: wsApiAccessToken,
        body: {
          businessId: input.businessId,
          channel: "email",
          audience: notification.recipientEmail,
          subject: notification.subject,
          message: notification.message,
          maxAttempts: 3,
          metadata: notification.metadata,
        },
      });

      queuedNotifications.push({
        type: notification.type,
        recipientEmail: notification.recipientEmail,
        subject: notification.subject,
        leadCount: notification.leadCount,
        metadata: notification.metadata,
      });
    } catch (error) {
      runStatus = "FAILED";
      const reason = error instanceof Error ? error.message : String(error);
      alertDrafts.push({
        type: notification.type,
        status: "FAILED",
        recipientEmail: notification.recipientEmail,
        subject: notification.subject,
        leadCount: notification.leadCount,
        reason,
        metadata: notification.metadata as Prisma.InputJsonValue,
      });

      if (notification.type === "ESCALATION") {
        escalationSkippedReason = reason;
      } else {
        digestSkippedReason = reason;
      }
    }
  }

  if (queuedNotifications.length > 0) {
    processSummary = await wsApiJson<WsApiProcessSummary>({
      path: "/notifications/jobs/process",
      method: "POST",
      accessToken: wsApiAccessToken,
      body: {
        limit: 25,
      },
    });
  }

  for (const notification of queuedNotifications) {
    const reason = null;
    alertDrafts.push({
      type: notification.type,
      status: "QUEUED",
      recipientEmail: notification.recipientEmail,
      subject: notification.subject,
      leadCount: notification.leadCount,
      reason,
      metadata: notification.metadata as Prisma.InputJsonValue,
    });

    if (notification.type === "ESCALATION") {
      escalationQueued = true;
      escalationSkippedReason = null;
    } else {
      digestQueued = true;
      digestSkippedReason = null;
    }
  }

  if (!escalationQueued && escalationSkippedReason) {
    alertDrafts.push({
      type: "ESCALATION",
      status: "SKIPPED",
      recipientEmail: profile.escalationEmail ?? null,
      subject: `Fulfillment escalation: ${business.name}`,
      leadCount: overdueLeads.length,
      reason: escalationSkippedReason,
      metadata: {
        businessId: input.businessId,
        generatedAt: timestamp,
        overdueLeadCount: overdueLeads.length,
      },
    });
  }

  if (digestDue && !digestQueued && digestSkippedReason) {
    alertDrafts.push({
      type: "DIGEST",
      status: "SKIPPED",
      recipientEmail: profile.digestEmail ?? null,
      subject: `Fulfillment digest: ${business.name}`,
      leadCount: summary.openLeadCount,
      reason: digestSkippedReason,
      metadata: {
        businessId: input.businessId,
        generatedAt: timestamp,
        openLeadCount: summary.openLeadCount,
        overdueLeadCount: summary.overdueLeadCount,
      },
    });
  }

  const lastRunSummary = buildLastRunSummary({
    now,
    autoAssignedCount: autoAssignedLeadIds.length,
    dueTargetedCount: dueTargetedLeadIds.length,
    overdueLeadCount: overdueLeads.length,
    escalationQueued,
    escalationSkippedReason,
    digestQueued,
    digestSkippedReason,
    processSummary,
  });

  const createdRun = await prisma.fulfillmentAutomationRun.create({
    data: {
      profileId: profile.id,
      businessId: input.businessId,
      source: input.source,
      status: runStatus,
      actorUserId: input.actorUserId ?? null,
      actorEmail: input.actorEmail ?? null,
      autoAssignedCount: autoAssignedLeadIds.length,
      overdueLeadCount: overdueLeads.length,
      openLeadCount: summary.openLeadCount,
      unassignedLeadCount: summary.unassignedLeadCount,
      escalationQueued,
      digestQueued,
      escalationSkippedReason,
      digestSkippedReason,
      processSummary: processSummary as Prisma.InputJsonValue,
      summary: lastRunSummary as Prisma.InputJsonValue,
      metadata: {
        dueTargetedLeadIds,
        overdueLeadIds: overdueLeads.map((lead) => lead.id),
      },
      startedAt: now,
      completedAt: new Date(),
    },
    select: {
      id: true,
    },
  });

  if (alertDrafts.length > 0) {
    await prisma.fulfillmentAutomationAlert.createMany({
      data: alertDrafts.map((alert) => ({
        profileId: profile.id,
        businessId: input.businessId,
        runId: createdRun.id,
        type: alert.type,
        status: alert.status,
        recipientEmail: alert.recipientEmail,
        subject: alert.subject,
        leadCount: alert.leadCount,
        reason: alert.reason,
        metadata: alert.metadata,
      })),
    });
  }

  await prisma.fulfillmentAutomationProfile.update({
    where: {
      businessId: input.businessId,
    },
    data: {
      lastRunAt: now,
      lastEscalationAt: escalationQueued ? now : profile.lastEscalationAt,
      lastDigestAt: digestQueued ? now : profile.lastDigestAt,
      lastRunSummary: lastRunSummary as Prisma.InputJsonValue,
    },
  });

  return {
    ok: true,
    runId: createdRun.id,
    generatedAt: timestamp,
    businessId: input.businessId,
    autoAssignedLeadIds,
    dueTargetedLeadIds,
    overdueLeadIds: overdueLeads.map((lead) => lead.id),
    escalationQueued,
    escalationSkippedReason,
    digestQueued,
    digestSkippedReason,
    processSummary,
    summary,
    operatorPerformance,
    lastRunSummary,
  };
}

export async function listDueFulfillmentAutomationBusinessIds(input: {
  limit?: number;
  now?: Date;
} = {}): Promise<string[]> {
  const now = input.now ?? new Date();
  const limit = Math.max(1, Math.min(input.limit ?? 10, 50));

  const profiles = await prisma.fulfillmentAutomationProfile.findMany({
    where: {
      scheduleEnabled: true,
    },
    orderBy: [{ lastRunAt: "asc" }],
    select: {
      businessId: true,
      lastRunAt: true,
      scheduleIntervalHours: true,
    },
  });

  return profiles
    .filter((profile) => isCadenceDue(profile.lastRunAt, profile.scheduleIntervalHours, now))
    .slice(0, limit)
    .map((profile) => profile.businessId);
}

export function createSkippedAutomationRunResult(input: {
  businessId: string;
  reason: string;
  source: FulfillmentAutomationRunSource;
  now?: Date;
}): FulfillmentAutomationRunResult {
  const now = input.now ?? new Date();
  const summary = createEmptyFulfillmentAutomationSummary();
  const lastRunSummary = {
    executedAt: now.toISOString(),
    skippedReason: input.reason,
    source: input.source,
  };

  return {
    ok: true,
    runId: "",
    generatedAt: now.toISOString(),
    businessId: input.businessId,
    autoAssignedLeadIds: [],
    dueTargetedLeadIds: [],
    overdueLeadIds: [],
    escalationQueued: false,
    escalationSkippedReason: input.reason,
    digestQueued: false,
    digestSkippedReason: input.reason,
    processSummary: null,
    summary,
    operatorPerformance: [],
    lastRunSummary,
  };
}
