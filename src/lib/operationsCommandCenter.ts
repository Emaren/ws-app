import type { NotificationAuditLogInput } from "@/lib/notificationCommandCenter";

export type OperationsFeedStatus = "good" | "info" | "warn";
export type OperationsFeedCategory =
  | "automation"
  | "notification"
  | "identity"
  | "support"
  | "public-surface"
  | "auth";

export type OperationsFeedEvent = {
  id: string;
  category: OperationsFeedCategory;
  source: string;
  status: OperationsFeedStatus;
  title: string;
  summary: string;
  detail: string | null;
  actor: string | null;
  occurredAt: string;
};

export type OperationsFulfillmentRunInput = {
  id: string;
  source: string;
  status: string;
  autoAssignedCount: number;
  overdueLeadCount: number;
  openLeadCount: number;
  unassignedLeadCount: number;
  digestQueued: boolean;
  escalationQueued: boolean;
  actorEmail: string | null;
  startedAt: string;
  completedAt: string | null;
  business: {
    id: string;
    name: string;
  };
};

export type OperationsSavedMatchAssignmentInput = {
  id: string;
  userEmail: string;
  status: string;
  assignedAt: string;
  offer: {
    id: string;
    title: string;
  };
  business: {
    id: string;
    name: string;
  };
};

export type OperationsIdentityRunInput = {
  id: string;
  mode: string;
  wsApiAvailable: boolean;
  scannedCount: number;
  roleMismatchBefore: number;
  roleMismatchAfter: number;
  localOnlyCount: number;
  wsApiOnlyCount: number;
  wsApiRoleUpdated: number;
  localUsersCreated: number;
  createdAt: string;
};

export type OperationsPublicProbeInput = {
  id: string;
  origin: string;
  homeStatus: number | null;
  hasOgImage: boolean;
  hasTwitterCard: boolean;
  hasSummaryLargeImage: boolean;
  createdAt: string;
};

export type OperationsAccountRescueRunInput = {
  id: string;
  targetEmail: string;
  wsApiAvailable: boolean;
  localPasswordUpdated: boolean;
  wsApiPasswordUpdated: boolean;
  resetDispatchDelivered: boolean;
  resetDispatchProvider: string;
  resetDispatchReason: string | null;
  actorEmail: string | null;
  createdAt: string;
};

export type OperationsPasswordResetDispatchInput = {
  id: string;
  email: string;
  source: string;
  provider: string;
  delivered: boolean;
  reason: string | null;
  requestedByEmail: string | null;
  createdAt: string;
};

function parseTimestamp(value: string | null | undefined): number {
  if (!value) {
    return 0;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function normalizeStatus(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function notificationEventStatus(
  event: NotificationAuditLogInput["event"],
): OperationsFeedStatus {
  if (event === "attempt_succeeded") {
    return "good";
  }

  if (
    event === "attempt_failed" ||
    event === "failed_final" ||
    event === "retry_scheduled"
  ) {
    return "warn";
  }

  return "info";
}

function notificationEventTitle(event: NotificationAuditLogInput["event"]): string {
  switch (event) {
    case "queued":
      return "Notification queued";
    case "attempt_started":
      return "Notification attempt started";
    case "attempt_succeeded":
      return "Notification delivered";
    case "attempt_failed":
      return "Notification attempt failed";
    case "retry_scheduled":
      return "Notification retry scheduled";
    case "failed_final":
      return "Notification permanently failed";
    case "retry_requested":
      return "Notification retry requested";
    case "fallback_queued":
      return "Notification fallback queued";
    default:
      return "Notification event";
  }
}

function dedupeNotes(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))];
}

