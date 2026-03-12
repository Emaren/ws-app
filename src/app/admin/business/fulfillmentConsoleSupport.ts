export type DeliveryLeadStatus =
  | "NEW"
  | "CONTACTED"
  | "RESERVED"
  | "FULFILLED"
  | "CANCELLED"
  | "EXPIRED";

export type NotificationChannel = "email" | "sms" | "push";
export type NotificationStatus = "queued" | "processing" | "retrying" | "sent" | "failed";

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

export type RecipientRecord = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  preferredChannel: "EMAIL" | "SMS" | "PUSH";
};

export type DeliveryLeadRecord = {
  id: string;
  businessId: string;
  status: DeliveryLeadStatus;
  source: string;
  assignedToUserId: string | null;
  assignedAt: string | null;
  assignedToName: string | null;
  requestedQty: number;
  unitPriceCents: number | null;
  totalCents: number | null;
  requestedAt: string;
  fulfillBy: string | null;
  contactedAt: string | null;
  fulfilledAt: string | null;
  cancelledAt: string | null;
  deliveryAddress: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  business: {
    id: string;
    slug: string;
    name: string;
    status: string;
  };
  recipient: RecipientRecord | null;
  inventoryItem: {
    id: string;
    name: string;
    priceCents: number;
  } | null;
  offer: {
    id: string;
    title: string;
    discountPriceCents: number | null;
  } | null;
  assignee: {
    id: string;
    name: string;
    email: string;
    role: "OWNER" | "ADMIN" | "EDITOR";
  } | null;
};

export type DeliveryLeadListResponse = {
  viewer: {
    actorUserId: string | null;
    role: string | undefined;
    isOwnerAdmin: boolean;
  };
  leads: DeliveryLeadRecord[];
  businesses: BusinessRecord[];
  operators: OperatorRecord[];
};

