import {
  alertBadgeClasses,
  formatFlag,
  localDate,
  statusBadgeClasses,
  type SchedulerOverviewRecord,
  type RecentAlertRecord,
  type RecentRunRecord,
} from "./fulfillmentAutomationTypes";

type FulfillmentAutomationExecutionPanelsProps = {
  schedulerOverview: SchedulerOverviewRecord[];
  selectedBusinessId: string;
  onSelectBusiness: (businessId: string) => void | Promise<void>;
  recentRuns: RecentRunRecord[];
  recentAlerts: RecentAlertRecord[];
};

export function FulfillmentAutomationExecutionPanels({
  schedulerOverview,
  selectedBusinessId,
  onSelectBusiness,
  recentRuns,
  recentAlerts,
}: FulfillmentAutomationExecutionPanelsProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
      <div className="admin-card min-w-0 space-y-3 p-4 md:p-5">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] opacity-70">Scheduler board</p>
          <h3 className="mt-1 text-lg font-semibold">Store-by-store automation status</h3>
        </div>

        <div className="space-y-2">
          {schedulerOverview.map((row) => (
            <button
              type="button"
              key={row.businessId}
              onClick={() => void onSelectBusiness(row.businessId)}
              className={`w-full rounded-2xl border p-3 text-left transition ${
                row.businessId === selectedBusinessId
                  ? "border-amber-300/40 bg-amber-200/10"
                  : "border-white/10 bg-black/10 hover:bg-white/5"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium break-words">{row.businessName}</p>
                  <p className="mt-1 text-xs opacity-70 break-words">
                    Scheduler {formatFlag(row.scheduleEnabled)} · Digest{" "}
                    {formatFlag(row.digestEnabled)} · Auto-assign{" "}
                    {formatFlag(row.autoAssignEnabled)} · Escalate{" "}
                    {formatFlag(row.autoEscalateEnabled)}
                  </p>
                </div>
                <div className="text-right text-xs opacity-75">
                  <p className="break-words">{row.nextRunLabel}</p>
                  <p className="break-words">{row.nextDigestLabel}</p>
                </div>
              </div>

              <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2 xl:grid-cols-4">
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
                  <p className="mt-1 break-words font-medium">{localDate(row.lastRunAt)}</p>
                </div>
                <div className="admin-surface rounded-xl px-3 py-2">
                  <span className="opacity-70">Last digest</span>
                  <p className="mt-1 break-words font-medium">{localDate(row.lastDigestAt)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="admin-card min-w-0 space-y-3 p-4 md:p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] opacity-70">Recent runs</p>
            <h3 className="mt-1 text-lg font-semibold">Execution trail</h3>
          </div>

          {recentRuns.length ? (
            <div className="space-y-2">
              {recentRuns.map((run) => (
                <div key={run.id} className="rounded-2xl border border-white/10 bg-black/10 p-3 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {run.source === "SCHEDULED" ? "Scheduled run" : "Manual run"}
                      </p>
                      <p className="mt-1 text-xs opacity-70 break-words">
                        {localDate(run.startedAt)} · {run.actorEmail || "system"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClasses(run.status)}`}
                    >
                      {run.status}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2 xl:grid-cols-4">
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
                      <p className="mt-1 break-words font-medium">
                        {run.escalationQueued ? "Queued" : run.escalationSkippedReason || "Quiet"}
                      </p>
                    </div>
                    <div className="admin-surface rounded-xl px-3 py-2">
                      <span className="opacity-70">Digest</span>
                      <p className="mt-1 break-words font-medium">
                        {run.digestQueued ? "Queued" : run.digestSkippedReason || "Quiet"}
                      </p>
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

        <div className="admin-card min-w-0 space-y-3 p-4 md:p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] opacity-70">Alert history</p>
            <h3 className="mt-1 text-lg font-semibold">Escalations and digests</h3>
          </div>

          {recentAlerts.length ? (
            <div className="space-y-2">
              {recentAlerts.map((alert) => (
                <div key={alert.id} className="rounded-2xl border border-white/10 bg-black/10 p-3 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {alert.type === "ESCALATION"
                          ? "Overdue escalation"
                          : "Operations digest"}
                      </p>
                      <p className="mt-1 text-xs opacity-70 break-words">
                        {localDate(alert.createdAt)} · {alert.recipientEmail || "No recipient"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${alertBadgeClasses(alert.status)}`}
                    >
                      {alert.status}
                    </span>
                  </div>
                  <p className="mt-2 break-words text-xs opacity-75">
                    {alert.subject || "No subject"} · Lead count {alert.leadCount}
                  </p>
                  {alert.reason ? (
                    <p className="mt-2 break-words text-xs text-amber-100">{alert.reason}</p>
                  ) : null}
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
  );
}
