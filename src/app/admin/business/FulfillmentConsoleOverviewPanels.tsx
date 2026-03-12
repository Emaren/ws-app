import {
  formatStatusLabel,
  type BusinessRecord,
  type DeliveryLeadStatus,
  type LeadStats,
  type WorkflowFilter,
} from "./fulfillmentConsoleSupport";

type FulfillmentConsoleOverviewPanelsProps = {
  title: string;
  summary: string;
  loading: boolean;
  busyAction: string | null;
  businesses: BusinessRecord[];
  selectedBusinessId: string;
  statusFilter: "" | DeliveryLeadStatus;
  workflowFilter: WorkflowFilter;
  searchQuery: string;
  leadStats: LeadStats;
  error: string | null;
  notice: string | null;
  leadStatuses: readonly DeliveryLeadStatus[];
  onRefresh: () => void;
  onBusinessChange: (businessId: string) => void;
  onStatusFilterChange: (status: "" | DeliveryLeadStatus) => void;
  onWorkflowFilterChange: (filter: WorkflowFilter) => void;
  onSearchQueryChange: (value: string) => void;
};

export function FulfillmentConsoleOverviewPanels({
  title,
  summary,
  loading,
  busyAction,
  businesses,
  selectedBusinessId,
  statusFilter,
  workflowFilter,
  searchQuery,
  leadStats,
  error,
  notice,
  leadStatuses,
  onRefresh,
  onBusinessChange,
  onStatusFilterChange,
  onWorkflowFilterChange,
  onSearchQueryChange,
}: FulfillmentConsoleOverviewPanelsProps) {
  return (
    <>
      <div className="admin-card p-4 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold md:text-2xl">{title}</h2>
            <p className="mt-1 text-sm opacity-75">{summary}</p>
          </div>

          <button
            type="button"
            onClick={onRefresh}
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
              onChange={(event) => onBusinessChange(event.target.value)}
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
                onStatusFilterChange(event.target.value as "" | DeliveryLeadStatus)
              }
              className="admin-surface w-full rounded-xl px-3 py-2"
            >
              <option value="">All statuses</option>
              {leadStatuses.map((status) => (
                <option key={status} value={status}>
                  {formatStatusLabel(status)}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span>Workflow</span>
            <select
              value={workflowFilter}
              onChange={(event) => onWorkflowFilterChange(event.target.value as WorkflowFilter)}
              className="admin-surface w-full rounded-xl px-3 py-2"
            >
              <option value="ALL">All queues</option>
              <option value="UNASSIGNED">Unassigned</option>
              <option value="MINE">Assigned to me</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span>Search customer/item/address</span>
            <input
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="admin-card rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide opacity-70">Open leads</p>
          <p className="mt-1 text-2xl font-semibold">
            {leadStats.newCount + leadStats.contactedCount + leadStats.reservedCount}
          </p>
        </div>
        <div className="admin-card rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide opacity-70">Unassigned</p>
          <p className="mt-1 text-2xl font-semibold">{leadStats.unassignedCount}</p>
        </div>
        <div className="admin-card rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide opacity-70">Overdue</p>
          <p className="mt-1 text-2xl font-semibold">{leadStats.overdueCount}</p>
        </div>
        <div className="admin-card rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide opacity-70">Fulfilled</p>
          <p className="mt-1 text-2xl font-semibold">{leadStats.fulfilledCount}</p>
        </div>
        <div className="admin-card rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide opacity-70">My queue / Cancelled / Expired</p>
          <p className="mt-1 text-2xl font-semibold">
            {leadStats.mineCount} / {leadStats.cancelledCount + leadStats.expiredCount}
          </p>
        </div>
      </div>
    </>
  );
}
