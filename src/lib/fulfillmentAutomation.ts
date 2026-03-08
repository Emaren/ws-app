type LeadLike = {
  status: string;
  assignedToUserId?: string | null;
  fulfillBy?: Date | string | null;
};

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

export type FulfillmentAutomationSummary = {
  openLeadCount: number;
  unassignedLeadCount: number;
  overdueLeadCount: number;
  autoAssignableLeadCount: number;
  escalationCandidateCount: number;
};

export function isOpenLead(status: string): boolean {
  return status === "NEW" || status === "CONTACTED" || status === "RESERVED";
}

export function isOverdueLead(lead: LeadLike, now = new Date()): boolean {
  if (!isOpenLead(lead.status) || !lead.fulfillBy) {
    return false;
  }

  const dueAt =
    lead.fulfillBy instanceof Date ? lead.fulfillBy : new Date(lead.fulfillBy);
  return Number.isFinite(dueAt.getTime()) && dueAt.getTime() < now.getTime();
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
