import type { PublicSurfaceProbeHistory, SystemSnapshot } from "./adminDashboardTypes";
import { AdminOwnedToolsRail } from "./AdminOwnedToolsRail";
import { AdminPublicSurfacePanels } from "./AdminPublicSurfacePanels";
import {
  feedBadgeClass,
  formatDateTime,
  formatMethodLabel,
  operationalStatus,
} from "./adminDashboardPresentation";

type AdminPlatformIntegrityPanelsProps = {
  systemSnapshot: SystemSnapshot;
  publicProbeHistoryLoading: boolean;
  publicProbeHistory: PublicSurfaceProbeHistory | null;
  publicProbeError: string | null;
  publicProbeRunBusy: boolean;
  healthCheckBusy: boolean;
  healthCheckNote: string | null;
  recrawlActionNote: string | null;
  onRunPublicProbeNow: () => void | Promise<void>;
  onRunSystemHealthCheck: () => void | Promise<void>;
  onOpenFreshXCardUrl: () => void;
  onCopyFreshXCardUrl: () => void | Promise<void>;
};

export function AdminPlatformIntegrityPanels({
  systemSnapshot,
  publicProbeHistoryLoading,
  publicProbeHistory,
  publicProbeError,
  publicProbeRunBusy,
  healthCheckBusy,
  healthCheckNote,
  recrawlActionNote,
  onRunPublicProbeNow,
  onRunSystemHealthCheck,
  onOpenFreshXCardUrl,
  onCopyFreshXCardUrl,
}: AdminPlatformIntegrityPanelsProps) {
  const tmailRailTone =
    systemSnapshot.tmail.reachable && systemSnapshot.tmail.publicHealth.reachable
      ? "good"
      : systemSnapshot.tmail.reachable || systemSnapshot.tmail.publicHealth.reachable
        ? "warn"
        : systemSnapshot.tmail.configured
          ? "warn"
          : "info";
  const tmailRailLabel =
    systemSnapshot.tmail.reachable && systemSnapshot.tmail.publicHealth.reachable
      ? "healthy"
      : systemSnapshot.tmail.reachable || systemSnapshot.tmail.publicHealth.reachable
        ? "degraded"
        : systemSnapshot.tmail.configured
          ? "unreachable"
          : "not active";

  const tmailProbeLabel = (probe: {
    reachable: boolean;
    status: number | null;
  }) => {
    if (probe.reachable) {
      return probe.status ? `ok ${probe.status}` : "ok";
    }
    if (probe.status) {
      return `fail ${probe.status}`;
    }
    return "down";
  };

  const tmailProbeTone = (probe: {
    reachable: boolean;
    status: number | null;
  }): "good" | "warn" | "info" => {
    if (probe.reachable) {
      return "good";
    }
    if (probe.status !== null) {
      return "warn";
    }
    return "info";
  };

  return (
    <>
      <div className="min-w-0 overflow-hidden rounded-lg border border-white/10 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">Auth + Reset Diagnostics</p>
        </div>
        <p className="mt-1 text-xs opacity-80">
          Reset email provider:{" "}
          <span className="font-semibold">
            {systemSnapshot.integrations.passwordResetEmail.provider}
          </span>{" "}
          · Configured:{" "}
          <span className="font-semibold">
            {systemSnapshot.integrations.passwordResetEmail.configured ? "yes" : "no"}
          </span>{" "}
          · Debug link exposure:{" "}
          <span className="font-semibold">
            {systemSnapshot.integrations.passwordResetEmail.debugLinkExposureEnabled ? "enabled" : "disabled"}
          </span>
        </p>
        <p className="mt-1 break-all text-xs opacity-80">
          Reset sender:{" "}
          <span className="font-semibold">
            {systemSnapshot.integrations.passwordResetEmail.from ?? "not set"}
          </span>{" "}
          · API base:{" "}
          <span className="font-semibold">
            {systemSnapshot.integrations.passwordResetEmail.apiBaseUrl ?? "not set"}
          </span>
        </p>
        <p className="mt-1 text-xs opacity-80">
          WS-API password bridge key:{" "}
          <span className="font-semibold">
            {systemSnapshot.integrations.wsApiBridge.configured ? "configured" : "missing"}
          </span>
        </p>
      </div>

      <AdminOwnedToolsRail systemSnapshot={systemSnapshot} />

      <div className="min-w-0 overflow-hidden rounded-lg border border-white/10 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold">TMail Reset Rail</p>
            <p className="text-xs opacity-75">
              The mail system now carrying Wheat &amp; Stone password reset delivery.
            </p>
          </div>
          <span className={feedBadgeClass(tmailRailTone)}>{tmailRailLabel}</span>
        </div>
        <p className="mt-2 break-words text-xs opacity-75">
          Public edge{" "}
          <span className="font-semibold">{tmailProbeLabel(systemSnapshot.tmail.publicHealth)}</span> ·
          Summary{" "}
          <span className="font-semibold">{tmailProbeLabel(systemSnapshot.tmail.summaryFeed)}</span> ·
          Messages{" "}
          <span className="font-semibold">{tmailProbeLabel(systemSnapshot.tmail.messagesFeed)}</span>
        </p>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <article className="min-w-0 rounded-lg border border-white/10 p-2.5">
            <p className="text-[11px] uppercase tracking-wide opacity-70">Identity</p>
            <p className="mt-1 break-words text-sm font-semibold">
              {systemSnapshot.tmail.identityLabel ?? systemSnapshot.tmail.identityId ?? "-"}
            </p>
            <p className="mt-1 break-words text-[11px] opacity-70">
              {systemSnapshot.tmail.identityEmail ?? "email unavailable"}
            </p>
          </article>
          <article className="min-w-0 rounded-lg border border-white/10 p-2.5">
            <p className="text-[11px] uppercase tracking-wide opacity-70">Identity Health</p>
            <div className="mt-1 flex items-center gap-2">
              <span className={feedBadgeClass(operationalStatus(systemSnapshot.tmail.identityStatus))}>
                {systemSnapshot.tmail.identityStatus ?? "unknown"}
              </span>
              <span className="text-xs opacity-75">
                Secret {systemSnapshot.tmail.secretConfigured ? "present" : "unknown/missing"}
              </span>
            </div>
          </article>
          <article className="min-w-0 rounded-lg border border-white/10 p-2.5">
            <p className="text-[11px] uppercase tracking-wide opacity-70">Latest Reset Mail</p>
            <p className="mt-1 text-sm font-semibold">
              {systemSnapshot.tmail.latestPasswordResetMessage?.status ?? "-"}
            </p>
            <p className="mt-1 text-[11px] opacity-70">
              {formatDateTime(
                systemSnapshot.tmail.latestPasswordResetMessage?.sentAt ??
                  systemSnapshot.tmail.latestPasswordResetMessage?.createdAt,
              )}
            </p>
          </article>
          <article className="min-w-0 rounded-lg border border-white/10 p-2.5">
            <p className="text-[11px] uppercase tracking-wide opacity-70">Rail Health</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <span className={feedBadgeClass(tmailProbeTone(systemSnapshot.tmail.publicHealth))}>
                Public {tmailProbeLabel(systemSnapshot.tmail.publicHealth)}
              </span>
              <span className={feedBadgeClass(tmailProbeTone(systemSnapshot.tmail.summaryFeed))}>
                Summary {tmailProbeLabel(systemSnapshot.tmail.summaryFeed)}
              </span>
              <span className={feedBadgeClass(tmailProbeTone(systemSnapshot.tmail.messagesFeed))}>
                Messages {tmailProbeLabel(systemSnapshot.tmail.messagesFeed)}
              </span>
            </div>
            <p className="mt-2 break-all text-[11px] opacity-80">
              {systemSnapshot.tmail.baseUrl ?? "not set"}
            </p>
          </article>
        </div>
        {systemSnapshot.tmail.error ? (
          <p className="mt-3 break-words text-xs text-rose-300">{systemSnapshot.tmail.error}</p>
        ) : null}
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="min-w-0 rounded-lg border border-white/10 bg-black/20 p-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-80">TMail Alerts</p>
              <span className="text-[11px] opacity-60">{systemSnapshot.tmail.alerts.length} items</span>
            </div>
            <div className="mt-2 space-y-2">
              {systemSnapshot.tmail.alerts.map((alert) => (
                <article key={alert.id} className="rounded border border-white/10 px-2 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={feedBadgeClass(operationalStatus(alert.level))}>{alert.level}</span>
                    <p className="break-words text-sm font-semibold">{alert.title}</p>
                  </div>
                  {alert.body ? <p className="mt-1 break-words text-xs opacity-75">{alert.body}</p> : null}
                </article>
              ))}
              {systemSnapshot.tmail.alerts.length === 0 ? (
                <p className="text-xs opacity-70">No TMail alerts returned.</p>
              ) : null}
            </div>
          </div>
          <div className="min-w-0 rounded-lg border border-white/10 bg-black/20 p-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
                Domain Delivery Checks
              </p>
              <span className="text-[11px] opacity-60">{systemSnapshot.tmail.domains.length} domains</span>
            </div>
            <div className="mt-2 space-y-2">
              {systemSnapshot.tmail.domains.map((domain) => {
                const checks = [domain.spf, domain.dkim, domain.dmarc, domain.mx];
                const hasFailure = checks.some((value) => (value ?? "").toLowerCase() === "fail");
                return (
                  <article key={domain.domain} className="rounded border border-white/10 px-2 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="break-words text-sm font-semibold">{domain.domain}</p>
                      <span className={feedBadgeClass(hasFailure ? "warn" : "good")}>
                        {hasFailure ? "attention" : "healthy"}
                      </span>
                    </div>
                    <p className="mt-1 break-words text-xs opacity-75">
                      SPF {domain.spf ?? "-"} · DKIM {domain.dkim ?? "-"} · DMARC {domain.dmarc ?? "-"} · MX{" "}
                      {domain.mx ?? "-"}
                    </p>
                  </article>
                );
              })}
              {systemSnapshot.tmail.domains.length === 0 ? (
                <p className="text-xs opacity-70">No domain diagnostics returned.</p>
              ) : null}
            </div>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
              Recent Password Reset Mail in TMail
            </p>
            <span className="text-[11px] opacity-60">
              {systemSnapshot.tmail.recentPasswordResetMessages.length} recent messages
            </span>
          </div>
          {systemSnapshot.tmail.recentPasswordResetMessages.map((message) => (
            <article key={message.id} className="min-w-0 rounded-lg border border-white/10 bg-black/20 p-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="break-words text-sm font-semibold">
                  {message.recipients.join(", ") || "recipient unavailable"}
                </p>
                <span className={feedBadgeClass(operationalStatus(message.status))}>{message.status}</span>
              </div>
              <p className="mt-1 break-words text-xs opacity-80">
                {formatDateTime(message.sentAt ?? message.createdAt)} · {message.subject}
              </p>
              {message.errorMessage ? (
                <p className="mt-1 break-words text-xs text-rose-300">{message.errorMessage}</p>
              ) : null}
            </article>
          ))}
          {systemSnapshot.tmail.recentPasswordResetMessages.length === 0 ? (
            <p className="text-xs opacity-70">No password reset mail has been recorded in TMail yet.</p>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-white/10 p-3">
        <h5 className="mb-2 text-sm font-semibold">Recent Password Reset Dispatches</h5>
        <table className="w-full min-w-[820px] text-left text-xs">
          <thead className="opacity-70">
            <tr>
              <th className="pb-1.5 pr-2">Time</th>
              <th className="pb-1.5 pr-2">Email</th>
              <th className="pb-1.5 pr-2">Source</th>
              <th className="pb-1.5 pr-2">Provider</th>
              <th className="pb-1.5 pr-2">Delivered</th>
              <th className="pb-1.5 pr-2">Reason</th>
              <th className="pb-1.5">Requested By</th>
            </tr>
          </thead>
          <tbody>
            {systemSnapshot.passwordResetRecentDispatches.map((row) => (
              <tr key={row.id} className="border-t border-white/10">
                <td className="py-1.5 pr-2">{new Date(row.createdAt).toLocaleString()}</td>
                <td className="py-1.5 pr-2">{row.email}</td>
                <td className="py-1.5 pr-2">{row.source}</td>
                <td className="py-1.5 pr-2">{row.provider}</td>
                <td className="py-1.5 pr-2">
                  <span
                    className={
                      row.delivered
                        ? "rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] text-emerald-300"
                        : "rounded-full bg-rose-500/20 px-2 py-0.5 text-[11px] text-rose-200"
                    }
                  >
                    {row.delivered ? "yes" : "no"}
                  </span>
                </td>
                <td className="py-1.5 pr-2">{row.reason || "-"}</td>
                <td className="py-1.5">{row.requestedByEmail || "-"}</td>
              </tr>
            ))}
            {systemSnapshot.passwordResetRecentDispatches.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-2 opacity-70">
                  No reset dispatches yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <AdminPublicSurfacePanels
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

      <div className="overflow-x-auto rounded-lg border border-white/10 p-3">
        <h5 className="mb-2 text-sm font-semibold">Recent Users</h5>
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="opacity-70">
            <tr>
              <th className="pb-2 pr-3">Email</th>
              <th className="pb-2 pr-3">Role</th>
              <th className="pb-2 pr-3">Registered Via</th>
              <th className="pb-2 pr-3">Registered</th>
              <th className="pb-2 pr-3">Last Auth Provider</th>
              <th className="pb-2">Last Auth</th>
            </tr>
          </thead>
          <tbody>
            {systemSnapshot.recentUsers.map((user) => (
              <tr key={user.id} className="border-t border-white/10">
                <td className="py-2 pr-3">{user.email}</td>
                <td className="py-2 pr-3">{user.role}</td>
                <td className="py-2 pr-3">{formatMethodLabel(user.registeredVia)}</td>
                <td className="py-2 pr-3">{new Date(user.registeredAt).toLocaleString()}</td>
                <td className="py-2 pr-3">
                  {user.lastAuthProvider ? formatMethodLabel(user.lastAuthProvider) : "n/a"}
                </td>
                <td className="py-2">
                  {user.lastAuthAt ? new Date(user.lastAuthAt).toLocaleString() : "n/a"}
                </td>
              </tr>
            ))}
            {systemSnapshot.recentUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-3 text-xs opacity-70">
                  No local users found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
