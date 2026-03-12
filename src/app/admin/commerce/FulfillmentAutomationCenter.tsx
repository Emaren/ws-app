"use client";

import { useEffect, useMemo, useState } from "react";
import { FulfillmentAutomationConfigPanels } from "./FulfillmentAutomationConfigPanels";
import { FulfillmentAutomationExecutionPanels } from "./FulfillmentAutomationExecutionPanels";
import {
  createDraft,
  localDate,
  type AutomationDraft,
  type AutomationOverviewResponse,
} from "./fulfillmentAutomationTypes";

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
      <FulfillmentAutomationConfigPanels
        selectedBusinessId={selectedBusinessId}
        selectedBusiness={selectedBusiness}
        selectedSchedulerRow={selectedSchedulerRow}
        operators={operators}
        draft={draft}
        setDraft={setDraft}
        busyAction={busyAction}
        onSaveConfig={saveConfig}
        lastDigestAt={overview?.config?.lastDigestAt ?? null}
        lastRunSummary={overview?.config?.lastRunSummary ?? null}
        performance={overview?.performance ?? null}
        operatorPerformance={overview?.operatorPerformance ?? []}
        previews={overview?.previews ?? null}
      />

      <FulfillmentAutomationExecutionPanels
        schedulerOverview={overview?.schedulerOverview ?? []}
        selectedBusinessId={selectedBusinessId}
        onSelectBusiness={(businessId) => {
          setSelectedBusinessId(businessId);
          return loadOverview(businessId);
        }}
        recentRuns={overview?.recentRuns ?? []}
        recentAlerts={overview?.recentAlerts ?? []}
      />
    </section>
  );
}
