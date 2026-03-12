import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLeadStats,
  buildLeadTimeline,
  defaultNotifyMessage,
  dueLabel,
  isLeadOverdue,
  metadataLeadId,
  normalizePhoneForTel,
  type DeliveryLeadRecord,
  type NotificationAuditLogRecord,
  type NotificationJobRecord,
} from "./fulfillmentConsoleSupport";

function createLead(overrides?: Partial<DeliveryLeadRecord>): DeliveryLeadRecord {
  return {
    id: "lead-1",
    businessId: "biz-1",
    status: "NEW",
    source: "marketplace",
    assignedToUserId: null,
    assignedAt: null,
    assignedToName: null,
    requestedQty: 2,
    unitPriceCents: 1200,
    totalCents: 2400,
    requestedAt: "2026-03-12T12:00:00.000Z",
    fulfillBy: null,
    contactedAt: null,
    fulfilledAt: null,
    cancelledAt: null,
    deliveryAddress: "123 Wheat Street",
    notes: null,
    createdAt: "2026-03-12T12:00:00.000Z",
    updatedAt: "2026-03-12T12:00:00.000Z",
    business: {
      id: "biz-1",
      slug: "avalon",
      name: "Avalon",
      status: "ACTIVE",
    },
    recipient: {
      id: "recipient-1",
      name: "Tony",
      email: "tonyblum@me.com",
      phone: "+1 (780) 123-4567",
      preferredChannel: "EMAIL",
    },
    inventoryItem: {
      id: "inventory-1",
      name: "Bread box",
      priceCents: 1200,
    },
    offer: null,
    assignee: null,
    ...overrides,
  };
}

test("buildLeadStats summarizes open, overdue, mine, and unassigned counts", () => {
  const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const leads = [
    createLead({ id: "lead-new", status: "NEW" }),
    createLead({ id: "lead-contacted", status: "CONTACTED", assignedToUserId: "user-1" }),
    createLead({ id: "lead-reserved", status: "RESERVED", fulfillBy: future, assignedToUserId: "user-1" }),
    createLead({ id: "lead-overdue", status: "CONTACTED", fulfillBy: past }),
    createLead({ id: "lead-fulfilled", status: "FULFILLED", assignedToUserId: "user-2" }),
    createLead({ id: "lead-cancelled", status: "CANCELLED" }),
    createLead({ id: "lead-expired", status: "EXPIRED" }),
  ];

  assert.deepEqual(buildLeadStats(leads, "user-1"), {
    total: 7,
    newCount: 1,
    contactedCount: 2,
    reservedCount: 1,
    fulfilledCount: 1,
    cancelledCount: 1,
    expiredCount: 1,
    unassignedCount: 2,
    overdueCount: 1,
    mineCount: 2,
  });
});

test("isLeadOverdue and dueLabel reflect open lead deadlines", () => {
  const overdueLead = createLead({
    status: "CONTACTED",
    fulfillBy: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  });
  const closedLead = createLead({
    status: "FULFILLED",
    fulfillBy: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  });

  assert.equal(isLeadOverdue(overdueLead), true);
  assert.match(dueLabel(overdueLead), /^Overdue /);
  assert.equal(isLeadOverdue(closedLead), false);
});

test("buildLeadTimeline merges lead events, notification jobs, and audit entries", () => {
  const lead = createLead({
    contactedAt: "2026-03-12T12:30:00.000Z",
    assignedAt: "2026-03-12T12:35:00.000Z",
    assignedToName: "Operator One",
  });
  const job: NotificationJobRecord = {
    id: "job-1",
    businessId: "biz-1",
    channel: "email",
    audience: "tonyblum@me.com",
    subject: "Delivery update",
    message: "hello",
    metadata: { leadId: lead.id },
    status: "sent",
    provider: "tmail",
    attempts: 1,
    maxAttempts: 3,
    nextAttemptAt: "2026-03-12T12:45:00.000Z",
    lastAttemptAt: "2026-03-12T12:41:00.000Z",
    sentAt: "2026-03-12T12:41:00.000Z",
    failedAt: null,
    lastError: null,
    createdAt: "2026-03-12T12:40:00.000Z",
    updatedAt: "2026-03-12T12:41:00.000Z",
  };
  const auditEntry: NotificationAuditLogRecord = {
    id: "audit-1",
    jobId: "job-1",
    event: "provider_sent",
    channel: "email",
    provider: "tmail",
    attempt: 1,
    message: "Provider accepted message",
    detail: { providerMessageId: "msg-123" },
    createdAt: "2026-03-12T12:41:00.000Z",
  };

  const timeline = buildLeadTimeline(lead, [{ job, entries: [auditEntry] }]);

  assert.equal(timeline[0]?.id, "audit-audit-1");
  assert.equal(timeline[1]?.id, "job-job-1");
  assert.equal(timeline.some((entry) => entry.title === "Lead assigned"), true);
});

test("defaultNotifyMessage, metadataLeadId, and phone normalization stay readable", () => {
  const lead = createLead();

  assert.match(defaultNotifyMessage(lead), /Hi Tony,/);
  assert.equal(metadataLeadId({ leadId: "lead-1" }), "lead-1");
  assert.equal(metadataLeadId({ leadId: 123 }), null);
  assert.equal(normalizePhoneForTel("+1 (780) 123-4567"), "+17801234567");
});