export type NotificationJobRecord = {
  id: string;
  businessId: string;
  channel: NotificationChannel;
  audience: string;
  subject: string | null;
  message: string;
  metadata: Record<string, unknown> | null;
  status: NotificationStatus;
  provider: string | null;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: string;
  lastAttemptAt: string | null;
  sentAt: string | null;
  failedAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NotificationAuditLogRecord = {
  id: string;
  jobId: string;
  event: string;
  channel: NotificationChannel;
  provider: string | null;
  attempt: number | null;
  message: string;
  detail: Record<string, unknown> | null;
  createdAt: string;
};

export type ProcessQueueResult = {
  processed: number;
  sent: number;
  retried: number;
  failed: number;
  jobIds: string[];
};

export type TimelineEntry = {
  id: string;
  at: string;
  category: "lead" | "notification" | "audit";
  title: string;
  detail: string;
  channel?: NotificationChannel;
  status?: NotificationStatus;
};

export type WorkflowFilter = "ALL" | "UNASSIGNED" | "MINE" | "OVERDUE";

export const LEAD_STATUSES: readonly DeliveryLeadStatus[] = [
  "NEW",
  "CONTACTED",
  "RESERVED",
  "FULFILLED",
  "CANCELLED",
  "EXPIRED",
];

export type LeadStats = {
  total: number;
  newCount: number;
  contactedCount: number;
  reservedCount: number;
  fulfilledCount: number;
  cancelledCount: number;
  expiredCount: number;
  unassignedCount: number;
  overdueCount: number;
  mineCount: number;
};

export async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      (payload && typeof payload.message === "string" && payload.message) ||
      `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}

export function leadStatusBadge(status: DeliveryLeadStatus): string {
  if (status === "NEW") {
    return "border border-white/20 bg-white/5 text-white/80";
  }
  if (status === "CONTACTED") {
    return "border border-blue-400/40 bg-blue-500/10 text-blue-100";
  }
  if (status === "RESERVED") {
    return "border border-amber-500/40 bg-amber-500/10 text-amber-200";
  }
  if (status === "FULFILLED") {
    return "border border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
  }
  if (status === "CANCELLED") {
    return "border border-red-500/50 bg-red-500/10 text-red-200";
  }
  return "border border-neutral-500/50 bg-neutral-500/20 text-neutral-200";
}

export function notificationStatusBadge(status: NotificationStatus): string {
  if (status === "sent") {
    return "border border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
  }
  if (status === "failed") {
    return "border border-red-500/50 bg-red-500/10 text-red-200";
  }
  if (status === "processing") {
    return "border border-blue-400/40 bg-blue-500/10 text-blue-100";
  }
  if (status === "retrying") {
    return "border border-amber-500/40 bg-amber-500/10 text-amber-200";
  }
  return "border border-white/20 bg-white/5 text-white/80";
}

export function centsToDollars(cents: number | null): string {
  if (cents === null || !Number.isFinite(cents)) {
    return "-";
  }
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatStatusLabel(status: DeliveryLeadStatus): string {
  if (status === "NEW") return "New";
  if (status === "CONTACTED") return "Contacted";
  if (status === "RESERVED") return "Reserved";
  if (status === "FULFILLED") return "Fulfilled";
  if (status === "CANCELLED") return "Cancelled";
  return "Expired";
}

export function formatNotificationStatus(status: NotificationStatus): string {
  if (status === "processing") return "Processing";
  if (status === "retrying") return "Retrying";
  if (status === "sent") return "Sent";
  if (status === "failed") return "Failed";
  return "Queued";
}

export function metadataLeadId(metadata: Record<string, unknown> | null): string | null {
  if (!metadata) return null;
  const leadId = metadata.leadId;
  return typeof leadId === "string" && leadId.trim() ? leadId : null;
}

export function normalizePhoneForTel(phone: string): string {
  return phone.replace(/[\s().-]/g, "");
}

export function toDateTimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const parsed = new Date(iso);
  if (!Number.isFinite(parsed.getTime())) return "";
  const offsetMs = parsed.getTimezoneOffset() * 60_000;
  return new Date(parsed.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function toIsoDateTime(localValue: string): string | null {
  const trimmed = localValue.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  if (!Number.isFinite(parsed.getTime())) {
    throw new Error("Fulfill-by must be a valid date/time");
  }

  return parsed.toISOString();
}

export function assigneeLabel(lead: DeliveryLeadRecord): string {
  return lead.assignee?.name || lead.assignedToName || lead.assignee?.email || "Unassigned";
}

export function isLeadOpen(status: DeliveryLeadStatus): boolean {
  return status === "NEW" || status === "CONTACTED" || status === "RESERVED";
}

export function isLeadOverdue(lead: DeliveryLeadRecord): boolean {
  if (!lead.fulfillBy || !isLeadOpen(lead.status)) {
    return false;
  }

  const dueMs = Date.parse(lead.fulfillBy);
  return Number.isFinite(dueMs) && dueMs < Date.now();
}

export function dueLabel(lead: DeliveryLeadRecord): string {
  if (!lead.fulfillBy) {
    return "No due target";
  }

  const dueMs = Date.parse(lead.fulfillBy);
  if (!Number.isFinite(dueMs)) {
    return "Due date unavailable";
  }

  return `${isLeadOverdue(lead) ? "Overdue" : "Due"} ${new Date(lead.fulfillBy).toLocaleString()}`;
}

export function itemLabel(lead: DeliveryLeadRecord): string {
  return lead.offer?.title ?? lead.inventoryItem?.name ?? "Delivery request";
}

export function customerLabel(lead: DeliveryLeadRecord): string {
  const recipientName = lead.recipient?.name?.trim();
  if (recipientName) return recipientName;
  const recipientEmail = lead.recipient?.email?.trim();
  if (recipientEmail) return recipientEmail;
  const recipientPhone = lead.recipient?.phone?.trim();
  if (recipientPhone) return recipientPhone;
  return "Unknown customer";
}

export function defaultNotifyMessage(lead: DeliveryLeadRecord): string {
  const name = lead.recipient?.name?.trim() || "there";
  return [
    `Hi ${name},`,
    `Your Wheat & Stone delivery request for ${itemLabel(lead)} is currently ${formatStatusLabel(lead.status)}.`,
    "Reply to this message if you need any changes.",
    "- Wheat & Stone",
  ].join("\n");
}

export function buildLeadEvents(lead: DeliveryLeadRecord): TimelineEntry[] {
  const events: TimelineEntry[] = [
    {
      id: `${lead.id}-requested`,
      at: lead.requestedAt,
      category: "lead",
      title: "Lead created",
      detail: `Qty ${lead.requestedQty} · ${itemLabel(lead)}`,
    },
  ];

  if (lead.contactedAt) {
    events.push({
      id: `${lead.id}-contacted`,
      at: lead.contactedAt,
      category: "lead",
      title: "Marked contacted",
      detail: "Customer contact initiated",
    });
  }

  if (lead.assignedAt && lead.assignedToName) {
    events.push({
      id: `${lead.id}-assigned`,
      at: lead.assignedAt,
      category: "lead",
      title: "Lead assigned",
      detail: `Owner: ${lead.assignedToName}`,
    });
  }

  if (lead.fulfillBy) {
    events.push({
      id: `${lead.id}-due`,
      at: lead.fulfillBy,
      category: "lead",
      title: isLeadOverdue(lead) ? "Fulfillment target overdue" : "Fulfillment target set",
      detail: dueLabel(lead),
    });
  }

  if (lead.fulfilledAt) {
    events.push({
      id: `${lead.id}-fulfilled`,
      at: lead.fulfilledAt,
      category: "lead",
      title: "Marked fulfilled",
      detail: "Delivery marked complete",
    });
  }

  if (lead.cancelledAt) {
    events.push({
      id: `${lead.id}-cancelled`,
      at: lead.cancelledAt,
      category: "lead",
      title: "Marked cancelled",
      detail: "Lead marked cancelled",
    });
  }

  return events;
}

export function buildLeadStats(
  leads: DeliveryLeadRecord[],
  viewerUserId: string | null,
): LeadStats {
  let newCount = 0;
  let contactedCount = 0;
  let reservedCount = 0;
  let fulfilledCount = 0;
  let cancelledCount = 0;
  let expiredCount = 0;
  let unassignedCount = 0;
  let overdueCount = 0;
  let mineCount = 0;

  for (const lead of leads) {
    if (lead.status === "NEW") newCount += 1;
    if (lead.status === "CONTACTED") contactedCount += 1;
    if (lead.status === "RESERVED") reservedCount += 1;
    if (lead.status === "FULFILLED") fulfilledCount += 1;
    if (lead.status === "CANCELLED") cancelledCount += 1;
    if (lead.status === "EXPIRED") expiredCount += 1;
    if (!lead.assignedToUserId && isLeadOpen(lead.status)) unassignedCount += 1;
    if (isLeadOverdue(lead)) overdueCount += 1;
    if (viewerUserId && lead.assignedToUserId === viewerUserId) mineCount += 1;
  }

  return {
    total: leads.length,
    newCount,
    contactedCount,
    reservedCount,
    fulfilledCount,
    cancelledCount,
    expiredCount,
    unassignedCount,
    overdueCount,
    mineCount,
  };
}

function stringifyAuditDetail(detail: Record<string, unknown> | null): string {
  if (!detail) return "";
  return Object.entries(detail)
    .slice(0, 4)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(" · ");
}

export function buildLeadTimeline(
  lead: DeliveryLeadRecord,
  auditBatches: Array<{ job: NotificationJobRecord; entries: NotificationAuditLogRecord[] }>,
): TimelineEntry[] {
  const leadEvents = buildLeadEvents(lead);
  const jobEvents: TimelineEntry[] = [];
  const auditEvents: TimelineEntry[] = [];

  for (const { job, entries } of auditBatches) {
    jobEvents.push({
      id: `job-${job.id}`,
      at: job.createdAt,
      category: "notification",
      title: `${job.channel.toUpperCase()} notification queued`,
      detail: `${formatNotificationStatus(job.status)} · audience ${job.audience}`,
      channel: job.channel,
      status: job.status,
    });

    for (const entry of entries) {
      const detailEntries = stringifyAuditDetail(entry.detail);
      auditEvents.push({
        id: `audit-${entry.id}`,
        at: entry.createdAt,
        category: "audit",
        title: `${entry.channel.toUpperCase()} ${entry.event.replace(/_/g, " ")}`,
        detail: detailEntries ? `${entry.message} · ${detailEntries}` : entry.message,
        channel: entry.channel,
      });
    }
  }

  return [...leadEvents, ...jobEvents, ...auditEvents].sort((a, b) => b.at.localeCompare(a.at));
}
