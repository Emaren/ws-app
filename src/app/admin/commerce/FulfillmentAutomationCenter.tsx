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
  slaHours: number;
  escalationCooldownHours: number;
  escalationEmail: string | null;
  customerContactTemplate: string;
  delayUpdateTemplate: string;
  escalationTemplate: string;
  lastRunAt: string | null;
  lastEscalationAt: string | null;
  lastRunSummary: Record<string, unknown> | null;
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
  } | null;
};

type AutomationDraft = {
  businessId: string;
  defaultAssigneeUserId: string;
  autoAssignEnabled: boolean;
  autoEscalateEnabled: boolean;
  slaHours: string;
  escalationCooldownHours: string;
  escalationEmail: string;
  customerContactTemplate: string;
  delayUpdateTemplate: string;
  escalationTemplate: string;
};

function createDraft(config: AutomationConfig | null, businessId: string): AutomationDraft {
  return {
    businessId,
    defaultAssigneeUserId: config?.defaultAssigneeUserId ?? "",
    autoAssignEnabled: config?.autoAssignEnabled ?? false,
    autoEscalateEnabled: config?.autoEscalateEnabled ?? false,
    slaHours: String(config?.slaHours ?? 24),
    escalationCooldownHours: String(config?.escalationCooldownHours ?? 6),
    escalationEmail: config?.escalationEmail ?? "",
    customerContactTemplate: config?.customerContactTemplate ?? "",
    delayUpdateTemplate: config?.delayUpdateTemplate ?? "",
    escalationTemplate: config?.escalationTemplate ?? "",
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
          slaHours: draft.slaHours,
          escalationCooldownHours: draft.escalationCooldownHours,
          escalationEmail: draft.escalationEmail,
          customerContactTemplate: draft.customerContactTemplate,
          delayUpdateTemplate: draft.delayUpdateTemplate,
          escalationTemplate: draft.escalationTemplate,
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
        overdueLeadIds: string[];
        escalationQueued: boolean;
        escalationSkippedReason: string | null;
      }>("/api/admin/commerce/fulfillment-automation/run", {
        method: "POST",
        body: JSON.stringify({
          businessId: selectedBusinessId,
        }),
      });

      setNotice(
        `Automation run complete. Auto-assigned ${result.autoAssignedLeadIds.length} leads, found ${result.overdueLeadIds.length} overdue, escalation ${
          result.escalationQueued ? "queued" : result.escalationSkippedReason || "not queued"
        }.`,
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
              SLA rules, saved playbooks, and escalation runs
            </h2>
            <p className="mt-2 max-w-3xl text-sm opacity-80 md:text-base">
              Configure per-store fulfillment rules, save reusable customer and escalation playbooks,
              and run the automation layer that assigns owners and pushes overdue alerts into the
              notification queue.
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
            <p className="text-xs uppercase tracking-[0.18em] opacity-70">Last escalation</p>
            <p className="mt-1 font-medium">{localDate(overview?.config?.lastEscalationAt ?? null)}</p>
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

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
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
              <span>SLA hours</span>
              <input
                value={draft.slaHours}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, slaHours: event.target.value }))
                }
                className="admin-surface w-full rounded-xl px-3 py-2"
                inputMode="numeric"
              />
            </label>

            <label className="space-y-1 text-sm">
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

          <div className="flex flex-wrap gap-4 text-sm">
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
                  className="admin-surface flex items-center justify-between rounded-xl px-3 py-2"
                >
                  <span className="opacity-75">{key}</span>
                  <span className="font-medium text-right">{String(value)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-sm opacity-70">
              No automation run has been recorded for this store yet.
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
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
      </div>
    </section>
  );
}
