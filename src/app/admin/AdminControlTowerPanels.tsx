import type { PublicSurfaceProbeHistory, SystemSnapshot } from "./adminDashboardTypes";
import { AdminGrowthVisibilityPanels } from "./AdminGrowthVisibilityPanels";
import { AdminOperationsCommandPanels } from "./AdminOperationsCommandPanels";
import { AdminPlatformIntegrityPanels } from "./AdminPlatformIntegrityPanels";
import {
  feedBadgeClass,
  formatDateTime,
  formatWsApiStorageBackend,
  identityStatusLabel,
  identityStatusTone,
  WS_API_STORAGE_MODULES,
  wsApiContractParityLabel,
  wsApiContractParityTone,
  wsApiStorageTone,
} from "./adminDashboardPresentation";

type AdminControlTowerPanelsProps = {
  systemSnapshot: SystemSnapshot;
  publicProbeHistoryLoading: boolean;
  publicProbeHistory: PublicSurfaceProbeHistory | null;
  publicProbeError: string | null;
  publicProbeRunBusy: boolean;
  healthCheckBusy: boolean;
  healthCheckNote: string | null;
  recrawlActionNote: string | null;
  onNavigate: (href: string) => void;
  onRunPublicProbeNow: () => void | Promise<void>;
  onRunSystemHealthCheck: () => void | Promise<void>;
  onOpenFreshXCardUrl: () => void;
  onCopyFreshXCardUrl: () => void | Promise<void>;
};

