import type { SystemSnapshot } from "./adminDashboardTypes";
import {
  feedBadgeClass,
  formatDateTime,
  formatOpsLabel,
  operationalStatus,
} from "./adminDashboardPresentation";

type AdminOperationsCommandPanelsProps = {
  systemSnapshot: SystemSnapshot;
  onNavigate: (href: string) => void;
};

function SummaryMetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <article className="min-w-0 rounded-lg border border-white/10 p-2.5">
      <p className="break-words text-[10px] uppercase leading-snug tracking-[0.18em] opacity-70 md:text-[11px]">
        {label}
      </p>
      <p className={`mt-2 text-lg font-semibold ${tone ?? ""}`.trim()}>{value}</p>
    </article>
  );
}

export function AdminOperationsCommandPanels({
  systemSnapshot,
  onNavigate,
}: AdminOperationsCommandPanelsProps) {
  const notificationSummaryCards = [
    { label: "Total Jobs", value: systemSnapshot.notifications.summary.totalJobs },
    { label: "Queued", value: systemSnapshot.notifications.summary.queued },
    {
      label: "Retrying",
      value: systemSnapshot.notifications.summary.retrying,
      tone: "text-amber-200",
    },
    { label: "Sent", value: systemSnapshot.notifications.summary.sent, tone: "text-emerald-300" },
    {
      label: "Failed",
      value: systemSnapshot.notifications.summary.failed,
      tone: "text-rose-300",
    },
  ];

  const operationsSummaryCards = [
    { label: "Total Signals", value: systemSnapshot.operations.summary.totalSignals },
    {
      label: "Attention",
      value: systemSnapshot.operations.summary.attentionSignals,
      tone: "text-amber-200",
    },
    { label: "Automations", value: systemSnapshot.operations.summary.automationSignals },
    { label: "Notifications", value: systemSnapshot.operations.summary.notificationSignals },
    { label: "Support / Auth", value: systemSnapshot.operations.summary.supportSignals },
    { label: "Public Probes", value: systemSnapshot.operations.summary.publicSurfaceSignals },
  ];

  return (
    <div className="grid gap-3 2xl:grid-cols-2">
      <div className="min-w-0 overflow-hidden rounded-lg border border-white/10 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Notification Command Center</p>
            <p className="text-xs opacity-75">
              Email, push, and retries visible from one operator surface.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onNavigate("/admin/business")}
              className="rounded border border-white/20 px-2 py-1 text-[11px] hover:bg-white/10"
            >
              Business Dashboards
            </button>
            <button
              type="button"
              onClick={() => onNavigate("/admin/commerce")}
              className="rounded border border-emerald-300/30 bg-emerald-500/10 px-2 py-1 text-[11px] hover:bg-emerald-500/20"
            >
              Process Queue
            </button>
          </div>
        </div>
        <p className="mt-1 text-xs opacity-80">
          Queue refresh: {formatDateTime(systemSnapshot.notifications.generatedAt)} · providers{" "}
          {systemSnapshot.notifications.providers.join(", ") || "none"} · businesses{" "}
          {systemSnapshot.notifications.summary.distinctBusinesses}
        </p>
        {systemSnapshot.notifications.error ? (
          <p className="mt-2 rounded border border-amber-300/35 bg-amber-300/10 px-2 py-1 text-xs text-amber-100">
            {systemSnapshot.notifications.error}
          </p>
        ) : null}
        <div
          className="mt-3 grid gap-2"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(7.5rem, 1fr))" }}
        >
          {notificationSummaryCards.map((card) => (
            <SummaryMetricCard
              key={card.label}
              label={card.label}
              value={card.value}
              tone={card.tone}
            />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs opacity-85">
            Overdue: {systemSnapshot.notifications.summary.overdue}
          </span>
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs opacity-85">
            Scheduled ahead: {systemSnapshot.notifications.summary.scheduledAhead}
          </span>
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs opacity-85">
            Email: {systemSnapshot.notifications.summary.emailJobs}
          </span>
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs opacity-85">
            Push: {systemSnapshot.notifications.summary.pushJobs}
          </span>
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs opacity-85">
            SMS: {systemSnapshot.notifications.summary.smsJobs}
          </span>
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs opacity-85">
            Fallback queued: {systemSnapshot.notifications.summary.fallbackQueued}
          </span>
        </div>
        <div className="mt-3 grid gap-3 xl:grid-cols-2">
          <div className="min-w-0 rounded-lg border border-white/10 bg-black/20 p-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
              Recent Jobs
            </p>
            <div className="mt-2 space-y-2">
              {systemSnapshot.notifications.recentJobs.map((job) => (
                <article key={job.id} className="min-w-0 rounded border border-white/10 px-2 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold break-words">{job.campaignName}</p>
                    <span className={feedBadgeClass(operationalStatus(job.status))}>
                      {job.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs opacity-80 break-words">
                    {job.businessName ?? job.businessId} · {job.channel} via{" "}
                    {job.provider ?? "pending"} · audience {job.audience}
                  </p>
                  <p className="mt-1 text-[11px] opacity-65 break-words">
                    Created {formatDateTime(job.createdAt)} · Next attempt{" "}
                    {formatDateTime(job.scheduledFor ?? job.nextAttemptAt)}
                  </p>
                </article>
              ))}
              {systemSnapshot.notifications.recentJobs.length === 0 ? (
                <p className="text-xs opacity-70">No notification jobs are visible yet.</p>
              ) : null}
            </div>
          </div>

          <div className="min-w-0 rounded-lg border border-white/10 bg-black/20 p-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
              Failures, Retries, and Pulse Readiness
            </p>
            <div className="mt-2 space-y-2">
              {systemSnapshot.notifications.recentFailures.map((job) => (
                <article key={job.id} className="min-w-0 rounded border border-white/10 px-2 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold break-words">{job.campaignName}</p>
                    <span className={feedBadgeClass("warn")}>{job.status}</span>
                  </div>
                  <p className="mt-1 text-xs opacity-80 break-words">
                    {job.businessName ?? job.businessId} · {job.channel} ·{" "}
                    {job.provider ?? "pending"}
                  </p>
                  <p className="mt-1 text-[11px] opacity-65">
                    {formatDateTime(job.failedAt ?? job.updatedAt)}
                  </p>
                  {job.lastError ? (
                    <p className="mt-1 text-[11px] break-words text-rose-300">
                      {job.lastError}
                    </p>
                  ) : null}
                </article>
              ))}
              <div className="min-w-0 rounded border border-white/10 px-2 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">Pulse Readiness</p>
                  <span
                    className={feedBadgeClass(
                      systemSnapshot.pulse.reachable
                        ? "good"
                        : systemSnapshot.pulse.configured
                          ? "warn"
                          : "info",
                    )}
                  >
                    {systemSnapshot.pulse.reachable
                      ? "reachable"
                      : systemSnapshot.pulse.configured
                        ? "partial"
                        : "staged"}
                  </span>
                </div>
                <p className="mt-1 text-xs opacity-80 break-words">
                  {systemSnapshot.pulse.apiBaseUrl ?? "No API URL set"} · project{" "}
                  {systemSnapshot.pulse.projectSlug ?? "not set"} · token{" "}
                  {systemSnapshot.pulse.internalTokenConfigured ? "present" : "missing"}
                </p>
                <p className="mt-1 text-[11px] opacity-65 break-words">
                  {systemSnapshot.pulse.checkedAt
                    ? `Health checked ${formatDateTime(systemSnapshot.pulse.checkedAt)}`
                    : systemSnapshot.pulse.error ??
                      "Pulse is not wired into Wheat & Stone yet."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="min-w-0 overflow-hidden rounded-lg border border-white/10 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Jobs + Audit Feed</p>
            <p className="text-xs opacity-75">
              One place to watch automations, outreach, recovery, and public checks move through
              the platform.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onNavigate("/admin/commerce")}
              className="rounded border border-white/20 px-2 py-1 text-[11px] hover:bg-white/10"
            >
              Automation Center
            </button>
            <button
              type="button"
              onClick={() => onNavigate("/admin/access")}
              className="rounded border border-white/20 px-2 py-1 text-[11px] hover:bg-white/10"
            >
              Access Console
            </button>
          </div>
        </div>
        <p className="mt-1 text-xs opacity-80">
          Feed refresh: {formatDateTime(systemSnapshot.operations.generatedAt)} ·{" "}
          {systemSnapshot.operations.summary.totalSignals} recent signals tracked with{" "}
          <span className="font-semibold">
            {systemSnapshot.operations.summary.attentionSignals} needing attention
          </span>
          .
        </p>
        {systemSnapshot.operations.notes.map((note) => (
          <p
            key={note}
            className="mt-2 rounded border border-amber-300/35 bg-amber-300/10 px-2 py-1 text-xs text-amber-100"
          >
            {note}
          </p>
        ))}
        <div
          className="mt-3 grid gap-2"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(8.25rem, 1fr))" }}
        >
          {operationsSummaryCards.map((card) => (
            <SummaryMetricCard
              key={card.label}
              label={card.label}
              value={card.value}
              tone={card.tone}
            />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs opacity-85">
            Fulfillment runs: {systemSnapshot.operations.sourceCounts.fulfillmentRuns}
          </span>
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs opacity-85">
            Saved-match assignments:{" "}
            {systemSnapshot.operations.sourceCounts.savedMatchAssignments}
          </span>
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs opacity-85">
            Notification audit:{" "}
            {systemSnapshot.operations.sourceCounts.notificationAuditEntries}
          </span>
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs opacity-85">
            Identity runs: {systemSnapshot.operations.sourceCounts.identityRuns}
          </span>
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs opacity-85">
            Rescue runs: {systemSnapshot.operations.sourceCounts.accountRescues}
          </span>
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs opacity-85">
            Reset dispatches:{" "}
            {systemSnapshot.operations.sourceCounts.passwordResetDispatches}
          </span>
        </div>
        <div className="mt-3 grid gap-3 xl:grid-cols-2">
          <div className="min-w-0 rounded-lg border border-white/10 bg-black/20 p-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
              Recent Platform Activity
            </p>
            <div className="mt-2 space-y-2">
              {systemSnapshot.operations.recentEvents.map((event) => (
                <article key={event.id} className="min-w-0 rounded border border-white/10 px-2 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold break-words">{event.title}</p>
                    <span className={feedBadgeClass(event.status)}>{event.status}</span>
                  </div>
                  <p className="mt-1 text-xs opacity-80 break-words">{event.summary}</p>
                  <p className="mt-1 text-[11px] opacity-65 break-words">
                    {formatOpsLabel(event.category)} · {formatOpsLabel(event.source)} ·{" "}
                    {event.actor ?? "system"} · {formatDateTime(event.occurredAt)}
                  </p>
                  {event.detail ? (
                    <p className="mt-1 text-[11px] break-words opacity-65">{event.detail}</p>
                  ) : null}
                </article>
              ))}
              {systemSnapshot.operations.recentEvents.length === 0 ? (
                <p className="text-xs opacity-70">No operator activity has been recorded yet.</p>
              ) : null}
            </div>
          </div>

          <div className="min-w-0 rounded-lg border border-white/10 bg-black/20 p-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
              Attention Watchlist
            </p>
            <div className="mt-2 space-y-2">
              {systemSnapshot.operations.attentionEvents.map((event) => (
                <article key={event.id} className="min-w-0 rounded border border-white/10 px-2 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold break-words">{event.title}</p>
                    <span className={feedBadgeClass("warn")}>attention</span>
                  </div>
                  <p className="mt-1 text-xs opacity-80 break-words">{event.summary}</p>
                  <p className="mt-1 text-[11px] opacity-65 break-words">
                    {formatOpsLabel(event.category)} · {event.actor ?? "system"} ·{" "}
                    {formatDateTime(event.occurredAt)}
                  </p>
                  {event.detail ? (
                    <p className="mt-1 text-[11px] break-words opacity-65">{event.detail}</p>
                  ) : null}
                </article>
              ))}
              {systemSnapshot.operations.attentionEvents.length === 0 ? (
                <p className="text-xs opacity-70">
                  No urgent operator warnings are sitting in the recent feed.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