export function buildOperationsCommandCenterSnapshot(input: {
  generatedAt: string;
  fulfillmentRuns: OperationsFulfillmentRunInput[];
  savedMatchAssignments: OperationsSavedMatchAssignmentInput[];
  notificationAuditLogs: NotificationAuditLogInput[];
  identityRuns: OperationsIdentityRunInput[];
  publicProbes: OperationsPublicProbeInput[];
  accountRescues: OperationsAccountRescueRunInput[];
  passwordResetDispatches: OperationsPasswordResetDispatchInput[];
  notes?: Array<string | null | undefined>;
}) {
  const events: OperationsFeedEvent[] = [];

  for (const run of input.fulfillmentRuns) {
    const status =
      normalizeStatus(run.status) !== "success" ||
      run.overdueLeadCount > 0 ||
      run.unassignedLeadCount > 0
        ? "warn"
        : "good";

    events.push({
      id: `fulfillment:${run.id}`,
      category: "automation",
      source: "fulfillment-run",
      status,
      title: `${run.business.name} fulfillment run`,
      summary: `${run.openLeadCount} open leads, ${run.autoAssignedCount} auto-assigned, ${run.overdueLeadCount} overdue.`,
      detail: `Source ${run.source} · unassigned ${run.unassignedLeadCount} · digest ${run.digestQueued ? "queued" : "idle"} · escalation ${run.escalationQueued ? "queued" : "idle"}.`,
      actor: run.actorEmail,
      occurredAt: run.startedAt,
    });
  }

  for (const assignment of input.savedMatchAssignments) {
    events.push({
      id: `saved-match:${assignment.id}`,
      category: "automation",
      source: "saved-match",
      status: normalizeStatus(assignment.status) === "active" ? "good" : "info",
      title: `${assignment.offer.title} matched to ${assignment.userEmail}`,
      summary: `${assignment.business.name} saved-match assignment is ${assignment.status.toLowerCase()}.`,
      detail: null,
      actor: null,
      occurredAt: assignment.assignedAt,
    });
  }

  for (const audit of input.notificationAuditLogs) {
    events.push({
      id: `notification-audit:${audit.id}`,
      category: "notification",
      source: "notification-audit",
      status: notificationEventStatus(audit.event),
      title: notificationEventTitle(audit.event),
      summary: `${audit.channel} via ${audit.provider ?? "provider pending"} · ${audit.message}`,
      detail: audit.attempt ? `Attempt ${audit.attempt}` : null,
      actor: audit.provider,
      occurredAt: audit.createdAt,
    });
  }

  for (const run of input.identityRuns) {
    const clean =
      run.roleMismatchAfter === 0 && run.localOnlyCount === 0 && run.wsApiOnlyCount === 0;

    events.push({
      id: `identity:${run.id}`,
      category: "identity",
      source: "identity-auto-heal",
      status: clean ? "good" : "warn",
      title: "Identity auto-heal run",
      summary: `Scanned ${run.scannedCount} users with ${run.roleMismatchAfter} mismatches remaining.`,
      detail: `Mode ${run.mode} · local-only ${run.localOnlyCount} · ws-api-only ${run.wsApiOnlyCount} · roles updated ${run.wsApiRoleUpdated}.`,
      actor: null,
      occurredAt: run.createdAt,
    });
  }

  for (const probe of input.publicProbes) {
    const healthy =
      typeof probe.homeStatus === "number" &&
      probe.homeStatus < 400 &&
      probe.hasOgImage &&
      probe.hasTwitterCard &&
      probe.hasSummaryLargeImage;

    events.push({
      id: `probe:${probe.id}`,
      category: "public-surface",
      source: "public-probe",
      status: healthy ? "good" : "warn",
      title: "Public surface probe",
      summary: `Home ${probe.homeStatus ?? "n/a"} · og:image ${probe.hasOgImage ? "yes" : "no"} · twitter card ${probe.hasTwitterCard ? "yes" : "no"}.`,
      detail: `Origin ${probe.origin} · summary_large_image ${probe.hasSummaryLargeImage ? "yes" : "no"}.`,
      actor: null,
      occurredAt: probe.createdAt,
    });
  }

  for (const rescue of input.accountRescues) {
    const recovered =
      rescue.localPasswordUpdated ||
      rescue.wsApiPasswordUpdated ||
      rescue.resetDispatchDelivered;

    events.push({
      id: `account-rescue:${rescue.id}`,
      category: "support",
      source: "account-rescue",
      status: recovered ? "good" : "warn",
      title: `Account rescue for ${rescue.targetEmail}`,
      summary: `Local password ${rescue.localPasswordUpdated ? "updated" : "unchanged"} · ws-api password ${rescue.wsApiPasswordUpdated ? "updated" : "unchanged"} · reset mail ${rescue.resetDispatchDelivered ? "delivered" : "missed"}.`,
      detail: `Provider ${rescue.resetDispatchProvider}${rescue.resetDispatchReason ? ` · ${rescue.resetDispatchReason}` : ""}.`,
      actor: rescue.actorEmail,
      occurredAt: rescue.createdAt,
    });
  }

  for (const dispatch of input.passwordResetDispatches) {
    events.push({
      id: `password-reset:${dispatch.id}`,
      category: "auth",
      source: "password-reset-dispatch",
      status: dispatch.delivered ? "good" : "warn",
      title: dispatch.delivered
        ? `Password reset sent to ${dispatch.email}`
        : `Password reset failed for ${dispatch.email}`,
      summary: `${dispatch.provider} via ${dispatch.source}.`,
      detail: dispatch.reason ?? null,
      actor: dispatch.requestedByEmail,
      occurredAt: dispatch.createdAt,
    });
  }

  const sortedEvents = events
    .slice()
    .sort((left, right) => parseTimestamp(right.occurredAt) - parseTimestamp(left.occurredAt));

  const attentionEvents = sortedEvents.filter((event) => event.status === "warn").slice(0, 8);
  const notes = dedupeNotes(input.notes ?? []);

  return {
    generatedAt: input.generatedAt,
    notes,
    summary: {
      totalSignals: events.length,
      attentionSignals: events.filter((event) => event.status === "warn").length,
      goodSignals: events.filter((event) => event.status === "good").length,
      infoSignals: events.filter((event) => event.status === "info").length,
      automationSignals:
        input.fulfillmentRuns.length + input.savedMatchAssignments.length,
      notificationSignals: input.notificationAuditLogs.length,
      identitySignals: input.identityRuns.length,
      publicSurfaceSignals: input.publicProbes.length,
      supportSignals:
        input.accountRescues.length + input.passwordResetDispatches.length,
    },
    sourceCounts: {
      fulfillmentRuns: input.fulfillmentRuns.length,
      savedMatchAssignments: input.savedMatchAssignments.length,
      notificationAuditEntries: input.notificationAuditLogs.length,
      identityRuns: input.identityRuns.length,
      publicProbes: input.publicProbes.length,
      accountRescues: input.accountRescues.length,
      passwordResetDispatches: input.passwordResetDispatches.length,
    },
    recentEvents: sortedEvents.slice(0, 14),
    attentionEvents,
  };
}
