"use client";

import { useEffect, useMemo, useState } from "react";
import { FulfillmentDetailPanels } from "./FulfillmentDetailPanels";
import { FulfillmentConsoleOverviewPanels } from "./FulfillmentConsoleOverviewPanels";
import { FulfillmentQueuePanel } from "./FulfillmentQueuePanel";
import {
  LEAD_STATUSES,
  buildLeadStats,
  buildLeadTimeline,
  defaultNotifyMessage,
  formatNotificationStatus,
  formatStatusLabel,
  itemLabel,
  metadataLeadId,
  requestJson,
  toDateTimeLocalValue,
  toIsoDateTime,
  type BusinessRecord,
  type DeliveryLeadListResponse,
  type DeliveryLeadRecord,
  type DeliveryLeadStatus,
  type NotificationAuditLogRecord,
  type NotificationChannel,
  type NotificationJobRecord,
  type OperatorRecord,
  type ProcessQueueResult,
  type TimelineEntry,
  type WorkflowFilter,
} from "./fulfillmentConsoleSupport";

type FulfillmentConsoleProps = {
  title?: string;
  summary?: string;
  initialBusinessId?: string;
};

export default function FulfillmentConsole({
  title = "Store Fulfillment Console",
  summary = "Manage delivery lead statuses, claim owners, set due targets, trigger email/SMS updates, and inspect the lead timeline.",
  initialBusinessId = "",
}: FulfillmentConsoleProps) {
  const [viewerUserId, setViewerUserId] = useState<string | null>(null);
  const [operators, setOperators] = useState<OperatorRecord[]>([]);
  const [businesses, setBusinesses] = useState<BusinessRecord[]>([]);
  const [leads, setLeads] = useState<DeliveryLeadRecord[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState(initialBusinessId);
  const [statusFilter, setStatusFilter] = useState<"" | DeliveryLeadStatus>("");
  const [workflowFilter, setWorkflowFilter] = useState<WorkflowFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<DeliveryLeadStatus>("NEW");
  const [selectedAssigneeId, setSelectedAssigneeId] = useState("");
  const [fulfillByInput, setFulfillByInput] = useState("");
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

  const leadStats = useMemo(() => buildLeadStats(leads, viewerUserId), [leads, viewerUserId]);

  async function loadLeads() {
    setLoading(true);
    setError(null);

    try {
      const query = new URLSearchParams();
      if (selectedBusinessId) {
        query.set("businessId", selectedBusinessId);
      }
      if (statusFilter) {
        query.set("status", statusFilter);
      }
      if (workflowFilter !== "ALL") {
        query.set("workflow", workflowFilter);
      }
      if (searchQuery.trim()) {
        query.set("q", searchQuery.trim());
      }

      const response = await requestJson<DeliveryLeadListResponse>(
        `/api/delivery-leads?${query.toString()}`,
      );

      setBusinesses(response.businesses);
      setLeads(response.leads);
      setOperators(response.operators);
      setViewerUserId(response.viewer.actorUserId);

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
            setSelectedAssigneeId(firstLead.assignedToUserId ?? "");
            setFulfillByInput(toDateTimeLocalValue(firstLead.fulfillBy));
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

      setTimeline(buildLeadTimeline(lead, auditBatches));
    } catch (loadError) {
      setTimeline(buildLeadTimeline(lead, []));
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setTimelineLoading(false);
    }
  }

  useEffect(() => {
    setSelectedBusinessId(initialBusinessId);
  }, [initialBusinessId]);

  useEffect(() => {
    void loadLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBusinessId, statusFilter, workflowFilter, searchQuery, timelineRefreshToken]);

  useEffect(() => {
    if (!selectedLead) {
      return;
    }

    setSelectedStatus(selectedLead.status);
    setSelectedAssigneeId(selectedLead.assignedToUserId ?? "");
    setFulfillByInput(toDateTimeLocalValue(selectedLead.fulfillBy));
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
      const fulfillBy = toIsoDateTime(fulfillByInput);
      const payload: Record<string, unknown> = {
        status: selectedStatus,
        assignedToUserId: selectedAssigneeId || null,
        fulfillBy,
      };
      if (statusNote.trim()) {
        payload.note = statusNote.trim();
      }

      await requestJson(`/api/delivery-leads/${encodeURIComponent(selectedLead.id)}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      setNotice(
        `Workflow saved. Status ${formatStatusLabel(selectedStatus)} · owner ${
          selectedAssigneeId
            ? operators.find((operator) => operator.id === selectedAssigneeId)?.name ||
              "assigned"
            : "cleared"
        }.`,
      );
      setStatusNote("");
      setTimelineRefreshToken((value) => value + 1);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setBusyAction(null);
    }
  }

  async function claimLead() {
    if (!selectedLead || !viewerUserId) return;

    setBusyAction("claim-lead");
    setError(null);
    setNotice(null);

    try {
      await requestJson(`/api/delivery-leads/${encodeURIComponent(selectedLead.id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          assignedToUserId: viewerUserId,
          note: "Lead claimed from fulfillment board.",
        }),
      });

      setSelectedAssigneeId(viewerUserId);
      setNotice("Lead claimed.");
      setTimelineRefreshToken((value) => value + 1);
    } catch (claimError) {
      setError(claimError instanceof Error ? claimError.message : String(claimError));
    } finally {
      setBusyAction(null);
    }
  }

  async function clearLeadOwner() {
    if (!selectedLead) return;

    setBusyAction("clear-owner");
    setError(null);
    setNotice(null);

    try {
      await requestJson(`/api/delivery-leads/${encodeURIComponent(selectedLead.id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          assignedToUserId: null,
          note: "Lead owner cleared from fulfillment board.",
        }),
      });

      setSelectedAssigneeId("");
      setNotice("Lead owner cleared.");
      setTimelineRefreshToken((value) => value + 1);
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : String(clearError));
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
      <FulfillmentConsoleOverviewPanels
        title={title}
        summary={summary}
        loading={loading}
        busyAction={busyAction}
        businesses={businesses}
        selectedBusinessId={selectedBusinessId}
        statusFilter={statusFilter}
        workflowFilter={workflowFilter}
        searchQuery={searchQuery}
        leadStats={leadStats}
        error={error}
        notice={notice}
        leadStatuses={LEAD_STATUSES}
        onRefresh={() => setTimelineRefreshToken((value) => value + 1)}
        onBusinessChange={setSelectedBusinessId}
        onStatusFilterChange={setStatusFilter}
        onWorkflowFilterChange={setWorkflowFilter}
        onSearchQueryChange={setSearchQuery}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <FulfillmentQueuePanel
          loading={loading}
          leads={leads}
          selectedLeadId={selectedLeadId}
          totalLeads={leadStats.total}
          onSelectLead={setSelectedLeadId}
        />

        <FulfillmentDetailPanels
          selectedLead={selectedLead}
          operators={operators}
          viewerUserId={viewerUserId}
          selectedAssigneeId={selectedAssigneeId}
          setSelectedAssigneeId={setSelectedAssigneeId}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          fulfillByInput={fulfillByInput}
          setFulfillByInput={setFulfillByInput}
          statusNote={statusNote}
          setStatusNote={setStatusNote}
          notifyMessage={notifyMessage}
          setNotifyMessage={setNotifyMessage}
          busyAction={busyAction}
          timeline={timeline}
          timelineLoading={timelineLoading}
          onSaveLeadStatus={saveLeadStatus}
          onClaimLead={claimLead}
          onClearLeadOwner={clearLeadOwner}
          onNotifyCustomer={notifyCustomer}
        />
      </div>
    </section>
  );
}
