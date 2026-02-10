"use client";

import { useEffect, useMemo, useState } from "react";

type DeliveryLeadStatus =
  | "NEW"
  | "CONTACTED"
  | "RESERVED"
  | "FULFILLED"
  | "CANCELLED"
  | "EXPIRED";

type NotificationChannel = "email" | "sms" | "push";
type NotificationStatus = "queued" | "processing" | "retrying" | "sent" | "failed";

type BusinessRecord = {
  id: string;
  slug: string;
  name: string;
  status: string;
};

type RecipientRecord = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  preferredChannel: "EMAIL" | "SMS" | "PUSH";
};

type DeliveryLeadRecord = {
  id: string;
  businessId: string;
  status: DeliveryLeadStatus;
  source: string;
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
};

type DeliveryLeadListResponse = {
  leads: DeliveryLeadRecord[];
  businesses: BusinessRecord[];
};

type NotificationJobRecord = {
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

type NotificationAuditLogRecord = {
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

type ProcessQueueResult = {
  processed: number;
  sent: number;
  retried: number;
  failed: number;
  jobIds: string[];
};

type TimelineEntry = {
  id: string;
  at: string;
  category: "lead" | "notification" | "audit";
  title: string;
  detail: string;
  channel?: NotificationChannel;
  status?: NotificationStatus;
};

const LEAD_STATUSES: readonly DeliveryLeadStatus[] = [
  "NEW",
  "CONTACTED",
  "RESERVED",
  "FULFILLED",
  "CANCELLED",
  "EXPIRED",
];

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
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

function leadStatusBadge(status: DeliveryLeadStatus): string {
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

function notificationStatusBadge(status: NotificationStatus): string {
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

function centsToDollars(cents: number | null): string {
  if (cents === null || !Number.isFinite(cents)) {
    return "-";
  }
  return `$${(cents / 100).toFixed(2)}`;
}

function formatStatusLabel(status: DeliveryLeadStatus): string {
  if (status === "NEW") return "New";
  if (status === "CONTACTED") return "Contacted";
  if (status === "RESERVED") return "Reserved";
  if (status === "FULFILLED") return "Fulfilled";
  if (status === "CANCELLED") return "Cancelled";
  return "Expired";
}

function formatNotificationStatus(status: NotificationStatus): string {
  if (status === "processing") return "Processing";
  if (status === "retrying") return "Retrying";
  if (status === "sent") return "Sent";
  if (status === "failed") return "Failed";
  return "Queued";
}

function metadataLeadId(metadata: Record<string, unknown> | null): string | null {
  if (!metadata) return null;
  const leadId = metadata.leadId;
  return typeof leadId === "string" && leadId.trim() ? leadId : null;
}

function normalizePhoneForTel(phone: string): string {
  return phone.replace(/[\s().-]/g, "");
}

function itemLabel(lead: DeliveryLeadRecord): string {
  return lead.offer?.title ?? lead.inventoryItem?.name ?? "Delivery request";
}

function customerLabel(lead: DeliveryLeadRecord): string {
  const recipientName = lead.recipient?.name?.trim();
  if (recipientName) return recipientName;
  const recipientEmail = lead.recipient?.email?.trim();
  if (recipientEmail) return recipientEmail;
  const recipientPhone = lead.recipient?.phone?.trim();
  if (recipientPhone) return recipientPhone;
  return "Unknown customer";
}

function defaultNotifyMessage(lead: DeliveryLeadRecord): string {
  const name = lead.recipient?.name?.trim() || "there";
  return [
    `Hi ${name},`,
    `Your Wheat & Stone delivery request for ${itemLabel(lead)} is currently ${formatStatusLabel(lead.status)}.`,
    "Reply to this message if you need any changes.",
    "- Wheat & Stone",
  ].join("\n");
}

function buildLeadEvents(lead: DeliveryLeadRecord): TimelineEntry[] {
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

export default function FulfillmentConsole() {
  const [businesses, setBusinesses] = useState<BusinessRecord[]>([]);
  const [leads, setLeads] = useState<DeliveryLeadRecord[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | DeliveryLeadStatus>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<DeliveryLeadStatus>("NEW");
  const [statusNote, setStatusNote] = useState("");
  const [notifyMessage, setNotifyMessage] = useState("");
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [timelineRefreshToken, setTimelineRefreshToken] = useState(0);

  const selectedLead = useMemo(
    () => leads.find((lead) => lead.id === selectedLeadId) ?? null,
    [leads, selectedLeadId],
  );

  const leadStats = useMemo(() => {
    let newCount = 0;
    let contactedCount = 0;
    let reservedCount = 0;
    let fulfilledCount = 0;
    let cancelledCount = 0;
    let expiredCount = 0;

    for (const lead of leads) {
      if (lead.status === "NEW") newCount += 1;
      if (lead.status === "CONTACTED") contactedCount += 1;
      if (lead.status === "RESERVED") reservedCount += 1;
      if (lead.status === "FULFILLED") fulfilledCount += 1;
      if (lead.status === "CANCELLED") cancelledCount += 1;
      if (lead.status === "EXPIRED") expiredCount += 1;
    }

    return {
      total: leads.length,
      newCount,
      contactedCount,
      reservedCount,
      fulfilledCount,
      cancelledCount,
      expiredCount,
    };
  }, [leads]);

  async function loadLeads() {
    setLoading(true);
    setError(null);

    try {
      const query = new URLSearchParams();
      query.set("scope", "admin");
      if (selectedBusinessId) {
        query.set("businessId", selectedBusinessId);
      }
      if (statusFilter) {
        query.set("status", statusFilter);
      }
      if (searchQuery.trim()) {
        query.set("q", searchQuery.trim());
      }

      const response = await requestJson<DeliveryLeadListResponse>(
        `/api/delivery-leads?${query.toString()}`,
      );

      setBusinesses(response.businesses);
      setLeads(response.leads);

      const hasSelectedBusiness = selectedBusinessId
        ? response.businesses.some((item) => item.id === selectedBusinessId)
        : true;
      if (!hasSelectedBusiness && selectedBusinessId) {
        setSelectedBusinessId(response.businesses[0]?.id ?? "");
      }

      const hasSelectedLead =
        selectedLeadId && response.leads.some((item) => item.id === selectedLeadId);
      if (!hasSelectedLead) {
        const firstLeadId = response.leads[0]?.id ?? null;
        setSelectedLeadId(firstLeadId);
        if (firstLeadId) {
          const firstLead = response.leads.find((item) => item.id === firstLeadId);
          if (firstLead) {
            setSelectedStatus(firstLead.status);
            setNotifyMessage(defaultNotifyMessage(firstLead));
          }
        }
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }

  async function loadTimelineForLead(lead: DeliveryLeadRecord) {
    setTimelineLoading(true);
    setError(null);

    try {
      const jobs = await requestJson<NotificationJobRecord[]>(
        `/api/notifications/jobs?businessId=${encodeURIComponent(lead.businessId)}`,
      );

      const relatedJobs = jobs
        .filter((job) => metadataLeadId(job.metadata) === lead.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 12);

      const auditBatches = await Promise.all(
        relatedJobs.map(async (job) => {
          const entries = await requestJson<NotificationAuditLogRecord[]>(
            `/api/notifications/jobs/${encodeURIComponent(job.id)}/audit`,
          ).catch(() => [] as NotificationAuditLogRecord[]);
          return { job, entries };
        }),
      );

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
          const detailEntries = entry.detail
            ? Object.entries(entry.detail)
                .slice(0, 4)
                .map(([key, value]) => `${key}=${String(value)}`)
                .join(" · ")
            : "";

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

      const merged = [...leadEvents, ...jobEvents, ...auditEvents].sort((a, b) =>
        b.at.localeCompare(a.at),
      );

      setTimeline(merged);
    } catch (loadError) {
      setTimeline(buildLeadEvents(lead));
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setTimelineLoading(false);
    }
  }

  useEffect(() => {
    void loadLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBusinessId, statusFilter, searchQuery, timelineRefreshToken]);

  useEffect(() => {
    if (!selectedLead) {
      return;
    }

    setSelectedStatus(selectedLead.status);
    setNotifyMessage(defaultNotifyMessage(selectedLead));
  }, [selectedLead?.id, selectedLead]);

  useEffect(() => {
    if (!selectedLead) {
      setTimeline([]);
      return;
    }

    void loadTimelineForLead(selectedLead);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLead?.id, timelineRefreshToken]);

  async function saveLeadStatus() {
    if (!selectedLead) return;

    setBusyAction("status-save");
    setError(null);
    setNotice(null);

    try {
      const payload: Record<string, unknown> = {
        status: selectedStatus,
      };
      if (statusNote.trim()) {
        payload.note = statusNote.trim();
      }

      await requestJson(`/api/delivery-leads/${encodeURIComponent(selectedLead.id)}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      setNotice(`Lead status updated to ${formatStatusLabel(selectedStatus)}.`);
      setStatusNote("");
      setTimelineRefreshToken((value) => value + 1);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setBusyAction(null);
    }
  }

  async function notifyCustomer(channel: Exclude<NotificationChannel, "push">) {
    if (!selectedLead) return;

    const email = selectedLead.recipient?.email?.trim() || "";
    const phone = selectedLead.recipient?.phone?.trim() || "";
    const audience = channel === "email" ? email : phone;

    if (!audience) {
      setError(
        channel === "email"
          ? "Lead does not have a customer email."
          : "Lead does not have a customer phone number.",
      );
      return;
    }

    const message = notifyMessage.trim() || defaultNotifyMessage(selectedLead);

    setBusyAction(`notify-${channel}`);
    setError(null);
    setNotice(null);

    try {
      await requestJson<NotificationJobRecord>("/api/notifications/jobs", {
        method: "POST",
        body: JSON.stringify({
          businessId: selectedLead.businessId,
          channel,
          audience,
          subject:
            channel === "email"
              ? `Delivery update: ${itemLabel(selectedLead)}`
              : undefined,
          message,
          maxAttempts: 3,
          metadata: {
            source: "ws-app-fulfillment-console",
            leadId: selectedLead.id,
            leadStatus: selectedLead.status,
            customerEmail: email || null,
            customerPhone: phone || null,
          },
        }),
      });

      const processResult = await requestJson<ProcessQueueResult>(
        "/api/notifications/jobs/process",
        {
          method: "POST",
          body: JSON.stringify({ limit: 25 }),
        },
      );

      if (selectedLead.status === "NEW") {
        await requestJson(`/api/delivery-leads/${encodeURIComponent(selectedLead.id)}`, {
          method: "PATCH",
          body: JSON.stringify({
            status: "CONTACTED",
            note: `Customer notified via ${channel.toUpperCase()} from fulfillment console.`,
          }),
        });
        setSelectedStatus("CONTACTED");
      }

      setNotice(
        `${channel.toUpperCase()} notification queued. Queue run: ${processResult.processed} processed, ${processResult.sent} sent, ${processResult.retried} retried, ${processResult.failed} failed.`,
      );
      setTimelineRefreshToken((value) => value + 1);
    } catch (notifyError) {
      setError(notifyError instanceof Error ? notifyError.message : String(notifyError));
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <section className="space-y-4">
      <div className="admin-card p-4 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold md:text-2xl">Store Fulfillment Console</h2>
            <p className="mt-1 text-sm opacity-75">
              Manage delivery lead statuses, tap-to-call customers, trigger email/SMS updates, and inspect the lead timeline.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setTimelineRefreshToken((value) => value + 1)}
            className="rounded-xl border px-3 py-2 text-sm transition hover:bg-white/5 disabled:opacity-60"
            disabled={loading || busyAction !== null}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1 text-sm">
            <span>Business</span>
            <select
              value={selectedBusinessId}
              onChange={(event) => setSelectedBusinessId(event.target.value)}
              className="admin-surface w-full rounded-xl px-3 py-2"
            >
              <option value="">All businesses</option>
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span>Status</span>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "" | DeliveryLeadStatus)
              }
              className="admin-surface w-full rounded-xl px-3 py-2"
            >
              <option value="">All statuses</option>
              {LEAD_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {formatStatusLabel(status)}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm sm:col-span-2">
            <span>Search customer/item/address</span>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="admin-surface w-full rounded-xl px-3 py-2"
              placeholder="name, email, phone, item, address"
            />
          </label>
        </div>

        {error ? (
          <p className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="mt-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            {notice}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <div className="admin-card rounded-xl p-4 xl:col-span-2">
          <p className="text-xs uppercase tracking-wide opacity-70">Open leads</p>
          <p className="mt-1 text-2xl font-semibold">
            {leadStats.newCount + leadStats.contactedCount + leadStats.reservedCount}
          </p>
        </div>
        <div className="admin-card rounded-xl p-4 xl:col-span-2">
          <p className="text-xs uppercase tracking-wide opacity-70">Fulfilled</p>
          <p className="mt-1 text-2xl font-semibold">{leadStats.fulfilledCount}</p>
        </div>
        <div className="admin-card rounded-xl p-4 xl:col-span-2">
          <p className="text-xs uppercase tracking-wide opacity-70">Cancelled / Expired</p>
          <p className="mt-1 text-2xl font-semibold">
            {leadStats.cancelledCount + leadStats.expiredCount}
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="admin-card space-y-3 p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-semibold">Lead Queue</h3>
            <span className="rounded-full border border-white/20 px-2 py-0.5 text-xs opacity-80">
              {leadStats.total} total
            </span>
          </div>

          {loading ? (
            <p className="text-sm opacity-70">Loading leads...</p>
          ) : leads.length === 0 ? (
            <p className="text-sm opacity-70">No leads found for these filters.</p>
          ) : (
            <ul className="max-h-[560px] space-y-3 overflow-auto pr-1">
              {leads.map((lead) => {
                const phone = lead.recipient?.phone?.trim() || "";
                const callHref = phone ? `tel:${normalizePhoneForTel(phone)}` : "";

                return (
                  <li
                    key={lead.id}
                    className={`admin-surface rounded-xl p-3 ${
                      selectedLeadId === lead.id ? "ring-1 ring-amber-300/60" : ""
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{customerLabel(lead)}</p>
                        <p className="mt-0.5 text-xs opacity-75">{lead.business.name}</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${leadStatusBadge(lead.status)}`}>
                        {formatStatusLabel(lead.status)}
                      </span>
                    </div>

                    <p className="mt-1 text-xs opacity-80">{itemLabel(lead)}</p>
                    <p className="mt-1 text-xs opacity-70">
                      Qty {lead.requestedQty} · {centsToDollars(lead.totalCents)} · {new Date(lead.requestedAt).toLocaleString()}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs opacity-70">{lead.deliveryAddress || "No address"}</p>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedLeadId(lead.id)}
                        className="rounded-lg border px-2 py-1.5 text-xs transition hover:bg-white/5"
                      >
                        {selectedLeadId === lead.id ? "Selected" : "Open"}
                      </button>

                      {callHref ? (
                        <a
                          href={callHref}
                          className="rounded-lg border px-2 py-1.5 text-center text-xs transition hover:bg-white/5"
                        >
                          Tap to Call
                        </a>
                      ) : (
                        <span className="rounded-lg border px-2 py-1.5 text-center text-xs opacity-50">
                          No phone
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          <div className="admin-card space-y-4 p-4 md:p-5">
            <h3 className="text-base font-semibold">Lead Detail and Actions</h3>

            {!selectedLead ? (
              <p className="text-sm opacity-70">Select a lead to manage status and customer outreach.</p>
            ) : (
              <>
                <div className="admin-surface rounded-xl p-3 text-sm">
                  <p className="font-medium">{customerLabel(selectedLead)}</p>
                  <p className="mt-1 opacity-75">{itemLabel(selectedLead)}</p>
                  <p className="mt-1 text-xs opacity-70">{selectedLead.business.name}</p>
                  <p className="mt-1 text-xs opacity-70">
                    Email: {selectedLead.recipient?.email || "-"} · Phone: {selectedLead.recipient?.phone || "-"}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span>Status</span>
                    <select
                      value={selectedStatus}
                      onChange={(event) =>
                        setSelectedStatus(event.target.value as DeliveryLeadStatus)
                      }
                      className="admin-surface w-full rounded-xl px-3 py-2"
                    >
                      {LEAD_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {formatStatusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => void saveLeadStatus()}
                      disabled={busyAction !== null}
                      className="w-full rounded-xl border border-amber-300/40 bg-amber-200/20 px-4 py-2 text-sm font-medium transition hover:bg-amber-200/30 disabled:opacity-60"
                    >
                      {busyAction === "status-save" ? "Saving..." : "Save Status"}
                    </button>
                  </div>
                </div>

                <label className="space-y-1 text-sm">
                  <span>Status note (optional)</span>
                  <textarea
                    value={statusNote}
                    onChange={(event) => setStatusNote(event.target.value)}
                    className="admin-surface min-h-[74px] w-full rounded-xl px-3 py-2"
                    placeholder="Internal note for this status change"
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span>Notification message</span>
                  <textarea
                    value={notifyMessage}
                    onChange={(event) => setNotifyMessage(event.target.value)}
                    className="admin-surface min-h-[96px] w-full rounded-xl px-3 py-2"
                    placeholder="Customer update message"
                  />
                </label>

                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => void notifyCustomer("email")}
                    disabled={busyAction !== null || !selectedLead.recipient?.email}
                    className="rounded-xl border px-4 py-2 text-sm transition hover:bg-white/5 disabled:opacity-60"
                  >
                    {busyAction === "notify-email" ? "Sending..." : "Notify by Email"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void notifyCustomer("sms")}
                    disabled={busyAction !== null || !selectedLead.recipient?.phone}
                    className="rounded-xl border px-4 py-2 text-sm transition hover:bg-white/5 disabled:opacity-60"
                  >
                    {busyAction === "notify-sms" ? "Sending..." : "Notify by SMS"}
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="admin-card space-y-3 p-4 md:p-5">
            <h3 className="text-base font-semibold">Activity Timeline</h3>

            {!selectedLead ? (
              <p className="text-sm opacity-70">Select a lead to inspect timeline events.</p>
            ) : timelineLoading ? (
              <p className="text-sm opacity-70">Loading timeline...</p>
            ) : timeline.length === 0 ? (
              <p className="text-sm opacity-70">No timeline entries yet.</p>
            ) : (
              <ul className="space-y-2">
                {timeline.map((entry) => (
                  <li key={entry.id} className="admin-surface rounded-xl p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{entry.title}</p>
                      <span className="text-xs opacity-70">{new Date(entry.at).toLocaleString()}</span>
                    </div>

                    <p className="mt-1 text-xs opacity-80">{entry.detail}</p>

                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full border border-white/20 px-2 py-0.5 uppercase opacity-80">
                        {entry.category}
                      </span>
                      {entry.channel ? (
                        <span className="rounded-full border border-white/20 px-2 py-0.5 uppercase opacity-80">
                          {entry.channel}
                        </span>
                      ) : null}
                      {entry.status ? (
                        <span className={`rounded-full px-2 py-0.5 ${notificationStatusBadge(entry.status)}`}>
                          {formatNotificationStatus(entry.status)}
                        </span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
