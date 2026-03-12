export type BusinessRecord = {
  id: string;
  slug: string;
  name: string;
  status: string;
};

export type OperatorRecord = {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "ADMIN" | "EDITOR";
};

export type AutomationSummary = {
  openLeadCount: number;
  unassignedLeadCount: number;
  overdueLeadCount: number;
  autoAssignableLeadCount: number;
  escalationCandidateCount: number;
};

export type AutomationConfig = {
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
  customerContactTemplate: string;
  delayUpdateTemplate: string;
  escalationTemplate: string;
  digestTemplate: string;
  lastRunAt: string | null;
  lastEscalationAt: string | null;
  lastDigestAt: string | null;
  lastRunSummary: Record<string, unknown> | null;
};

export type AutomationPerformance = {
  runs30d: number;
  manualRuns30d: number;
  scheduledRuns30d: number;
  successRate30d: number;
  escalationsQueued30d: number;
  digestsQueued30d: number;
  avgOverdueLeadCount30d: number;
  avgAutoAssignedCount30d: number;
  fulfilledLeadCount30d: number;
};

export type OperatorPerformanceRecord = {
  operatorKey: string;
  operatorName: string;
  openLeadCount: number;
  overdueLeadCount: number;
  fulfilledLeadCount: number;
};

export type SchedulerOverviewRecord = {
  businessId: string;
  businessName: string;
  scheduleEnabled: boolean;
  scheduleIntervalHours: number;
  autoAssignEnabled: boolean;
  autoEscalateEnabled: boolean;
  digestEnabled: boolean;
  lastRunAt: string | null;
  lastDigestAt: string | null;
  nextRunAt: string | null;
  nextDigestAt: string | null;
  nextRunLabel: string;
  nextDigestLabel: string;
  summary: AutomationSummary;
};

export type RecentRunRecord = {
  id: string;
  source: "MANUAL" | "SCHEDULED";
  status: "SUCCESS" | "SKIPPED" | "FAILED";
  actorEmail: string | null;
  autoAssignedCount: number;
  overdueLeadCount: number;
  openLeadCount: number;
  unassignedLeadCount: number;
  escalationQueued: boolean;
  digestQueued: boolean;
  escalationSkippedReason: string | null;
  digestSkippedReason: string | null;
  startedAt: string;
  completedAt: string | null;
};

export type RecentAlertRecord = {
  id: string;
  type: "ESCALATION" | "DIGEST";
  status: "QUEUED" | "SKIPPED" | "FAILED";
  recipientEmail: string | null;
  subject: string | null;
  leadCount: number;
  reason: string | null;
  createdAt: string;
};

export type AutomationOverviewResponse = {
  generatedAt: string;
  selectedBusinessId: string | null;
  businesses: BusinessRecord[];
  operators: OperatorRecord[];
  config: AutomationConfig | null;
  summary: AutomationSummary;
  previews: {
    customerContact: string;
    delayUpdate: string;
    escalation: string;
    digest: string;
  } | null;
  recentRuns: RecentRunRecord[];
  recentAlerts: RecentAlertRecord[];
  performance: AutomationPerformance;
  operatorPerformance: OperatorPerformanceRecord[];
  schedulerOverview: SchedulerOverviewRecord[];
  networkSummary: {
    scheduledStores: number;
    scheduledDueNow: number;
    digestStores: number;
    digestDueNow: number;
    openLeadCount: number;
    overdueLeadCount: number;
  };
};

export type AutomationDraft = {
  businessId: string;
  defaultAssigneeUserId: string;
  autoAssignEnabled: boolean;
  autoEscalateEnabled: boolean;
  scheduleEnabled: boolean;
  scheduleIntervalHours: string;
  slaHours: string;
  digestEnabled: boolean;
  digestCadenceHours: string;
  escalationCooldownHours: string;
  escalationEmail: string;
  digestEmail: string;
  customerContactTemplate: string;
  delayUpdateTemplate: string;
  escalationTemplate: string;
  digestTemplate: string;
};

export function createDraft(
  config: AutomationConfig | null,
  businessId: string,
): AutomationDraft {
  return {
    businessId,
    defaultAssigneeUserId: config?.defaultAssigneeUserId ?? "",
    autoAssignEnabled: config?.autoAssignEnabled ?? false,
    autoEscalateEnabled: config?.autoEscalateEnabled ?? false,
    scheduleEnabled: config?.scheduleEnabled ?? false,
    scheduleIntervalHours: String(config?.scheduleIntervalHours ?? 6),
    slaHours: String(config?.slaHours ?? 24),
    digestEnabled: config?.digestEnabled ?? false,
    digestCadenceHours: String(config?.digestCadenceHours ?? 24),
    escalationCooldownHours: String(config?.escalationCooldownHours ?? 6),
    escalationEmail: config?.escalationEmail ?? "",
    digestEmail: config?.digestEmail ?? "",
    customerContactTemplate: config?.customerContactTemplate ?? "",
    delayUpdateTemplate: config?.delayUpdateTemplate ?? "",
    escalationTemplate: config?.escalationTemplate ?? "",
    digestTemplate: config?.digestTemplate ?? "",
  };
}

export function localDate(iso: string | null): string {
  if (!iso) return "-";
  const parsed = new Date(iso);
  if (!Number.isFinite(parsed.getTime())) return "-";
  return parsed.toLocaleString();
}

export function formatFlag(value: boolean): string {
  return value ? "On" : "Off";
}

export function stringifyRunValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function statusBadgeClasses(status: "SUCCESS" | "SKIPPED" | "FAILED") {
  if (status === "SUCCESS") {
    return "border border-emerald-500/40 bg-emerald-500/10 text-emerald-100";
  }
  if (status === "FAILED") {
    return "border border-rose-500/40 bg-rose-500/10 text-rose-100";
  }
  return "border border-amber-400/40 bg-amber-400/10 text-amber-100";
}

export function alertBadgeClasses(status: "QUEUED" | "SKIPPED" | "FAILED") {
  if (status === "QUEUED") {
    return "border border-blue-400/40 bg-blue-500/10 text-blue-100";
  }
  if (status === "FAILED") {
    return "border border-rose-500/40 bg-rose-500/10 text-rose-100";
  }
  return "border border-amber-400/40 bg-amber-400/10 text-amber-100";
}
