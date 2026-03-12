import {
  formatStatus,
  statusBadgeClasses,
  stringifyDetail,
  type BusinessRecord,
  type HistoryFilterState,
  type NotificationAuditLogRecord,
  type NotificationChannel,
  type NotificationJobRecord,
} from "./notificationCampaignSupport";

type NotificationCampaignHistoryPanelsProps = {
  businesses: BusinessRecord[];
  jobs: NotificationJobRecord[];
  jobAudit: NotificationAuditLogRecord[];
  selectedJobId: string | null;
  loadingHistory: boolean;
  loadingAudit: boolean;
  busyAction: string | null;
  historyFilter: HistoryFilterState;
  onHistoryFilterChange: (next: HistoryFilterState) => void;
  onRefreshHistory: () => void | Promise<void>;
  onLoadJobAudit: (jobId: string) => void | Promise<void>;
  onRetryJob: (jobId: string) => void | Promise<void>;
};

export function NotificationCampaignHistoryPanels({
  businesses,
  jobs,
  jobAudit,
  selectedJobId,
  loadingHistory,
  loadingAudit,
  busyAction,
  historyFilter,
  onHistoryFilterChange,
  onRefreshHistory,
  onLoadJobAudit,
  onRetryJob,
}: NotificationCampaignHistoryPanelsProps) {
  const businessById = new Map(businesses.map((business) => [business.id, business]));

  return (
    <>
      <div className="admin-card space-y-4 p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold">Delivery History</h3>
          <button
            type="button"
            onClick={() => void onRefreshHistory()}
            disabled={loadingHistory || busyAction !== null}
            className="rounded-xl border px-3 py-1.5 text-xs transition hover:bg-white/5 disabled:opacity-60"
          >
            {loadingHistory ? "Loading..." : "Refresh"}
          </button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span>Status filter</span>
            <select
              value={historyFilter.status}
              onChange={(event) =>
                onHistoryFilterChange({
                  ...historyFilter,
                  status: event.target.value as HistoryFilterState["status"],
                })
              }
              className="admin-surface w-full rounded-xl px-3 py-2"
            >
              <option value="">All statuses</option>
              <option value="queued">Queued</option>
              <option value="processing">Processing</option>
              <option value="retrying">Retrying</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span>Channel filter</span>
            <select
              value={historyFilter.channel}
              onChange={(event) =>
                onHistoryFilterChange({
                  ...historyFilter,
                  channel: event.target.value as "" | NotificationChannel,
                })
              }
              className="admin-surface w-full rounded-xl px-3 py-2"
            >
              <option value="">All channels</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="push">Push</option>
            </select>
          </label>
        </div>

        {jobs.length === 0 ? (
          <p className="text-sm opacity-70">No delivery jobs found for this filter.</p>
        ) : (
          <ul className="space-y-3 max-h-[420px] overflow-auto pr-1">
            {jobs.map((job) => {
              const businessName = businessById.get(job.businessId)?.name ?? job.businessId;
              const campaignName =
                typeof job.metadata?.campaignName === "string"
                  ? job.metadata.campaignName
                  : job.subject || "Untitled campaign";

              return (
                <li
                  key={job.id}
                  className={`admin-surface rounded-xl p-3 ${
                    selectedJobId === job.id ? "ring-1 ring-amber-300/60" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{campaignName}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${statusBadgeClasses(job.status)}`}
                    >
                      {formatStatus(job.status)}
                    </span>
                  </div>

                  <p className="mt-1 text-xs opacity-75">
                    {businessName} · {job.channel.toUpperCase()} · audience {job.audience}
                  </p>
                  <p className="mt-1 text-xs opacity-70">
                    Attempts {job.attempts}/{job.maxAttempts} · Created{" "}
                    {new Date(job.createdAt).toLocaleString()}
                  </p>

                  {job.lastError ? (
                    <p className="mt-1 text-xs text-red-300/90">Last error: {job.lastError}</p>
                  ) : null}

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => void onLoadJobAudit(job.id)}
                      className="rounded-lg border px-2 py-1.5 text-xs transition hover:bg-white/5"
                    >
                      {loadingAudit && selectedJobId === job.id ? "Loading..." : "View Audit"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void onRetryJob(job.id)}
                      disabled={busyAction === `retry-${job.id}` || job.status === "sent"}
                      className="rounded-lg border px-2 py-1.5 text-xs transition hover:bg-white/5 disabled:opacity-60"
                    >
                      {busyAction === `retry-${job.id}` ? "Retrying..." : "Retry"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="admin-card space-y-3 p-4 md:p-5">
        <h3 className="text-base font-semibold">Selected Delivery Timeline</h3>

        {!selectedJobId ? (
          <p className="text-sm opacity-70">
            Pick a delivery from history to inspect provider attempts and retries.
          </p>
        ) : jobAudit.length === 0 ? (
          <p className="text-sm opacity-70">No audit entries for this delivery yet.</p>
        ) : (
          <ul className="space-y-2">
            {jobAudit.map((entry) => (
              <li key={entry.id} className="admin-surface rounded-xl p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{entry.event.replace(/_/g, " ").toUpperCase()}</p>
                  <span className="text-xs opacity-70">
                    {new Date(entry.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 text-xs opacity-80">
                  {entry.channel.toUpperCase()} · provider {entry.provider ?? "-"}
                  {entry.attempt !== null ? ` · attempt ${entry.attempt}` : ""}
                </p>
                <p className="mt-1 text-xs opacity-85">{entry.message}</p>
                {entry.detail ? (
                  <p className="mt-1 text-xs opacity-70">{stringifyDetail(entry.detail)}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