export function AdminControlTowerPanels({
  systemSnapshot,
  publicProbeHistoryLoading,
  publicProbeHistory,
  publicProbeError,
  publicProbeRunBusy,
  healthCheckBusy,
  healthCheckNote,
  recrawlActionNote,
  onNavigate,
  onRunPublicProbeNow,
  onRunSystemHealthCheck,
  onOpenFreshXCardUrl,
  onCopyFreshXCardUrl,
}: AdminControlTowerPanelsProps) {
  return (
    <>
      <div className="rounded-lg border border-white/10 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">WS-API Status</p>
          <span
            className={
              systemSnapshot.wsApi.available
                ? "rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300"
                : "rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-200"
            }
          >
            {systemSnapshot.wsApi.available ? "Connected" : "Not connected"}
          </span>
        </div>
        <p className="mt-1 text-xs opacity-80">
          Access token: {systemSnapshot.wsApi.hasAccessToken ? "present" : "missing"} · WS users:{" "}
          {systemSnapshot.wsApi.usersCount ?? "n/a"} · Health users:{" "}
          {systemSnapshot.wsApi.healthUsersCount ?? "n/a"}
        </p>
        <p className="mt-1 text-xs opacity-80">
          Health probe:{" "}
          <span className="font-semibold">
            {systemSnapshot.wsApi.healthReachable ? "reachable" : "unreachable"}
          </span>{" "}
          · Users backend:{" "}
          <span className="font-semibold">{systemSnapshot.wsApi.usersRepository ?? "unknown"}</span>
        </p>
        <p className="mt-1 text-xs opacity-80">
          Durability:{" "}
          <span className="font-semibold">
            {systemSnapshot.wsApi.durability?.durableModules ?? "n/a"} /{" "}
            {systemSnapshot.wsApi.durability?.totalModules ?? "n/a"} modules durable
          </span>{" "}
          · volatile {systemSnapshot.wsApi.durability?.volatileModules ?? "n/a"} · journal{" "}
          {systemSnapshot.wsApi.durability?.journalConfigured ? "on" : "off"}
        </p>
        <p className="mt-1 text-xs opacity-80">
          Contract:{" "}
          <span className="font-semibold">{systemSnapshot.wsApi.contract?.version ?? "n/a"}</span> ·
          generated {formatDateTime(systemSnapshot.wsApi.contract?.generatedAt)}
        </p>
        <p className="mt-1 text-xs opacity-80">
          Contract-backed adoption:{" "}
          <span className="font-semibold">
            {systemSnapshot.wsApi.sharedClientCoverage.routeCount} contract-backed routes
          </span>{" "}
          across {systemSnapshot.wsApi.sharedClientCoverage.surfaceCount} admin surfaces
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className={feedBadgeClass(
              wsApiContractParityTone(systemSnapshot.wsApi.contractParity.status),
            )}
          >
            {wsApiContractParityLabel(systemSnapshot.wsApi.contractParity.status)}
          </span>
          <span className="text-xs opacity-70">
            Live {systemSnapshot.wsApi.contractParity.liveVersion ?? "unknown"} /{" "}
            {systemSnapshot.wsApi.contractParity.liveRouteCount ?? "n/a"} routes vs expected{" "}
            {systemSnapshot.wsApi.contractParity.expectedVersion} /{" "}
            {systemSnapshot.wsApi.contractParity.expectedRouteCount}
          </span>
        </div>
        <p className="mt-1 text-xs opacity-70">
          Contract-backed surfaces: {systemSnapshot.wsApi.sharedClientCoverage.surfaces.join(", ")}
        </p>
        {systemSnapshot.wsApi.durability?.journalConfigured === false ? (
          <p className="mt-1 rounded border border-amber-300/35 bg-amber-300/10 px-2 py-1 text-xs text-amber-100">
            WS-API is running without its shared journal file. Most non-user state can reset after a
            restart.
          </p>
        ) : null}
        {systemSnapshot.wsApi.usersRepository === "memory" ? (
          <p className="mt-1 rounded border border-amber-300/35 bg-amber-300/10 px-2 py-1 text-xs text-amber-100">
            WS-API is running with in-memory user storage. Logins and registrations can drift from
            main DB after restarts.
          </p>
        ) : null}
        <div className="mt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] opacity-60">
              Storage Map
            </p>
            <span className="text-[11px] opacity-60">
              Postgres is strongest, file journal is durable on one box, memory is volatile.
            </span>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {WS_API_STORAGE_MODULES.map((module) => (
              <article key={module.key} className="rounded-lg border border-white/10 bg-black/20 p-2.5">
                <p className="text-[11px] uppercase tracking-wide opacity-60">{module.label}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className={feedBadgeClass(wsApiStorageTone(systemSnapshot.wsApi.storage[module.key]))}>
                    {formatWsApiStorageBackend(systemSnapshot.wsApi.storage[module.key])}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
        {systemSnapshot.wsApi.error ? (
          <p className="mt-1 text-xs text-rose-300">{systemSnapshot.wsApi.error}</p>
        ) : null}
        {systemSnapshot.wsApi.healthError ? (
          <p className="mt-1 text-xs text-rose-300">{systemSnapshot.wsApi.healthError}</p>
        ) : null}
      </div>

      <div className="rounded-lg border border-white/10 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">Identity Command Center</p>
            <p className="text-xs opacity-75">
              Live parity between the app database and ws-api so you can spot auth drift fast.
            </p>
          </div>
          <span
            className={feedBadgeClass(
              systemSnapshot.identity.live.available
                ? systemSnapshot.identity.live.summary &&
                    systemSnapshot.identity.live.summary.roleMismatches +
                      systemSnapshot.identity.live.summary.localOnly +
                      systemSnapshot.identity.live.summary.wsApiOnly >
                    0
                  ? "warn"
                  : "good"
                : "info",
            )}
          >
            {systemSnapshot.identity.live.available
              ? systemSnapshot.identity.live.summary &&
                  systemSnapshot.identity.live.summary.roleMismatches +
                    systemSnapshot.identity.live.summary.localOnly +
                    systemSnapshot.identity.live.summary.wsApiOnly >
                  0
                ? "drift detected"
                : "in sync"
              : "live scan unavailable"}
          </span>
        </div>
        <p className="mt-1 text-xs opacity-80">
          Local users: <span className="font-semibold">{systemSnapshot.identity.live.localUsersCount}</span>{" "}
          · WS-API users:{" "}
          <span className="font-semibold">{systemSnapshot.identity.live.wsApiUsersCount ?? "n/a"}</span> ·
          Access token:{" "}
          <span className="font-semibold">
            {systemSnapshot.identity.live.accessTokenPresent ? "present" : "missing"}
          </span>
        </p>
        <p className="mt-1 text-xs opacity-80">
          Live compared at{" "}
          <span className="font-semibold">{formatDateTime(systemSnapshot.identity.live.generatedAt)}</span>
        </p>
        {systemSnapshot.identity.live.error ? (
          <p className="mt-2 rounded border border-amber-300/35 bg-amber-300/10 px-2 py-1 text-xs text-amber-100">
            {systemSnapshot.identity.live.error}
          </p>
        ) : null}
        {systemSnapshot.identity.live.summary ? (
          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-5">
            <article className="rounded-lg border border-white/10 p-2.5">
              <p className="text-[11px] uppercase tracking-wide opacity-70">Compared</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {systemSnapshot.identity.live.summary.total}
              </p>
            </article>
            <article className="rounded-lg border border-white/10 p-2.5">
              <p className="text-[11px] uppercase tracking-wide opacity-70">Matched</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-300">
                {systemSnapshot.identity.live.summary.matched}
              </p>
            </article>
            <article className="rounded-lg border border-white/10 p-2.5">
              <p className="text-[11px] uppercase tracking-wide opacity-70">Role Drift</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-amber-200">
                {systemSnapshot.identity.live.summary.roleMismatches}
              </p>
            </article>
            <article className="rounded-lg border border-white/10 p-2.5">
              <p className="text-[11px] uppercase tracking-wide opacity-70">Local Only</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-sky-200">
                {systemSnapshot.identity.live.summary.localOnly}
              </p>
            </article>
            <article className="rounded-lg border border-white/10 p-2.5">
              <p className="text-[11px] uppercase tracking-wide opacity-70">WS-API Only</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-violet-200">
                {systemSnapshot.identity.live.summary.wsApiOnly}
              </p>
            </article>
          </div>
        ) : null}
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-black/20 p-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
                Latest Saved Identity Run
              </p>
              <span className="text-[11px] opacity-60">
                {formatDateTime(systemSnapshot.identity.latestRun?.createdAt)}
              </span>
            </div>
            {systemSnapshot.identity.latestRun ? (
              <div className="mt-2 space-y-1.5 text-xs opacity-85">
                <p>
                  Mode <span className="font-semibold">{systemSnapshot.identity.latestRun.mode}</span> ·
                  ws-api {systemSnapshot.identity.latestRun.wsApiAvailable ? " available" : " unavailable"}
                </p>
                <p>
                  Before {systemSnapshot.identity.latestRun.roleMismatchBefore} mismatches, after{" "}
                  {systemSnapshot.identity.latestRun.roleMismatchAfter}.
                </p>
                <p>
                  Local-only {systemSnapshot.identity.latestRun.localOnlyCount} · ws-api-only{" "}
                  {systemSnapshot.identity.latestRun.wsApiOnlyCount}
                </p>
                <p>
                  API roles updated {systemSnapshot.identity.latestRun.wsApiRoleUpdated} · local users
                  created {systemSnapshot.identity.latestRun.localUsersCreated}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-xs opacity-70">No saved identity run recorded yet.</p>
            )}
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 p-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Top Drift Cases</p>
              <button
                type="button"
                onClick={() => onNavigate("/admin/access")}
                className="rounded border border-white/20 px-2 py-1 text-[11px] hover:bg-white/10"
              >
                Open Access Control
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {systemSnapshot.identity.live.topRows.map((row) => (
                <article key={row.email} className="rounded border border-white/10 px-2 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{row.email}</p>
                    <span className={feedBadgeClass(identityStatusTone(row.status))}>
                      {identityStatusLabel(row.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs opacity-80">
                    Local {row.local?.role ?? "-"} · WS-API {row.wsApi?.role ?? "-"} · Active offer badges{" "}
                    {row.offerBadgeCount}
                  </p>
                  <p className="mt-1 text-[11px] opacity-65">
                    {row.local?.lastAuthAt
                      ? `Local last auth ${formatDateTime(row.local.lastAuthAt)}`
                      : row.wsApi?.updatedAt
                        ? `WS-API updated ${formatDateTime(row.wsApi.updatedAt)}`
                        : "No recent auth timing available"}
                  </p>
                </article>
              ))}
              {systemSnapshot.identity.live.topRows.length === 0 ? (
                <p className="text-xs opacity-70">No live drift rows to show right now.</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-white/10 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">Fulfillment Automation</p>
              <p className="text-xs opacity-75">
                The lead-routing and digest engine already wired into the admin commerce stack.
              </p>
            </div>
            <span className="text-xs opacity-70">
              Last run {formatDateTime(systemSnapshot.automations.fulfillment.lastRunAt)}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
            <article className="rounded-lg border border-white/10 p-2.5">
              <p className="text-[11px] uppercase tracking-wide opacity-70">Profiles</p>
              <p className="mt-1 text-lg font-semibold">
                {systemSnapshot.automations.fulfillment.profileCount}
              </p>
            </article>
            <article className="rounded-lg border border-white/10 p-2.5">
              <p className="text-[11px] uppercase tracking-wide opacity-70">Schedules On</p>
              <p className="mt-1 text-lg font-semibold">
                {systemSnapshot.automations.fulfillment.scheduleEnabledCount}
              </p>
            </article>
            <article className="rounded-lg border border-white/10 p-2.5">
              <p className="text-[11px] uppercase tracking-wide opacity-70">Digests On</p>
              <p className="mt-1 text-lg font-semibold">
                {systemSnapshot.automations.fulfillment.digestEnabledCount}
              </p>
            </article>
            <article className="rounded-lg border border-white/10 p-2.5">
              <p className="text-[11px] uppercase tracking-wide opacity-70">Runs (7d)</p>
              <p className="mt-1 text-lg font-semibold">
                {systemSnapshot.automations.fulfillment.runCount7d}
              </p>
            </article>
            <article className="rounded-lg border border-white/10 p-2.5">
              <p className="text-[11px] uppercase tracking-wide opacity-70">Alerts (7d)</p>
              <p className="mt-1 text-lg font-semibold">
                {systemSnapshot.automations.fulfillment.alertCount7d}
              </p>
            </article>
            <article className="rounded-lg border border-white/10 p-2.5">
              <p className="text-[11px] uppercase tracking-wide opacity-70">Last Status</p>
              <p className="mt-1 text-lg font-semibold">
                {systemSnapshot.automations.fulfillment.lastRunStatus ?? "-"}
              </p>
            </article>
          </div>
          <div className="mt-3 space-y-2">
            {systemSnapshot.automations.fulfillment.recentRuns.map((run) => (
              <article key={run.id} className="rounded-lg border border-white/10 bg-black/20 p-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{run.business.name}</p>
                  <span className={feedBadgeClass(run.status === "SUCCESS" ? "good" : "warn")}>
                    {run.status}
                  </span>
                </div>
                <p className="mt-1 text-xs opacity-80">
                  {formatDateTime(run.startedAt)} · source {run.source} · open {run.openLeadCount} ·
                  unassigned {run.unassignedLeadCount} · auto-assigned {run.autoAssignedCount}
                </p>
              </article>
            ))}
            {systemSnapshot.automations.fulfillment.recentRuns.length === 0 ? (
              <p className="text-xs opacity-70">No fulfillment runs recorded yet.</p>
            ) : null}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">Saved-Product Match Engine</p>
              <p className="text-xs opacity-75">
                The inbox assignment engine that turns saved-product intent into live offer visibility.
              </p>
            </div>
            <span className="text-xs opacity-70">
              Last assignment {formatDateTime(systemSnapshot.automations.savedMatch.lastAssignmentAt)}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
            <article className="rounded-lg border border-white/10 p-2.5">
              <p className="text-[11px] uppercase tracking-wide opacity-70">Saved Products</p>
              <p className="mt-1 text-lg font-semibold">
                {systemSnapshot.automations.savedMatch.savedProductsCount}
              </p>
            </article>
            <article className="rounded-lg border border-white/10 p-2.5">
              <p className="text-[11px] uppercase tracking-wide opacity-70">Saved Offers</p>
              <p className="mt-1 text-lg font-semibold">
                {systemSnapshot.automations.savedMatch.savedOffersCount}
              </p>
            </article>
            <article className="rounded-lg border border-white/10 p-2.5">
              <p className="text-[11px] uppercase tracking-wide opacity-70">Inbox Active</p>
              <p className="mt-1 text-lg font-semibold">
                {systemSnapshot.automations.savedMatch.activeInboxCount}
              </p>
            </article>
            <article className="rounded-lg border border-white/10 p-2.5">
              <p className="text-[11px] uppercase tracking-wide opacity-70">Assignments (7d)</p>
              <p className="mt-1 text-lg font-semibold">
                {systemSnapshot.automations.savedMatch.assignmentCount7d}
              </p>
            </article>
          </div>
          <div className="mt-3 space-y-2">
            {systemSnapshot.automations.savedMatch.recentAssignments.map((assignment) => (
              <article key={assignment.id} className="rounded-lg border border-white/10 bg-black/20 p-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{assignment.offer.title}</p>
                  <span className={feedBadgeClass("info")}>{assignment.status}</span>
                </div>
                <p className="mt-1 text-xs opacity-80">
                  {assignment.business.name} · {assignment.userEmail} ·{" "}
                  {formatDateTime(assignment.assignedAt)}
                </p>
              </article>
            ))}
            {systemSnapshot.automations.savedMatch.recentAssignments.length === 0 ? (
              <p className="text-xs opacity-70">No saved-match assignments recorded yet.</p>
            ) : null}
          </div>
        </div>
      </div>

      <AdminOperationsCommandPanels systemSnapshot={systemSnapshot} onNavigate={onNavigate} />

      <AdminGrowthVisibilityPanels systemSnapshot={systemSnapshot} onNavigate={onNavigate} />

      <AdminPlatformIntegrityPanels
        systemSnapshot={systemSnapshot}
        publicProbeHistoryLoading={publicProbeHistoryLoading}
        publicProbeHistory={publicProbeHistory}
        publicProbeError={publicProbeError}
        publicProbeRunBusy={publicProbeRunBusy}
        healthCheckBusy={healthCheckBusy}
        healthCheckNote={healthCheckNote}
        recrawlActionNote={recrawlActionNote}
        onRunPublicProbeNow={onRunPublicProbeNow}
        onRunSystemHealthCheck={onRunSystemHealthCheck}
        onOpenFreshXCardUrl={onOpenFreshXCardUrl}
        onCopyFreshXCardUrl={onCopyFreshXCardUrl}
      />
    </>
  );
}
