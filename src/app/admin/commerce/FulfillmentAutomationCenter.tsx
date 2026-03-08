"use client";

import { useEffect, useMemo, useState } from "react";

type BusinessRecord = {
  id: string;
  slug: string;
  name: string;
  status: string;
};

type OperatorRecord = {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "ADMIN" | "EDITOR";
};

type AutomationSummary = {
  openLeadCount: number;
  unassignedLeadCount: number;
  overdueLeadCount: number;
  autoAssignableLeadCount: number;
  escalationCandidateCount: number;
};

type AutomationConfig = {
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

type AutomationPerformance = {
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

type OperatorPerformanceRecord = {
  operatorKey: string;
  operatorName: string;
  openLeadCount: number;
  overdueLeadCount: number;
  fulfilledLeadCount: number;
};

type SchedulerOverviewRecord = {
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

type RecentRunRecord = {
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

type RecentAlertRecord = {
  id: string;
  type: "ESCALATION" | "DIGEST";
  status: "QUEUED" | "SKIPPED" | "FAILED";
  recipientEmail: string | null;
  subject: string | null;
  leadCount: number;
  reason: string | null;
  createdAt: string;
};

type AutomationOverviewResponse = {
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

type AutomationDraft = {
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

function createDraft(config: AutomationConfig | null, businessId: string): AutomationDraft {
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
      (payload &&
        typeof payload === "object" &&
        "message" in payload &&
        typeof payload.message === "string" &&
        payload.message) ||
      `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}

function localDate(iso: string | null): string {
  if (!iso) return "-";
  const parsed = new Date(iso);
  if (!Number.isFinite(parsed.getTime())) return "-";
  return parsed.toLocaleString();
}

function formatFlag(value: boolean): string {
  return value ? "On" : "Off";
}

function stringifyRunValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function statusBadgeClasses(status: "SUCCESS" | "SKIPPED" | "FAILED") {
  if (status === "SUCCESS") {
    return "border border-emerald-500/40 bg-emerald-500/10 text-emerald-100";
  }
  if (status === "FAILED") {
    return "border border-rose-500/40 bg-rose-500/10 text-rose-100";
  }
  return "border border-amber-400/40 bg-amber-400/10 text-amber-100";
}

function alertBadgeClasses(status: "QUEUED" | "SKIPPED" | "FAILED") {
  if (status === "QUEUED") {
    return "border border-blue-400/40 bg-blue-500/10 text-blue-100";
  }
  if (status === "FAILED") {
    return "border border-rose-500/40 bg-rose-500/10 text-rose-100";
  }
  return "border border-amber-400/40 bg-amber-400/10 text-amber-100";
}

export default function FulfillmentAutomationCenter() {
  const [overview, setOverview] = useState<AutomationOverviewResponse | null>(null);
  const [selectedBusinessId, setSelectedBusinessId] = useState("");
  const [draft, setDraft] = useState<AutomationDraft>(() => createDraft(null, ""));
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const operators = overview?.operators ?? [];
  const summary = overview?.summary;

  async function loadOverview(nextBusinessId = selectedBusinessId) {
    setLoading(true);
    setError(null);

    try {
      const query = new URLSearchParams();
      if (nextBusinessId) {
        query.set("businessId", nextBusinessId);
      }

      const data = await requestJson<AutomationOverviewResponse>(
        `/api/admin/commerce/fulfillment-automation${query.toString() ? `?${query.toString()}` : ""}`,
      );

      const resolvedBusinessId = data.selectedBusinessId ?? "";
      setOverview(data);
      setSelectedBusinessId(resolvedBusinessId);
      setDraft(createDraft(data.config, resolvedBusinessId));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOverview("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedBusiness = useMemo(
    () => overview?.businesses.find((business) => business.id === selectedBusinessId) ?? null,
    [overview?.businesses, selectedBusinessId],
  );

  const selectedSchedulerRow = useMemo(
    () => overview?.schedulerOverview.find((row) => row.businessId === selectedBusinessId) ?? null,
    [overview?.schedulerOverview, selectedBusinessId],
  );

  async function saveConfig() {
    if (!selectedBusinessId) {
      setError("Select a business first.");
      return;
    }

    setBusyAction("save");
    setError(null);
    setNotice(null);

    try {
      await requestJson("/api/admin/commerce/fulfillment-automation", {
        method: "POST",
        body: JSON.stringify({
          businessId: selectedBusinessId,
          defaultAssigneeUserId: draft.defaultAssigneeUserId || null,
          autoAssignEnabled: draft.autoAssignEnabled,
          autoEscalateEnabled: draft.autoEscalateEnabled,
          scheduleEnabled: draft.scheduleEnabled,
          scheduleIntervalHours: draft.scheduleIntervalHours,
          slaHours: draft.slaHours,
          digestEnabled: draft.digestEnabled,
          digestCadenceHours: draft.digestCadenceHours,
          escalationCooldownHours: draft.escalationCooldownHours,
          escalationEmail: draft.escalationEmail,
          digestEmail: draft.digestEmail,
          customerContactTemplate: draft.customerContactTemplate,
          delayUpdateTemplate: draft.delayUpdateTemplate,
          escalationTemplate: draft.escalationTemplate,
          digestTemplate: draft.digestTemplate,
        }),
      });

      setNotice("Automation profile saved.");
      await loadOverview(selectedBusinessId);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setBusyAction(null);
    }
  }

  async function runAutomation() {
    if (!selectedBusinessId) {
      setError("Select a business first.");
      return;
    }

    setBusyAction("run");
    setError(null);
    setNotice(null);

    try {
      const result = await requestJson<{
        autoAssignedLeadIds: string[];
        dueTargetedLeadIds: string[];
        overdueLeadIds: string[];
        escalationQueued: boolean;
        escalationSkippedReason: string | null;
        digestQueued: boolean;
        digestSkippedReason: string | null;
      }>("/api/admin/commerce/fulfillment-automation/run", {
        method: "POST",
        body: JSON.stringify({
          businessId: selectedBusinessId,
        }),
      });

      setNotice(
        `Automation run complete. Targeted ${result.dueTargetedLeadIds.length} SLA deadlines, auto-assigned ${result.autoAssignedLeadIds.length} leads, found ${result.overdueLeadIds.length} overdue, escalation ${
          result.escalationQueued ? "queued" : result.escalationSkippedReason || "quiet"
        }, digest ${result.digestQueued ? "queued" : result.digestSkippedReason || "quiet"}.`,
      );
      await loadOverview(selectedBusinessId);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : String(runError));
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <section className="space-y-4">
      <div className="admin-card p-4 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] opacity-70">Automation Center</p>
            <h2 className="mt-1 text-2xl font-semibold md:text-3xl">
              Scheduler, digests, SLA rules, and escalation history
            </h2>
            <p className="mt-2 max-w-3xl text-sm opacity-80 md:text-base">
              Turn fulfillment into a self-driving operating layer. Configure per-store schedules,
              auto-assignment, overdue escalation, digest cadence, and review the run and alert
              trail in one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadOverview(selectedBusinessId)}
              disabled={loading || busyAction !== null}
              className="rounded-xl border px-3 py-2 text-sm transition hover:bg-white/5 disabled:opacity-60"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
            <button
              type="button"
              onClick={() => void runAutomation()}
              disabled={busyAction !== null || !selectedBusinessId}
              className="rounded-xl border border-emerald-400/35 bg-emerald-500/10 px-3 py-2 text-sm font-medium transition hover:bg-emerald-500/20 disabled:opacity-60"
            >
              {busyAction === "run" ? "Running..." : "Run Automation Now"}
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <label className="space-y-1 text-sm md:col-span-2">
            <span>Business</span>
            <select
              value={selectedBusinessId}
              onChange={(event) => {
                setSelectedBusinessId(event.target.value);
                void loadOverview(event.target.value);
              }}
              className="admin-surface w-full rounded-xl px-3 py-2"
              disabled={loading}
            >
              {overview?.businesses.length ? null : <option value="">No businesses in scope</option>}
              {(overview?.businesses ?? []).map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name}
                </option>
              ))}
            </select>
          </label>

          <div className="admin-surface rounded-xl px-3 py-3 text-sm">
            <p className="text-xs uppercase tracking-[0.18em] opacity-70">Last run</p>
            <p className="mt-1 font-medium">{localDate(overview?.config?.lastRunAt ?? null)}</p>
          </div>

          <div className="admin-surface rounded-xl px-3 py-3 text-sm">
            <p className="text-xs uppercase tracking-[0.18em] opacity-70">Next scheduler window</p>
            <p className="mt-1 font-medium">{selectedSchedulerRow?.nextRunLabel ?? "Scheduler off"}</p>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="mt-4 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
            {notice}
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <div className="admin-card rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide opacity-70">Scheduled stores</p>
          <p className="mt-1 text-2xl font-semibold">{overview?.networkSummary.scheduledStores ?? 0}</p>
        </div>
        <div className="admin-card rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide opacity-70">Runs due now</p>
          <p className="mt-1 text-2xl font-semibold">{overview?.networkSummary.scheduledDueNow ?? 0}</p>
        </div>
        <div className="admin-card rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide opacity-70">Digest stores</p>
          <p className="mt-1 text-2xl font-semibold">{overview?.networkSummary.digestStores ?? 0}</p>
        </div>
        <div className="admin-card rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide opacity-70">Digests due now</p>
          <p className="mt-1 text-2xl font-semibold">{overview?.networkSummary.digestDueNow ?? 0}</p>
        </div>
        <div className="admin-card rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide opacity-70">Network open leads</p>
          <p className="mt-1 text-2xl font-semibold">{overview?.networkSummary.openLeadCount ?? 0}</p>
        </div>
        <div className="admin-card rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide opacity-70">Network overdue</p>
          <p className="mt-1 text-2xl font-semibold">{overview?.networkSummary.overdueLeadCount ?? 0}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="admin-card rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide opacity-70">Open leads</p>
          <p className="mt-1 text-2xl font-semibold">{summary?.openLeadCount ?? 0}</p>
        </div>
        <div className="admin-card rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide opacity-70">Unassigned</p>
          <p className="mt-1 text-2xl font-semibold">{summary?.unassignedLeadCount ?? 0}</p>
        </div>
        <div className="admin-card rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide opacity-70">Overdue</p>
          <p className="mt-1 text-2xl font-semibold">{summary?.overdueLeadCount ?? 0}</p>
        </div>
        <div className="admin-card rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide opacity-70">Auto-assignable</p>
          <p className="mt-1 text-2xl font-semibold">{summary?.autoAssignableLeadCount ?? 0}</p>
        </div>
        <div className="admin-card rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide opacity-70">Escalation candidates</p>
          <p className="mt-1 text-2xl font-semibold">{summary?.escalationCandidateCount ?? 0}</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="admin-card space-y-4 p-4 md:p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] opacity-70">Rules</p>
            <h3 className="mt-1 text-lg font-semibold">
              {selectedBusiness?.name || "Selected business"} automation profile
            </h3>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span>Default assignee</span>
              <select
                value={draft.defaultAssigneeUserId}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, defaultAssigneeUserId: event.target.value }))
                }
                className="admin-surface w-full rounded-xl px-3 py-2"
              >
                <option value="">No default assignee</option>
                {operators.map((operator) => (
                  <option key={operator.id} value={operator.id}>
                    {operator.name} · {operator.role}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span>Escalation email</span>
              <input
                value={draft.escalationEmail}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, escalationEmail: event.target.value }))
                }
                className="admin-surface w-full rounded-xl px-3 py-2"
                placeholder="ops@example.com"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span>Digest email</span>
              <input
                value={draft.digestEmail}
                onChange={(event) => setDraft((prev) => ({ ...prev, digestEmail: event.target.value }))}
                className="admin-surface w-full rounded-xl px-3 py-2"
                placeholder="digest@example.com"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span>SLA hours</span>
              <input
                value={draft.slaHours}
                onChange={(event) => setDraft((prev) => ({ ...prev, slaHours: event.target.value }))}
                className="admin-surface w-full rounded-xl px-3 py-2"
                inputMode="numeric"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span>Run every (hours)</span>
              <input
                value={draft.scheduleIntervalHours}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, scheduleIntervalHours: event.target.value }))
                }
                className="admin-surface w-full rounded-xl px-3 py-2"
                inputMode="numeric"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span>Digest cadence (hours)</span>
              <input
                value={draft.digestCadenceHours}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, digestCadenceHours: event.target.value }))
                }
                className="admin-surface w-full rounded-xl px-3 py-2"
                inputMode="numeric"
              />
            </label>

            <label className="space-y-1 text-sm md:col-span-2">
              <span>Escalation cooldown (hours)</span>
              <input
                value={draft.escalationCooldownHours}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    escalationCooldownHours: event.target.value,
                  }))
                }
                className="admin-surface w-full rounded-xl px-3 py-2"
                inputMode="numeric"
              />
            </label>
          </div>

          <div className="grid gap-2 rounded-2xl border border-white/10 bg-black/10 p-3 text-sm md:grid-cols-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.autoAssignEnabled}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, autoAssignEnabled: event.target.checked }))
                }
              />
              Auto-assign unowned leads
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.autoEscalateEnabled}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, autoEscalateEnabled: event.target.checked }))
                }
              />
              Auto-escalate overdue queue
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.scheduleEnabled}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, scheduleEnabled: event.target.checked }))
                }
              />
              Enable scheduled runs
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.digestEnabled}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, digestEnabled: event.target.checked }))
                }
              />
              Enable digest cadence
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="admin-surface rounded-xl px-3 py-3 text-sm">
              <p className="text-xs uppercase tracking-[0.18em] opacity-70">Scheduler</p>
              <p className="mt-1 font-medium">{formatFlag(draft.scheduleEnabled)}</p>
              <p className="mt-1 text-xs opacity-70">{selectedSchedulerRow?.nextRunLabel ?? "Scheduler off"}</p>
            </div>
            <div className="admin-surface rounded-xl px-3 py-3 text-sm">
              <p className="text-xs uppercase tracking-[0.18em] opacity-70">Digest</p>
              <p className="mt-1 font-medium">{formatFlag(draft.digestEnabled)}</p>
              <p className="mt-1 text-xs opacity-70">{selectedSchedulerRow?.nextDigestLabel ?? "Digest off"}</p>
            </div>
            <div className="admin-surface rounded-xl px-3 py-3 text-sm">
              <p className="text-xs uppercase tracking-[0.18em] opacity-70">Last digest</p>
              <p className="mt-1 font-medium">{localDate(overview?.config?.lastDigestAt ?? null)}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void saveConfig()}
              disabled={busyAction !== null || !selectedBusinessId}
              className="rounded-xl border border-amber-300/40 bg-amber-200/20 px-3 py-2 text-sm font-medium transition hover:bg-amber-200/30 disabled:opacity-60"
            >
              {busyAction === "save" ? "Saving..." : "Save Automation Profile"}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="admin-card space-y-3 p-4 md:p-5">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] opacity-70">Last run summary</p>
              <h3 className="mt-1 text-lg font-semibold">Automation feedback</h3>
            </div>

            {overview?.config?.lastRunSummary ? (
              <div className="space-y-2 text-sm">
                {Object.entries(overview.config.lastRunSummary).map(([key, value]) => (
                  <div
                    key={key}
                    className="admin-surface flex items-center justify-between gap-3 rounded-xl px-3 py-2"
                  >
                    <span className="opacity-75">{key}</span>
                    <span className="max-w-[60%] text-right font-medium">
                      {stringifyRunValue(value)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-sm opacity-70">
                No automation run has been recorded for this store yet.
              </p>
            )}
          </div>

          <div className="admin-card space-y-3 p-4 md:p-5">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] opacity-70">30-day performance</p>
              <h3 className="mt-1 text-lg font-semibold">Automation health</h3>
            </div>

            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div className="admin-surface rounded-xl px-3 py-2">
                <p className="text-xs uppercase tracking-wide opacity-70">Runs</p>
                <p className="mt-1 text-lg font-semibold">{overview?.performance.runs30d ?? 0}</p>
              </div>
              <div className="admin-surface rounded-xl px-3 py-2">
                <p className="text-xs uppercase tracking-wide opacity-70">Success rate</p>
                <p className="mt-1 text-lg font-semibold">{overview?.performance.successRate30d ?? 0}%</p>
              </div>
              <div className="admin-surface rounded-xl px-3 py-2">
                <p className="text-xs uppercase tracking-wide opacity-70">Scheduled / Manual</p>
                <p className="mt-1 text-lg font-semibold">
                  {overview?.performance.scheduledRuns30d ?? 0} / {overview?.performance.manualRuns30d ?? 0}
                </p>
              </div>
              <div className="admin-surface rounded-xl px-3 py-2">
                <p className="text-xs uppercase tracking-wide opacity-70">Escalations / Digests</p>
                <p className="mt-1 text-lg font-semibold">
                  {overview?.performance.escalationsQueued30d ?? 0} / {overview?.performance.digestsQueued30d ?? 0}
                </p>
              </div>
              <div className="admin-surface rounded-xl px-3 py-2">
                <p className="text-xs uppercase tracking-wide opacity-70">Avg overdue per run</p>
                <p className="mt-1 text-lg font-semibold">{overview?.performance.avgOverdueLeadCount30d ?? 0}</p>
              </div>
              <div className="admin-surface rounded-xl px-3 py-2">
                <p className="text-xs uppercase tracking-wide opacity-70">Avg auto-assigned</p>
                <p className="mt-1 text-lg font-semibold">{overview?.performance.avgAutoAssignedCount30d ?? 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="admin-card space-y-3 p-4 md:p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] opacity-70">Scheduler board</p>
            <h3 className="mt-1 text-lg font-semibold">Store-by-store automation status</h3>
          </div>

          <div className="space-y-2">
            {(overview?.schedulerOverview ?? []).map((row) => (
              <button
                type="button"
                key={row.businessId}
                onClick={() => {
                  setSelectedBusinessId(row.businessId);
                  void loadOverview(row.businessId);
                }}
                className={`w-full rounded-2xl border p-3 text-left transition ${
                  row.businessId === selectedBusinessId
                    ? "border-amber-300/40 bg-amber-200/10"
                    : "border-white/10 bg-black/10 hover:bg-white/5"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{row.businessName}</p>
                    <p className="mt-1 text-xs opacity-70">
                      Scheduler {formatFlag(row.scheduleEnabled)} · Digest {formatFlag(row.digestEnabled)} ·
                      Auto-assign {formatFlag(row.autoAssignEnabled)} · Escalate {formatFlag(row.autoEscalateEnabled)}
                    </p>
                  </div>
                  <div className="text-right text-xs opacity-75">
                    <p>{row.nextRunLabel}</p>
                    <p>{row.nextDigestLabel}</p>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
                  <div className="admin-surface rounded-xl px-3 py-2">
                    <span className="opacity-70">Open</span>
                    <p className="mt-1 text-base font-semibold">{row.summary.openLeadCount}</p>
                  </div>
                  <div className="admin-surface rounded-xl px-3 py-2">
                    <span className="opacity-70">Overdue</span>
                    <p className="mt-1 text-base font-semibold">{row.summary.overdueLeadCount}</p>
                  </div>
                  <div className="admin-surface rounded-xl px-3 py-2">
                    <span className="opacity-70">Last run</span>
                    <p className="mt-1 font-medium">{localDate(row.lastRunAt)}</p>
                  </div>
                  <div className="admin-surface rounded-xl px-3 py-2">
                    <span className="opacity-70">Last digest</span>
                    <p className="mt-1 font-medium">{localDate(row.lastDigestAt)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="admin-card space-y-3 p-4 md:p-5">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] opacity-70">Recent runs</p>
              <h3 className="mt-1 text-lg font-semibold">Execution trail</h3>
            </div>

            {overview?.recentRuns.length ? (
              <div className="space-y-2">
                {overview.recentRuns.map((run) => (
                  <div key={run.id} className="rounded-2xl border border-white/10 bg-black/10 p-3 text-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          {run.source === "SCHEDULED" ? "Scheduled run" : "Manual run"}
                        </p>
                        <p className="mt-1 text-xs opacity-70">
                          {localDate(run.startedAt)} · {run.actorEmail || "system"}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClasses(run.status)}`}>
                        {run.status}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
                      <div className="admin-surface rounded-xl px-3 py-2">
                        <span className="opacity-70">Auto-assigned</span>
                        <p className="mt-1 text-base font-semibold">{run.autoAssignedCount}</p>
                      </div>
                      <div className="admin-surface rounded-xl px-3 py-2">
                        <span className="opacity-70">Overdue</span>
                        <p className="mt-1 text-base font-semibold">{run.overdueLeadCount}</p>
                      </div>
                      <div className="admin-surface rounded-xl px-3 py-2">
                        <span className="opacity-70">Escalation</span>
                        <p className="mt-1 font-medium">{run.escalationQueued ? "Queued" : run.escalationSkippedReason || "Quiet"}</p>
                      </div>
                      <div className="admin-surface rounded-xl px-3 py-2">
                        <span className="opacity-70">Digest</span>
                        <p className="mt-1 font-medium">{run.digestQueued ? "Queued" : run.digestSkippedReason || "Quiet"}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-sm opacity-70">
                No run history yet for this business.
              </p>
            )}
          </div>

          <div className="admin-card space-y-3 p-4 md:p-5">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] opacity-70">Alert history</p>
              <h3 className="mt-1 text-lg font-semibold">Escalations and digests</h3>
            </div>

            {overview?.recentAlerts.length ? (
              <div className="space-y-2">
                {overview.recentAlerts.map((alert) => (
                  <div key={alert.id} className="rounded-2xl border border-white/10 bg-black/10 p-3 text-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          {alert.type === "ESCALATION" ? "Overdue escalation" : "Operations digest"}
                        </p>
                        <p className="mt-1 text-xs opacity-70">
                          {localDate(alert.createdAt)} · {alert.recipientEmail || "No recipient"}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${alertBadgeClasses(alert.status)}`}>
                        {alert.status}
                      </span>
                    </div>
                    <p className="mt-2 text-xs opacity-75">
                      {alert.subject || "No subject"} · Lead count {alert.leadCount}
                    </p>
                    {alert.reason ? <p className="mt-2 text-xs text-amber-100">{alert.reason}</p> : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-sm opacity-70">
                No alerts have been recorded for this business yet.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="admin-card space-y-3 p-4 md:p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] opacity-70">Operator board</p>
            <h3 className="mt-1 text-lg font-semibold">Who is carrying the queue</h3>
          </div>

          {overview?.operatorPerformance.length ? (
            <div className="space-y-2">
              {overview.operatorPerformance.map((operator) => (
                <div
                  key={operator.operatorKey}
                  className="admin-surface flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{operator.operatorName}</p>
                    <p className="mt-1 text-xs opacity-70">
                      {operator.openLeadCount} open · {operator.overdueLeadCount} overdue
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wide opacity-70">Fulfilled 30d</p>
                    <p className="mt-1 text-lg font-semibold">{operator.fulfilledLeadCount}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-sm opacity-70">
              Assigned operator performance will appear once the queue has staffed activity.
            </p>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="admin-card space-y-3 p-4 md:p-5">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] opacity-70">Playbook</p>
              <h3 className="mt-1 text-lg font-semibold">Customer first contact</h3>
            </div>
            <textarea
              value={draft.customerContactTemplate}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, customerContactTemplate: event.target.value }))
              }
              className="admin-surface min-h-[220px] w-full rounded-xl px-3 py-2 text-sm"
            />
            <pre className="whitespace-pre-wrap rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-xs opacity-80">
              {overview?.previews?.customerContact || "Preview unavailable"}
            </pre>
          </label>

          <label className="admin-card space-y-3 p-4 md:p-5">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] opacity-70">Playbook</p>
              <h3 className="mt-1 text-lg font-semibold">Customer delay update</h3>
            </div>
            <textarea
              value={draft.delayUpdateTemplate}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, delayUpdateTemplate: event.target.value }))
              }
              className="admin-surface min-h-[220px] w-full rounded-xl px-3 py-2 text-sm"
            />
            <pre className="whitespace-pre-wrap rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-xs opacity-80">
              {overview?.previews?.delayUpdate || "Preview unavailable"}
            </pre>
          </label>

          <label className="admin-card space-y-3 p-4 md:p-5">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] opacity-70">Playbook</p>
              <h3 className="mt-1 text-lg font-semibold">Overdue escalation</h3>
            </div>
            <textarea
              value={draft.escalationTemplate}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, escalationTemplate: event.target.value }))
              }
              className="admin-surface min-h-[220px] w-full rounded-xl px-3 py-2 text-sm"
            />
            <pre className="whitespace-pre-wrap rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-xs opacity-80">
              {overview?.previews?.escalation || "Preview unavailable"}
            </pre>
          </label>

          <label className="admin-card space-y-3 p-4 md:p-5">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] opacity-70">Playbook</p>
              <h3 className="mt-1 text-lg font-semibold">Operations digest</h3>
            </div>
            <textarea
              value={draft.digestTemplate}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, digestTemplate: event.target.value }))
              }
              className="admin-surface min-h-[220px] w-full rounded-xl px-3 py-2 text-sm"
            />
            <pre className="whitespace-pre-wrap rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-xs opacity-80">
              {overview?.previews?.digest || "Preview unavailable"}
            </pre>
          </label>
        </div>
      </div>
    </section>
  );
}
