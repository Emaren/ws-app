type LeadLike = {
  status: string;
  assignedToUserId?: string | null;
  fulfillBy?: Date | string | null;
};

type OperatorLeadLike = LeadLike & {
  assignedToName?: string | null;
  fulfilledAt?: Date | string | null;
};

type CadenceInput = Date | string | null | undefined;

export const DEFAULT_CUSTOMER_CONTACT_TEMPLATE = [
  "Hi {{customerName}},",
  "",
  "We received your Wheat & Stone delivery request for {{itemLabel}}.",
  "Your current lead owner is {{assigneeName}}.",
  "",
  "We will follow up again before {{fulfillByLabel}}.",
  "",
  "- {{businessName}}",
].join("\n");

export const DEFAULT_DELAY_UPDATE_TEMPLATE = [
  "Hi {{customerName}},",
  "",
  "We are still working on your delivery request for {{itemLabel}}.",
  "The updated target is {{fulfillByLabel}}.",
  "",
  "If anything changes, reply to this message and we will update you.",
  "",
  "- {{businessName}}",
].join("\n");

export const DEFAULT_ESCALATION_TEMPLATE = [
  "Wheat & Stone fulfillment escalation for {{businessName}}",
  "",
  "Open leads: {{openLeadCount}}",
  "Unassigned leads: {{unassignedLeadCount}}",
  "Overdue leads: {{overdueLeadCount}}",
  "Auto-assigned this run: {{autoAssignedCount}}",
  "",
  "Overdue queue:",
  "{{overdueLeadLines}}",
].join("\n");

export const DEFAULT_DIGEST_TEMPLATE = [
  "Wheat & Stone fulfillment digest for {{businessName}}",
  "",
  "Open leads: {{openLeadCount}}",
  "Unassigned leads: {{unassignedLeadCount}}",
  "Overdue leads: {{overdueLeadCount}}",
  "Completed in last 30 days: {{fulfilledLeadCount}}",
  "",
  "Operator board:",
  "{{operatorBoard}}",
  "",
  "Recent automation:",
  "{{recentRunDigest}}",
].join("\n");

export type FulfillmentAutomationSummary = {
  openLeadCount: number;
  unassignedLeadCount: number;
  overdueLeadCount: number;
  autoAssignableLeadCount: number;
  escalationCandidateCount: number;
};

export type FulfillmentOperatorPerformance = {
  operatorKey: string;
  operatorName: string;
  openLeadCount: number;
  overdueLeadCount: number;
  fulfilledLeadCount: number;
};

export function createEmptyFulfillmentAutomationSummary(): FulfillmentAutomationSummary {
  return {
    openLeadCount: 0,
    unassignedLeadCount: 0,
    overdueLeadCount: 0,
    autoAssignableLeadCount: 0,
    escalationCandidateCount: 0,
  };
}

export function isOpenLead(status: string): boolean {
  return status === "NEW" || status === "CONTACTED" || status === "RESERVED";
}

export function asDate(value: CadenceInput): Date | null {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

export function isOverdueLead(lead: LeadLike, now = new Date()): boolean {
  const dueAt = asDate(lead.fulfillBy);
  return Boolean(dueAt && isOpenLead(lead.status) && dueAt.getTime() < now.getTime());
}

export function summarizeFulfillmentLeads(
  leads: LeadLike[],
  input: {
    autoAssignEnabled: boolean;
    defaultAssigneeUserId?: string | null;
  },
  now = new Date(),
): FulfillmentAutomationSummary {
  let openLeadCount = 0;
  let unassignedLeadCount = 0;
  let overdueLeadCount = 0;
  let autoAssignableLeadCount = 0;

  for (const lead of leads) {
    if (!isOpenLead(lead.status)) {
      continue;
    }

    openLeadCount += 1;

    const unassigned = !lead.assignedToUserId;
    if (unassigned) {
      unassignedLeadCount += 1;
    }

    if (isOverdueLead(lead, now)) {
      overdueLeadCount += 1;
    }

    if (unassigned && input.autoAssignEnabled && input.defaultAssigneeUserId) {
      autoAssignableLeadCount += 1;
    }
  }

  return {
    openLeadCount,
    unassignedLeadCount,
    overdueLeadCount,
    autoAssignableLeadCount,
    escalationCandidateCount: overdueLeadCount,
  };
}

export function nextCadenceAt(
  lastAt: CadenceInput,
  cadenceHours: number,
  now = new Date(),
): Date {
  const reference = asDate(lastAt);
  if (!reference) {
    return now;
  }

  return new Date(reference.getTime() + cadenceHours * 60 * 60 * 1000);
}

export function isCadenceDue(
  lastAt: CadenceInput,
  cadenceHours: number,
  now = new Date(),
): boolean {
  return nextCadenceAt(lastAt, cadenceHours, now).getTime() <= now.getTime();
}

export function formatCadenceLabel(
  lastAt: CadenceInput,
  cadenceHours: number,
  now = new Date(),
): string {
  const nextAt = nextCadenceAt(lastAt, cadenceHours, now);
  const diffMs = nextAt.getTime() - now.getTime();

  if (diffMs <= 0) {
    return "Due now";
  }

  const diffHours = Math.ceil(diffMs / (60 * 60 * 1000));
  if (diffHours < 24) {
    return `Due in ${diffHours}h`;
  }

  const diffDays = Math.ceil(diffHours / 24);
  return `Due in ${diffDays}d`;
}

export function applyTemplate(
  template: string,
  variables: Record<string, string | number | null | undefined>,
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const value = variables[key];
    if (value === null || value === undefined) {
      return "";
    }
    return String(value);
  });
}

export function buildOperatorPerformance(
  leads: OperatorLeadLike[],
  now = new Date(),
): FulfillmentOperatorPerformance[] {
  const byOperator = new Map<string, FulfillmentOperatorPerformance>();

  for (const lead of leads) {
    const operatorKey = lead.assignedToUserId || lead.assignedToName || "unassigned";
    const operatorName = lead.assignedToName || (lead.assignedToUserId ? "Assigned operator" : "Unassigned");
    const current =
      byOperator.get(operatorKey) ??
      {
        operatorKey,
        operatorName,
        openLeadCount: 0,
        overdueLeadCount: 0,
        fulfilledLeadCount: 0,
      };

    if (isOpenLead(lead.status) && lead.assignedToUserId) {
      current.openLeadCount += 1;
      if (isOverdueLead(lead, now)) {
        current.overdueLeadCount += 1;
      }
    }

    if (lead.status === "FULFILLED" && asDate(lead.fulfilledAt)) {
      current.fulfilledLeadCount += 1;
    }

    byOperator.set(operatorKey, current);
  }

  return [...byOperator.values()]
    .filter((operator) => operator.operatorKey !== "unassigned")
    .sort((left, right) => {
      if (right.fulfilledLeadCount !== left.fulfilledLeadCount) {
        return right.fulfilledLeadCount - left.fulfilledLeadCount;
      }
      if (right.openLeadCount !== left.openLeadCount) {
        return right.openLeadCount - left.openLeadCount;
      }
      return left.operatorName.localeCompare(right.operatorName);
    });
}

export function renderOperatorBoard(
  rows: FulfillmentOperatorPerformance[],
  limit = 5,
): string {
  if (!rows.length) {
    return "- No assigned operator activity yet";
  }

  return rows
    .slice(0, limit)
    .map(
      (row) =>
        `- ${row.operatorName}: ${row.openLeadCount} open, ${row.overdueLeadCount} overdue, ${row.fulfilledLeadCount} fulfilled`,
    )
    .join("\n");
}
