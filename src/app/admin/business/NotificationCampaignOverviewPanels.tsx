import type {
  BusinessRecord,
  NotificationJobStats,
} from "./notificationCampaignSupport";

type NotificationCampaignOverviewPanelsProps = {
  businesses: BusinessRecord[];
  selectedBusinessId: string;
  loadingBusinesses: boolean;
  loadingHistory: boolean;
  busyAction: string | null;
  error: string | null;
  notice: string | null;
  jobStats: NotificationJobStats;
  onSelectBusiness: (businessId: string) => void;
  onReload: () => void | Promise<void>;
};

export function NotificationCampaignOverviewPanels({
  businesses,
  selectedBusinessId,
  loadingBusinesses,
  loadingHistory,
  busyAction,
  error,
  notice,
  jobStats,
  onSelectBusiness,
  onReload,
}: NotificationCampaignOverviewPanelsProps) {
  return (
    <>
      <div className="admin-card p-4 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold md:text-2xl">
              Campaign Composer and Delivery History
            </h2>
            <p className="mt-1 text-sm opacity-75">
              Build send-now or scheduled notifications with channel targeting and full delivery
              trace.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={selectedBusinessId}
              onChange={(event) => onSelectBusiness(event.target.value)}
              className="admin-surface rounded-xl px-3 py-2 text-sm"
              disabled={loadingBusinesses || businesses.length === 0}
            >
              {businesses.length === 0 ? <option value="">No businesses found</option> : null}
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name} ({business.status})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void onReload()}
              className="rounded-xl border px-3 py-2 text-sm transition hover:bg-white/5 disabled:opacity-60"
              disabled={busyAction !== null || loadingBusinesses || loadingHistory}
            >
              {loadingBusinesses || loadingHistory ? "Loading..." : "Reload"}
            </button>
          </div>
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

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="admin-card rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide opacity-70">Queued</p>
          <p className="mt-1 text-2xl font-semibold">{jobStats.queued}</p>
        </div>
        <div className="admin-card rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide opacity-70">In Flight</p>
          <p className="mt-1 text-2xl font-semibold">
            {jobStats.processing + jobStats.retrying}
          </p>
        </div>
        <div className="admin-card rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide opacity-70">Delivered / Failed</p>
          <p className="mt-1 text-2xl font-semibold">
            {jobStats.sent} / {jobStats.failed}
          </p>
        </div>
      </div>
    </>
  );
}
