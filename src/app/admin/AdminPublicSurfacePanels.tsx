"use client";

import type { PublicSurfaceProbeHistory, SystemSnapshot } from "./adminDashboardTypes";
import { probeBadgeClass } from "./adminDashboardPresentation";

type Props = {
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

export function AdminPublicSurfacePanels({
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
}: Props) {
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-white/10 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Public Share + Embed Diagnostics</p>
          <p className="text-xs opacity-75">
            X card version {systemSnapshot.publicSurface.socialImageVersion}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void onRunPublicProbeNow()}
            disabled={publicProbeRunBusy || healthCheckBusy}
            className="rounded border border-white/20 px-2 py-1 text-xs hover:bg-white/10 disabled:opacity-60"
          >
            {publicProbeRunBusy ? "Running probe..." : "Run probe now"}
          </button>
          <button
            type="button"
            onClick={() => void onRunSystemHealthCheck()}
            disabled={healthCheckBusy || publicProbeRunBusy}
            className="rounded border border-sky-300/30 bg-sky-500/10 px-2 py-1 text-xs hover:bg-sky-500/20 disabled:opacity-60"
          >
            {healthCheckBusy ? "Running health check..." : "Run full health check"}
          </button>
        </div>
      </div>
      <p className="mt-1 break-all text-xs opacity-80">
        Origin: <span className="font-semibold">{systemSnapshot.publicSurface.origin}</span>
      </p>
      <div className="mt-3 grid gap-2 md:grid-cols-4">
        <article className="rounded-lg border border-white/10 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Home probe</p>
            <span className={probeBadgeClass(systemSnapshot.publicSurface.homeProbe.ok)}>
              {systemSnapshot.publicSurface.homeProbe.ok ? "OK" : "FAIL"}
            </span>
          </div>
          <p className="mt-1 text-xs opacity-80">
            Status: {systemSnapshot.publicSurface.homeProbe.status ?? "n/a"}
          </p>
          {systemSnapshot.publicSurface.homeProbe.redirectedTo ? (
            <p className="mt-1 break-words text-[11px] text-amber-200/90">
              Redirects to {systemSnapshot.publicSurface.homeProbe.redirectedTo}
            </p>
          ) : null}
        </article>

        <article className="rounded-lg border border-white/10 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Twitterbot probe</p>
            <span className={probeBadgeClass(systemSnapshot.publicSurface.twitterBotProbe.ok)}>
              {systemSnapshot.publicSurface.twitterBotProbe.ok ? "OK" : "FAIL"}
            </span>
          </div>
          <p className="mt-1 text-xs opacity-80">
            Status: {systemSnapshot.publicSurface.twitterBotProbe.status ?? "n/a"}
          </p>
          {systemSnapshot.publicSurface.twitterBotProbe.redirectedTo ? (
            <p className="mt-1 break-words text-[11px] text-amber-200/90">
              Redirects to {systemSnapshot.publicSurface.twitterBotProbe.redirectedTo}
            </p>
          ) : null}
        </article>

        <article className="rounded-lg border border-white/10 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Apex probe</p>
            <span className={probeBadgeClass(systemSnapshot.publicSurface.apexProbe.ok)}>
              {systemSnapshot.publicSurface.apexProbe.ok ? "OK" : "FAIL"}
            </span>
          </div>
          <p className="mt-1 text-xs opacity-80">
            Status: {systemSnapshot.publicSurface.apexProbe.status ?? "n/a"}
          </p>
          {systemSnapshot.publicSurface.apexProbe.redirectedTo ? (
            <p className="mt-1 break-words text-[11px] text-amber-200/90">
              Redirects to {systemSnapshot.publicSurface.apexProbe.redirectedTo}
            </p>
          ) : null}
        </article>

        <article className="rounded-lg border border-white/10 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-80">OG image probe</p>
            <span className={probeBadgeClass(systemSnapshot.publicSurface.socialImageProbe.ok)}>
              {systemSnapshot.publicSurface.socialImageProbe.ok ? "OK" : "FAIL"}
            </span>
          </div>
          <p className="mt-1 break-words text-xs opacity-80">
            Status: {systemSnapshot.publicSurface.socialImageProbe.status ?? "n/a"} ·{" "}
            {systemSnapshot.publicSurface.socialImageProbe.contentType || "unknown content-type"}
          </p>
        </article>
      </div>
      <p className="mt-3 text-xs opacity-80">
        Home meta: og:image{" "}
        <span className="font-semibold">
          {systemSnapshot.publicSurface.homeMeta.hasOgImage ? "present" : "missing"}
        </span>{" "}
        ({systemSnapshot.publicSurface.homeMeta.ogImageCount}) · absolute{" "}
        <span className="font-semibold">
          {systemSnapshot.publicSurface.homeMeta.hasAbsoluteOgImage ? "yes" : "no"}
        </span>{" "}
        · twitter:image{" "}
        <span className="font-semibold">{systemSnapshot.publicSurface.homeMeta.twitterImageCount}</span> ·
        twitter:card{" "}
        <span className="font-semibold">
          {systemSnapshot.publicSurface.homeMeta.hasTwitterCard ? "present" : "missing"}
        </span>{" "}
        · summary_large_image{" "}
        <span className="font-semibold">
          {systemSnapshot.publicSurface.homeMeta.hasSummaryLargeImage ? "present" : "missing"}
        </span>
      </p>
      <p className="mt-1 text-xs opacity-80">
        Twitterbot meta: og:image{" "}
        <span className="font-semibold">
          {systemSnapshot.publicSurface.twitterBotMeta.hasOgImage ? "present" : "missing"}
        </span>{" "}
        ({systemSnapshot.publicSurface.twitterBotMeta.ogImageCount}) · absolute{" "}
        <span className="font-semibold">
          {systemSnapshot.publicSurface.twitterBotMeta.hasAbsoluteOgImage ? "yes" : "no"}
        </span>{" "}
        · twitter:image{" "}
        <span className="font-semibold">
          {systemSnapshot.publicSurface.twitterBotMeta.twitterImageCount}
        </span>{" "}
        · twitter:card{" "}
        <span className="font-semibold">
          {systemSnapshot.publicSurface.twitterBotMeta.hasTwitterCard ? "present" : "missing"}
        </span>{" "}
        · summary_large_image{" "}
        <span className="font-semibold">
          {systemSnapshot.publicSurface.twitterBotMeta.hasSummaryLargeImage ? "present" : "missing"}
        </span>
      </p>
      {systemSnapshot.publicSurface.warnings.length > 0 ? (
        <div className="mt-2 rounded-lg border border-amber-300/35 bg-amber-300/10 p-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-100">
            Public Surface Warnings
          </p>
          <ul className="mt-1 space-y-1 text-xs text-amber-100/90">
            {systemSnapshot.publicSurface.warnings.map((warning) => (
              <li key={warning}>• {warning}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="mt-2 rounded-lg border border-emerald-400/25 bg-emerald-500/10 p-2.5 text-xs text-emerald-200">
          No crawler warnings from latest probe.
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <a
          href={systemSnapshot.publicSurface.homeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded border border-white/20 px-2 py-1 hover:bg-white/10"
        >
          Open home
        </a>
        <a
          href={systemSnapshot.publicSurface.xCardBypassUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded border border-white/20 px-2 py-1 hover:bg-white/10"
        >
          Open X-card bypass URL
        </a>
        <a
          href={systemSnapshot.publicSurface.socialImageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded border border-white/20 px-2 py-1 hover:bg-white/10"
        >
          Open OG image
        </a>
      </div>
      <div className="mt-3 rounded-lg border border-sky-300/25 bg-sky-500/10 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-100">
          Force Recrawl Checklist (One-Click)
        </p>
        <ol className="mt-2 space-y-2 text-xs text-sky-100/90">
          <li className="rounded border border-white/10 bg-black/20 p-2">
            <p className="font-semibold">1. Generate a fresh X share URL</p>
            <p className="mt-1 opacity-85">
              Use a unique querystring so X treats it as a fresh URL and recrawls.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onOpenFreshXCardUrl}
                className="rounded border border-white/20 px-2 py-1 hover:bg-white/10"
              >
                Open fresh X URL
              </button>
              <button
                type="button"
                onClick={() => void onCopyFreshXCardUrl()}
                className="rounded border border-white/20 px-2 py-1 hover:bg-white/10"
              >
                Copy fresh X URL
              </button>
            </div>
          </li>
          <li className="rounded border border-white/10 bg-black/20 p-2">
            <p className="font-semibold">2. Confirm image and metadata endpoints</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <a
                href={systemSnapshot.publicSurface.socialImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded border border-white/20 px-2 py-1 hover:bg-white/10"
              >
                Open OG image
              </a>
              <a
                href={systemSnapshot.publicSurface.homeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded border border-white/20 px-2 py-1 hover:bg-white/10"
              >
                Open home source
              </a>
              <a
                href={`${systemSnapshot.publicSurface.origin}/robots.txt`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded border border-white/20 px-2 py-1 hover:bg-white/10"
              >
                Open robots.txt
              </a>
            </div>
          </li>
          <li className="rounded border border-white/10 bg-black/20 p-2">
            <p className="font-semibold">3. Run probes and health checks</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void onRunPublicProbeNow()}
                disabled={publicProbeRunBusy || healthCheckBusy}
                className="rounded border border-white/20 px-2 py-1 hover:bg-white/10 disabled:opacity-60"
              >
                {publicProbeRunBusy ? "Running probe..." : "Run probe now"}
              </button>
              <button
                type="button"
                onClick={() => void onRunSystemHealthCheck()}
                disabled={healthCheckBusy || publicProbeRunBusy}
                className="rounded border border-white/20 px-2 py-1 hover:bg-white/10 disabled:opacity-60"
              >
                {healthCheckBusy ? "Running health check..." : "Run full health check"}
              </button>
            </div>
          </li>
        </ol>
        {recrawlActionNote ? <p className="mt-2 text-[11px] text-sky-200">{recrawlActionNote}</p> : null}
      </div>
      {publicProbeError ? (
        <p className="mt-2 text-xs text-rose-300">Probe history error: {publicProbeError}</p>
      ) : null}
      {healthCheckNote ? <p className="mt-1 text-xs text-sky-200">{healthCheckNote}</p> : null}
      <div className="mt-3 overflow-x-auto rounded-lg border border-white/10 p-2.5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide opacity-80">Probe History</p>
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead className="opacity-70">
            <tr>
              <th className="pb-1.5 pr-2">Run Time</th>
              <th className="pb-1.5 pr-2">Home</th>
              <th className="pb-1.5 pr-2">Apex</th>
              <th className="pb-1.5 pr-2">OG</th>
              <th className="pb-1.5 pr-2">Meta</th>
              <th className="pb-1.5">Operator</th>
            </tr>
          </thead>
          <tbody>
            {publicProbeHistory?.rows.map((row) => (
              <tr key={row.id} className="border-t border-white/10">
                <td className="py-1.5 pr-2">{new Date(row.createdAt).toLocaleString()}</td>
                <td className="py-1.5 pr-2">{row.homeStatus ?? "n/a"}</td>
                <td className="py-1.5 pr-2">{row.apexStatus ?? "n/a"}</td>
                <td className="py-1.5 pr-2">
                  {row.socialImageStatus ?? "n/a"}{" "}
                  {row.socialImageContentType ? `(${row.socialImageContentType})` : ""}
                </td>
                <td className="py-1.5 pr-2">
                  og:{row.hasOgImage ? "y" : "n"} · tw:{row.hasTwitterCard ? "y" : "n"} · lg:
                  {row.hasSummaryLargeImage ? "y" : "n"}
                </td>
                <td className="py-1.5">{row.actorEmail || "n/a"}</td>
              </tr>
            ))}
            {publicProbeHistoryLoading ? (
              <tr>
                <td colSpan={6} className="py-2 opacity-70">
                  Loading probe history...
                </td>
              </tr>
            ) : null}
            {!publicProbeHistoryLoading &&
            (!publicProbeHistory || publicProbeHistory.rows.length === 0) ? (
              <tr>
                <td colSpan={6} className="py-2 opacity-70">
                  No probe runs yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {systemSnapshot.publicSurface.homeProbe.error ? (
        <p className="mt-2 text-xs text-rose-300">
          Home probe error: {systemSnapshot.publicSurface.homeProbe.error}
        </p>
      ) : null}
      {systemSnapshot.publicSurface.twitterBotProbe.error ? (
        <p className="mt-1 text-xs text-rose-300">
          Twitterbot probe error: {systemSnapshot.publicSurface.twitterBotProbe.error}
        </p>
      ) : null}
      {systemSnapshot.publicSurface.apexProbe.error ? (
        <p className="mt-1 text-xs text-rose-300">
          Apex probe error: {systemSnapshot.publicSurface.apexProbe.error}
        </p>
      ) : null}
      {systemSnapshot.publicSurface.socialImageProbe.error ? (
        <p className="mt-1 text-xs text-rose-300">
          OG image probe error: {systemSnapshot.publicSurface.socialImageProbe.error}
        </p>
      ) : null}
    </div>
  );
}
