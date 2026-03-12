import type { Dispatch, SetStateAction } from "react";
import {
  formatFlag,
  localDate,
  stringifyRunValue,
  type AutomationDraft,
  type AutomationOverviewResponse,
  type BusinessRecord,
  type OperatorRecord,
  type SchedulerOverviewRecord,
} from "./fulfillmentAutomationTypes";

type FulfillmentAutomationConfigPanelsProps = {
  selectedBusinessId: string;
  selectedBusiness: BusinessRecord | null;
  selectedSchedulerRow: SchedulerOverviewRecord | null;
  operators: OperatorRecord[];
  draft: AutomationDraft;
  setDraft: Dispatch<SetStateAction<AutomationDraft>>;
  busyAction: string | null;
  onSaveConfig: () => void | Promise<void>;
  lastDigestAt: string | null;
  lastRunSummary: Record<string, unknown> | null;
  performance: AutomationOverviewResponse["performance"] | null;
  operatorPerformance: AutomationOverviewResponse["operatorPerformance"];
  previews: AutomationOverviewResponse["previews"] | null;
};

export function FulfillmentAutomationConfigPanels({
  selectedBusinessId,
  selectedBusiness,
  selectedSchedulerRow,
  operators,
  draft,
  setDraft,
  busyAction,
  onSaveConfig,
  lastDigestAt,
  lastRunSummary,
  performance,
  operatorPerformance,
  previews,
}: FulfillmentAutomationConfigPanelsProps) {
  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="admin-card min-w-0 space-y-4 p-4 md:p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] opacity-70">Rules</p>
            <h3 className="mt-1 text-lg font-semibold break-words">
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
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, digestEmail: event.target.value }))
                }
                className="admin-surface w-full rounded-xl px-3 py-2"
                placeholder="digest@example.com"
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

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="admin-surface min-w-0 rounded-xl px-3 py-3 text-sm">
              <p className="text-xs uppercase tracking-[0.18em] opacity-70">Scheduler</p>
              <p className="mt-1 font-medium">{formatFlag(draft.scheduleEnabled)}</p>
              <p className="mt-1 text-xs opacity-70 break-words">
                {selectedSchedulerRow?.nextRunLabel ?? "Scheduler off"}
              </p>
            </div>
            <div className="admin-surface min-w-0 rounded-xl px-3 py-3 text-sm">
              <p className="text-xs uppercase tracking-[0.18em] opacity-70">Digest</p>
              <p className="mt-1 font-medium">{formatFlag(draft.digestEnabled)}</p>
              <p className="mt-1 text-xs opacity-70 break-words">
                {selectedSchedulerRow?.nextDigestLabel ?? "Digest off"}
              </p>
            </div>
            <div className="admin-surface min-w-0 rounded-xl px-3 py-3 text-sm">
              <p className="text-xs uppercase tracking-[0.18em] opacity-70">Last digest</p>
              <p className="mt-1 font-medium break-words">{localDate(lastDigestAt)}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void onSaveConfig()}
              disabled={busyAction !== null || !selectedBusinessId}
              className="rounded-xl border border-amber-300/40 bg-amber-200/20 px-3 py-2 text-sm font-medium transition hover:bg-amber-200/30 disabled:opacity-60"
            >
              {busyAction === "save" ? "Saving..." : "Save Automation Profile"}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="admin-card min-w-0 space-y-3 p-4 md:p-5">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] opacity-70">Last run summary</p>
              <h3 className="mt-1 text-lg font-semibold">Automation feedback</h3>
            </div>

            {lastRunSummary ? (
              <div className="space-y-2 text-sm">
                {Object.entries(lastRunSummary).map(([key, value]) => (
                  <div
                    key={key}
                    className="admin-surface flex items-center justify-between gap-3 rounded-xl px-3 py-2"
                  >
                    <span className="opacity-75 break-words">{key}</span>
                    <span className="max-w-[60%] break-words text-right font-medium">
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

          <div className="admin-card min-w-0 space-y-3 p-4 md:p-5">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] opacity-70">30-day performance</p>
              <h3 className="mt-1 text-lg font-semibold">Automation health</h3>
            </div>

            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div className="admin-surface rounded-xl px-3 py-2">
                <p className="text-xs uppercase tracking-wide opacity-70">Runs</p>
                <p className="mt-1 text-lg font-semibold">{performance?.runs30d ?? 0}</p>
              </div>
              <div className="admin-surface rounded-xl px-3 py-2">
                <p className="text-xs uppercase tracking-wide opacity-70">Success rate</p>
                <p className="mt-1 text-lg font-semibold">{performance?.successRate30d ?? 0}%</p>
              </div>
              <div className="admin-surface rounded-xl px-3 py-2">
                <p className="text-xs uppercase tracking-wide opacity-70">Scheduled / Manual</p>
                <p className="mt-1 text-lg font-semibold">
                  {performance?.scheduledRuns30d ?? 0} / {performance?.manualRuns30d ?? 0}
                </p>
              </div>
              <div className="admin-surface rounded-xl px-3 py-2">
                <p className="text-xs uppercase tracking-wide opacity-70">Escalations / Digests</p>
                <p className="mt-1 text-lg font-semibold">
                  {performance?.escalationsQueued30d ?? 0} / {performance?.digestsQueued30d ?? 0}
                </p>
              </div>
              <div className="admin-surface rounded-xl px-3 py-2">
                <p className="text-xs uppercase tracking-wide opacity-70">Avg overdue per run</p>
                <p className="mt-1 text-lg font-semibold">
                  {performance?.avgOverdueLeadCount30d ?? 0}
                </p>
              </div>
              <div className="admin-surface rounded-xl px-3 py-2">
                <p className="text-xs uppercase tracking-wide opacity-70">Avg auto-assigned</p>
                <p className="mt-1 text-lg font-semibold">
                  {performance?.avgAutoAssignedCount30d ?? 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="admin-card min-w-0 space-y-3 p-4 md:p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] opacity-70">Operator board</p>
            <h3 className="mt-1 text-lg font-semibold">Who is carrying the queue</h3>
          </div>

          {operatorPerformance.length ? (
            <div className="space-y-2">
              {operatorPerformance.map((operator) => (
                <div
                  key={operator.operatorKey}
                  className="admin-surface flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium break-words">{operator.operatorName}</p>
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
          <label className="admin-card min-w-0 space-y-3 p-4 md:p-5">
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
            <pre className="whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-xs opacity-80">
              {previews?.customerContact || "Preview unavailable"}
            </pre>
          </label>

          <label className="admin-card min-w-0 space-y-3 p-4 md:p-5">
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
            <pre className="whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-xs opacity-80">
              {previews?.delayUpdate || "Preview unavailable"}
            </pre>
          </label>

          <label className="admin-card min-w-0 space-y-3 p-4 md:p-5">
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
            <pre className="whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-xs opacity-80">
              {previews?.escalation || "Preview unavailable"}
            </pre>
          </label>

          <label className="admin-card min-w-0 space-y-3 p-4 md:p-5">
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
            <pre className="whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-xs opacity-80">
              {previews?.digest || "Preview unavailable"}
            </pre>
          </label>
        </div>
      </div>
    </>
  );
}
