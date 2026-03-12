"use client";

import { AdminControlTowerPanels } from "./AdminControlTowerPanels";
import { AdminExperienceSystemPanels } from "./AdminExperienceSystemPanels";
import type {
  AuthProviderConfig,
  AuthRegistrationStats,
  PublicSurfaceProbeHistory,
  SystemSnapshot,
} from "./adminDashboardTypes";
import { feedBadgeClass, formatDateTime, formatMethodLabel } from "./adminDashboardPresentation";

type Props = {
  systemSnapshotLoading: boolean;
  systemSnapshot: SystemSnapshot | null;
  authProviderConfigLoading: boolean;
  authProviderConfig: AuthProviderConfig[];
  authStatsLoading: boolean;
  authStats: AuthRegistrationStats | null;
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

export function AdminOwnerIntelligencePanels({
  systemSnapshotLoading,
  systemSnapshot,
  authProviderConfigLoading,
  authProviderConfig,
  authStatsLoading,
  authStats,
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
}: Props) {
  return (
    <div className="admin-card space-y-4 p-4 md:p-5">
      <div className="admin-surface space-y-3 rounded-xl p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold md:text-base">System Data Snapshot</h4>
            <p className="text-xs opacity-75">
              Direct live counts from your app database so you don&apos;t need Prisma Studio for
              routine checks.
            </p>
          </div>
          <span className="text-xs opacity-70">
            {systemSnapshot?.generatedAt
              ? `Updated ${new Date(systemSnapshot.generatedAt).toLocaleString()}`
              : "Snapshot unavailable"}
          </span>
        </div>

        {systemSnapshotLoading ? (
          <div className="rounded-lg border border-white/10 p-3 text-sm opacity-70">
            Loading snapshot...
          </div>
        ) : null}

        {!systemSnapshotLoading && !systemSnapshot ? (
          <div className="rounded-lg border border-white/10 p-3 text-sm opacity-70">
            Could not load the system snapshot.
          </div>
        ) : null}

        {systemSnapshot ? (
          <>
            <AdminExperienceSystemPanels compact />

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-white/10 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">App Release</p>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] uppercase tracking-wide">
                    {systemSnapshot.release.app.source === "generated" ? "built" : "fallback"}
                  </span>
                </div>
                <p className="mt-1 text-xs opacity-80">
                  {systemSnapshot.release.app.app} {systemSnapshot.release.app.packageVersion}
                </p>
                <p className="mt-1 text-xs opacity-80">
                  Build ID:{" "}
                  <span className="font-semibold">{systemSnapshot.release.app.buildId}</span>
                </p>
                <p className="mt-1 text-xs opacity-80">
                  Built:{" "}
                  <span className="font-semibold">
                    {formatDateTime(systemSnapshot.release.app.builtAt)}
                  </span>
                </p>
                <p className="mt-1 text-xs opacity-80">
                  Git:{" "}
                  <span className="font-semibold">
                    {systemSnapshot.release.app.gitBranch ?? "unknown"} /{" "}
                    {systemSnapshot.release.app.gitShaShort ?? "unknown"}
                  </span>
                </p>
                <p className="mt-1 text-xs opacity-80">
                  Stack: Next {systemSnapshot.release.app.nextVersion ?? "n/a"} · React{" "}
                  {systemSnapshot.release.app.reactVersion ?? "n/a"} · Node{" "}
                  {systemSnapshot.release.app.nodeVersion}
                </p>
                <p className="mt-1 text-xs opacity-80">
                  PWA version:{" "}
                  <span className="font-semibold">
                    {systemSnapshot.release.app.pwaVersion ?? "not generated"}
                  </span>
                </p>
              </div>

              <div className="rounded-lg border border-white/10 p-3">
                <p className="text-sm font-semibold">Runtime Wiring</p>
                <p className="mt-1 text-xs opacity-80">
                  NODE_ENV:{" "}
                  <span className="font-semibold">{systemSnapshot.release.runtime.nodeEnv}</span>
                </p>
                <p className="mt-1 text-xs opacity-80">
                  Site origin:{" "}
                  <span className="font-semibold">
                    {systemSnapshot.release.runtime.siteOrigin ?? "not set"}
                  </span>
                </p>
                <p className="mt-1 text-xs opacity-80">
                  NEXTAUTH_URL:{" "}
                  <span className="font-semibold">
                    {systemSnapshot.release.runtime.nextAuthUrl ?? "not set"}
                  </span>
                </p>
                <p className="mt-1 text-xs opacity-80">
                  WS-API base URL:{" "}
                  <span className="font-semibold">
                    {systemSnapshot.release.runtime.wsApiBaseUrl}
                  </span>
                </p>
                <p className="mt-1 text-xs opacity-75">
                  This is the live plumbing your app uses to sign in users, probe public pages, and
                  proxy backend operations.
                </p>
              </div>

              <div className="rounded-lg border border-white/10 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">WS-API Release</p>
                  <span
                    className={
                      systemSnapshot.wsApi.healthReachable
                        ? "rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] text-emerald-300"
                        : "rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] text-amber-200"
                    }
                  >
                    {systemSnapshot.wsApi.healthReachable
                      ? "health reachable"
                      : "health unavailable"}
                  </span>
                </div>
                <p className="mt-1 text-xs opacity-80">
                  Base URL: <span className="font-semibold">{systemSnapshot.wsApi.baseUrl}</span>
                </p>
                <p className="mt-1 text-xs opacity-80">
                  Package:{" "}
                  <span className="font-semibold">
                    {systemSnapshot.wsApi.release?.packageName ?? "n/a"}{" "}
                    {systemSnapshot.wsApi.release?.packageVersion ?? ""}
                  </span>
                </p>
                <p className="mt-1 text-xs opacity-80">
                  Git:{" "}
                  <span className="font-semibold">
                    {systemSnapshot.wsApi.release?.gitBranch ?? "unknown"} /{" "}
                    {systemSnapshot.wsApi.release?.gitShaShort ?? "unknown"}
                  </span>
                </p>
                <p className="mt-1 text-xs opacity-80">
                  Started:{" "}
                  <span className="font-semibold">
                    {formatDateTime(systemSnapshot.wsApi.release?.startedAt)}
                  </span>
                </p>
                <p className="mt-1 text-xs opacity-80">
                  API runtime:{" "}
                  <span className="font-semibold">
                    {systemSnapshot.wsApi.nodeEnv ?? "unknown"} · uptime{" "}
                    {systemSnapshot.wsApi.uptimeSeconds ?? "n/a"}s
                  </span>
                </p>
                <p className="mt-1 text-xs opacity-80">
                  Contract:{" "}
                  <span className="font-semibold">
                    {systemSnapshot.wsApi.contract?.version ?? "n/a"} ·{" "}
                    {systemSnapshot.wsApi.contract?.routeCount ?? "n/a"} routes
                  </span>
                </p>
                <p className="mt-1 text-xs opacity-80">
                  App expects:{" "}
                  <span className="font-semibold">
                    {systemSnapshot.wsApi.contractParity.expectedVersion} ·{" "}
                    {systemSnapshot.wsApi.contractParity.expectedRouteCount} routes
                  </span>
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">Builder Feed</p>
                  <p className="text-xs opacity-75">
                    Plain-English updates from the strongest signals we have right now.
                  </p>
                </div>
                <span className="text-xs opacity-70">
                  {systemSnapshot.builderFeed.length} tracked events
                </span>
              </div>
              <div className="mt-3 grid gap-2">
                {systemSnapshot.builderFeed.map((item) => (
                  <article key={item.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={feedBadgeClass(item.status)}>
                          {item.status === "good"
                            ? "Healthy"
                            : item.status === "warn"
                              ? "Attention"
                              : "Update"}
                        </span>
                        <span className="text-[11px] uppercase tracking-wide opacity-60">
                          {item.category}
                        </span>
                      </div>
                      <span className="text-[11px] opacity-60">
                        {formatDateTime(item.createdAt)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 text-sm opacity-85">{item.summary}</p>
                    {item.detail ? <p className="mt-1 text-xs opacity-70">{item.detail}</p> : null}
                  </article>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {[
                ["Users", systemSnapshot.localDb.usersCount, ""],
                ["Owner/Admin", systemSnapshot.localDb.ownerAdminUsersCount, ""],
                ["Articles", systemSnapshot.localDb.articlesCount, ""],
                ["Comments", systemSnapshot.localDb.commentsCount, ""],
                ["Reactions", systemSnapshot.localDb.reactionsCount, ""],
                ["Businesses", systemSnapshot.localDb.businessesCount, ""],
                ["Offers", systemSnapshot.localDb.offersCount, ""],
                ["Live Offers", systemSnapshot.localDb.liveOffersCount, ""],
                ["Offer Inbox Active", systemSnapshot.localDb.userOfferInboxActiveCount, ""],
                ["Reset Tokens Live", systemSnapshot.localDb.passwordResetPendingCount, ""],
                [
                  "Reset Delivered (7d)",
                  systemSnapshot.localDb.passwordResetDelivered7dCount,
                  "text-emerald-300",
                ],
                [
                  "Reset Failed (7d)",
                  systemSnapshot.localDb.passwordResetFailed7dCount,
                  "text-rose-300",
                ],
                ["Reg Events (30d)", systemSnapshot.localDb.authRegistrationEvents30dCount, ""],
                ["Funnel Events (30d)", systemSnapshot.localDb.authFunnelEvents30dCount, ""],
              ].map(([label, value, tone]) => (
                <article key={label} className="rounded-lg border border-white/10 p-2.5">
                  <p className="text-[11px] uppercase tracking-wide opacity-70">{label}</p>
                  <p className={`mt-1 text-lg font-semibold tabular-nums ${tone}`}>
                    {String(value)}
                  </p>
                </article>
              ))}
            </div>

            <div className="rounded-lg border border-white/10 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">Analytics Activity</p>
                  <p className="text-xs opacity-75">
                    What the site is already capturing about visits, clicks, and conversions.
                  </p>
                </div>
                <span className="text-xs opacity-70">
                  Total {systemSnapshot.analytics.totalEvents} events
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                <article className="rounded-lg border border-white/10 p-2.5">
                  <p className="text-[11px] uppercase tracking-wide opacity-70">Events (7d)</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">
                    {systemSnapshot.analytics.last7dEvents}
                  </p>
                </article>
                {systemSnapshot.analytics.eventTypeCounts7d.slice(0, 3).map((row) => (
                  <article key={row.eventType} className="rounded-lg border border-white/10 p-2.5">
                    <p className="text-[11px] uppercase tracking-wide opacity-70">
                      {row.eventType.replace(/_/g, " ")}
                    </p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">{row.count}</p>
                  </article>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {systemSnapshot.analytics.eventTypeCounts7d.map((row) => (
                  <span
                    key={row.eventType}
                    className="rounded-full border border-white/10 px-2.5 py-1 text-xs opacity-85"
                  >
                    {row.eventType}: {row.count}
                  </span>
                ))}
                {systemSnapshot.analytics.eventTypeCounts7d.length === 0 ? (
                  <span className="text-xs opacity-70">
                    No analytics events recorded in the last 7 days.
                  </span>
                ) : null}
              </div>
            </div>

            <AdminControlTowerPanels
              systemSnapshot={systemSnapshot}
              publicProbeHistoryLoading={publicProbeHistoryLoading}
              publicProbeHistory={publicProbeHistory}
              publicProbeError={publicProbeError}
              publicProbeRunBusy={publicProbeRunBusy}
              healthCheckBusy={healthCheckBusy}
              healthCheckNote={healthCheckNote}
              recrawlActionNote={recrawlActionNote}
              onNavigate={onNavigate}
              onRunPublicProbeNow={onRunPublicProbeNow}
              onRunSystemHealthCheck={onRunSystemHealthCheck}
              onOpenFreshXCardUrl={onOpenFreshXCardUrl}
              onCopyFreshXCardUrl={onCopyFreshXCardUrl}
            />
          </>
        ) : null}
      </div>

      <div className="admin-surface space-y-3 rounded-xl p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold md:text-base">OAuth Provider Readiness</h4>
            <p className="text-xs opacity-75">
              Configure these keys on local and VPS so social login buttons become active.
            </p>
          </div>
          <span className="text-xs opacity-70">
            {authProviderConfigLoading
              ? "Checking..."
              : `${authProviderConfig.filter((item) => item.enabled).length}/${authProviderConfig.length} live`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="opacity-70">
              <tr>
                <th className="pb-2 pr-3">Provider</th>
                <th className="pb-2 pr-3">Status</th>
                <th className="pb-2 pr-3">Missing Env</th>
                <th className="pb-2">Callback URL</th>
              </tr>
            </thead>
            <tbody>
              {authProviderConfig.map((provider) => (
                <tr key={provider.id} className="border-t border-white/10">
                  <td className="py-2 pr-3">{provider.label}</td>
                  <td className="py-2 pr-3">
                    <span
                      className={
                        provider.enabled
                          ? "rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300"
                          : "rounded-full bg-amber-400/15 px-2 py-0.5 text-xs text-amber-200"
                      }
                    >
                      {provider.enabled ? "Live" : "Setup needed"}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-xs opacity-85">
                    {provider.missingEnv.length > 0 ? provider.missingEnv.join(", ") : "none"}
                  </td>
                  <td className="py-2 text-xs opacity-80">{provider.callbackUrl}</td>
                </tr>
              ))}
              {!authProviderConfigLoading && authProviderConfig.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-3 text-xs opacity-70">
                    Provider readiness is unavailable right now.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold md:text-lg">Registration Intelligence</h3>
          <p className="text-xs opacity-75">
            Who registered by method, plus where onboarding failures happened.
          </p>
        </div>
        <span className="text-xs opacity-70">Window: last {authStats?.windowDays ?? 30} days</span>
      </div>

      {authStatsLoading ? (
        <div className="admin-surface rounded-xl p-4 text-sm opacity-70">
          Loading registration analytics...
        </div>
      ) : null}

      {!authStatsLoading && !authStats ? (
        <div className="admin-surface rounded-xl p-4 text-sm opacity-70">
          Registration analytics not available yet.
        </div>
      ) : null}

      {authStats ? (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <article className="admin-surface rounded-xl p-3">
              <p className="text-xs uppercase tracking-wide opacity-70">Total Attempts</p>
              <p className="mt-1 text-xl font-semibold">{authStats.totals.total}</p>
            </article>
            <article className="admin-surface rounded-xl p-3">
              <p className="text-xs uppercase tracking-wide opacity-70">Successful</p>
              <p className="mt-1 text-xl font-semibold text-emerald-400">
                {authStats.totals.success}
              </p>
            </article>
            <article className="admin-surface rounded-xl p-3">
              <p className="text-xs uppercase tracking-wide opacity-70">Failures</p>
              <p className="mt-1 text-xl font-semibold text-rose-400">
                {authStats.totals.failure}
              </p>
            </article>
            <article className="admin-surface rounded-xl p-3">
              <p className="text-xs uppercase tracking-wide opacity-70">Success Rate</p>
              <p className="mt-1 text-xl font-semibold">
                {authStats.totals.successRate.toFixed(1)}%
              </p>
            </article>
          </div>

          <div className="admin-surface rounded-xl p-3">
            <h4 className="mb-3 text-sm font-semibold">Registration Funnel</h4>
            <div className="space-y-2">
              {authStats.funnel.steps.map((step, index) => {
                const previous = authStats.funnel.steps[index - 1]?.count ?? step.count;
                const progress =
                  previous > 0
                    ? Math.max(8, Math.min(100, Math.round((step.count / previous) * 100)))
                    : 0;

                return (
                  <div key={step.stage} className="rounded-lg border border-white/10 p-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">{step.label}</p>
                      <p className="text-sm tabular-nums">{step.count}</p>
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-amber-300/80 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    {index > 0 ? (
                      <p className="mt-1 text-xs opacity-75">
                        Conversion: {step.conversionFromPrevious.toFixed(1)}% · Drop-off:{" "}
                        {step.dropoffFromPrevious}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs opacity-75">Top of funnel traffic</p>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs opacity-80">
              Overall conversion (view → first login):{" "}
              <span className="font-semibold">
                {authStats.funnel.totals.overallConversionRate.toFixed(1)}%
              </span>
            </p>
          </div>

          <div className="admin-surface overflow-x-auto rounded-xl p-3">
            <h4 className="mb-2 text-sm font-semibold">
              Funnel by Method (Submit → Registered → First Login)
            </h4>
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="opacity-70">
                <tr>
                  <th className="pb-2 pr-3">Method</th>
                  <th className="pb-2 pr-3">Submit</th>
                  <th className="pb-2 pr-3">Registered</th>
                  <th className="pb-2 pr-3">First Login</th>
                  <th className="pb-2 pr-3">Submit→Registered</th>
                  <th className="pb-2 pr-3">Registered→Login</th>
                  <th className="pb-2">End-to-End</th>
                </tr>
              </thead>
              <tbody>
                {authStats.funnelByMethod.map((row) => (
                  <tr key={row.method} className="border-t border-white/10">
                    <td className="py-2 pr-3">{formatMethodLabel(row.method)}</td>
                    <td className="py-2 pr-3">{row.submitAttempted}</td>
                    <td className="py-2 pr-3 text-emerald-400">{row.registeredSuccess}</td>
                    <td className="py-2 pr-3 text-sky-300">{row.firstLoginSuccess}</td>
                    <td className="py-2 pr-3">{row.registrationConversionRate.toFixed(1)}%</td>
                    <td className="py-2 pr-3">{row.firstLoginConversionRate.toFixed(1)}%</td>
                    <td className="py-2">{row.endToEndConversionRate.toFixed(1)}%</td>
                  </tr>
                ))}
                {authStats.funnelByMethod.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-3 opacity-70">
                      No method-level funnel activity in this window yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="admin-surface overflow-x-auto rounded-xl p-3">
            <h4 className="mb-2 text-sm font-semibold">Provider Mix</h4>
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="opacity-70">
                <tr>
                  <th className="pb-2 pr-3">Method</th>
                  <th className="pb-2 pr-3">Success</th>
                  <th className="pb-2 pr-3">Failure</th>
                  <th className="pb-2 pr-3">Total</th>
                  <th className="pb-2">Success %</th>
                </tr>
              </thead>
              <tbody>
                {authStats.providers.map((row) => (
                  <tr key={row.method} className="border-t border-white/10">
                    <td className="py-2 pr-3">{formatMethodLabel(row.method)}</td>
                    <td className="py-2 pr-3 text-emerald-400">{row.success}</td>
                    <td className="py-2 pr-3 text-rose-400">{row.failure}</td>
                    <td className="py-2 pr-3">{row.total}</td>
                    <td className="py-2">{row.successRate.toFixed(1)}%</td>
                  </tr>
                ))}
                {authStats.providers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-3 opacity-70">
                      No registration attempts in this window yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="admin-surface rounded-xl p-3">
              <h4 className="mb-2 text-sm font-semibold">Recent Registrations</h4>
              <ul className="space-y-2 text-sm">
                {authStats.recentSuccesses.slice(0, 8).map((item) => (
                  <li key={item.id} className="rounded-lg border border-white/10 p-2">
                    <p className="font-medium">
                      {item.email || "Unknown email"} · {formatMethodLabel(item.method)}
                    </p>
                    <p className="text-xs opacity-70">
                      {new Date(item.createdAt).toLocaleString()} · {item.user?.name || "No profile"} (
                      {item.user?.role || "n/a"})
                    </p>
                  </li>
                ))}
                {authStats.recentSuccesses.length === 0 ? (
                  <li className="text-xs opacity-70">No successful registrations yet.</li>
                ) : null}
              </ul>
            </div>
            <div className="admin-surface rounded-xl p-3">
              <h4 className="mb-2 text-sm font-semibold text-rose-300">
                Recent Registration Failures
              </h4>
              <ul className="space-y-2 text-sm">
                {authStats.recentFailures.slice(0, 8).map((item) => (
                  <li key={item.id} className="rounded-lg border border-rose-500/25 p-2">
                    <p className="font-medium">
                      {item.email || "Unknown email"} · {formatMethodLabel(item.method)}
                    </p>
                    <p className="text-xs opacity-80">
                      {item.failureCode || "UNSPECIFIED"} · {item.failureMessage || "No detail"} ·{" "}
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </li>
                ))}
                {authStats.recentFailures.length === 0 ? (
                  <li className="text-xs opacity-70">No registration failures in this window.</li>
                ) : null}
              </ul>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
