import type { SystemSnapshot } from "./adminDashboardTypes";

export type OwnedToolsSnapshot = Pick<
  SystemSnapshot,
  "release" | "wsApi" | "tmail" | "pulse" | "publicSurface"
>;

export type OwnedToolCard = {
  id: string;
  label: string;
  tone: "good" | "info" | "warn";
  status: string;
  summary: string;
  detail: string;
  href: string | null;
  ctaLabel: string | null;
};

function summarizeProbeStatus(status: number | null, reachable: boolean): string {
  if (reachable && status) {
    return `ok ${status}`;
  }
  if (reachable) {
    return "ok";
  }
  if (status) {
    return `fail ${status}`;
  }
  return "down";
}

function compactParts(parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" · ");
}

export function buildOwnedToolsRail(snapshot: OwnedToolsSnapshot): OwnedToolCard[] {
  const publicSurfaceHealthy =
    snapshot.publicSurface.homeProbe.ok &&
    snapshot.publicSurface.apexProbe.ok &&
    snapshot.publicSurface.twitterBotProbe.ok &&
    snapshot.publicSurface.socialImageProbe.ok &&
    snapshot.publicSurface.warnings.length === 0;

  const tmailHealthy = snapshot.tmail.publicHealth.reachable && snapshot.tmail.reachable;
  const tmailDegraded =
    snapshot.tmail.configured &&
    (snapshot.tmail.publicHealth.reachable ||
      snapshot.tmail.summaryFeed.reachable ||
      snapshot.tmail.messagesFeed.reachable);

  return [
    {
      id: "app",
      label: "Wheat & Stone App",
      tone: snapshot.publicSurface.homeProbe.ok ? "good" : "warn",
      status: snapshot.publicSurface.homeProbe.ok ? "live" : "degraded",
      summary: compactParts([
        snapshot.release.app.packageVersion,
        snapshot.release.app.buildId,
      ]),
      detail: compactParts([
        snapshot.release.runtime.siteOrigin ?? snapshot.publicSurface.homeUrl,
        snapshot.release.app.gitShaShort ? `git ${snapshot.release.app.gitShaShort}` : null,
      ]),
      href: snapshot.publicSurface.homeUrl,
      ctaLabel: "Open site",
    },
    {
      id: "ws-api",
      label: "WS-API",
      tone:
        snapshot.wsApi.available && snapshot.wsApi.healthReachable
          ? "good"
          : snapshot.wsApi.available || snapshot.wsApi.healthReachable
            ? "warn"
            : "info",
      status:
        snapshot.wsApi.available && snapshot.wsApi.healthReachable
          ? "connected"
          : snapshot.wsApi.available || snapshot.wsApi.healthReachable
            ? "partial"
            : "offline",
      summary: compactParts([
        snapshot.wsApi.contract?.version
          ? `contract ${snapshot.wsApi.contract.version}`
          : "contract unknown",
        snapshot.wsApi.contract?.routeCount !== null && snapshot.wsApi.contract?.routeCount !== undefined
          ? `${snapshot.wsApi.contract.routeCount} routes`
          : null,
      ]),
      detail: compactParts([
        snapshot.wsApi.baseUrl,
        snapshot.wsApi.durability
          ? `${snapshot.wsApi.durability.durableModules ?? "n/a"}/${snapshot.wsApi.durability.totalModules ?? "n/a"} durable`
          : null,
      ]),
      href: null,
      ctaLabel: null,
    },
    {
      id: "tmail",
      label: "TMail",
      tone: tmailHealthy ? "good" : tmailDegraded ? "warn" : snapshot.tmail.configured ? "warn" : "info",
      status: tmailHealthy ? "healthy" : tmailDegraded ? "degraded" : snapshot.tmail.configured ? "configured" : "staged",
      summary: compactParts([
        snapshot.tmail.identityLabel ?? snapshot.tmail.identityId ?? "password reset rail",
        snapshot.tmail.identityEmail,
      ]),
      detail: compactParts([
        `public ${summarizeProbeStatus(
          snapshot.tmail.publicHealth.status,
          snapshot.tmail.publicHealth.reachable,
        )}`,
        `messages ${summarizeProbeStatus(
          snapshot.tmail.messagesFeed.status,
          snapshot.tmail.messagesFeed.reachable,
        )}`,
      ]),
      href: snapshot.tmail.baseUrl,
      ctaLabel: snapshot.tmail.baseUrl ? "Open TMail" : null,
    },
    {
      id: "pulse",
      label: "Pulse",
      tone: snapshot.pulse.reachable ? "good" : snapshot.pulse.configured ? "warn" : "info",
      status: snapshot.pulse.reachable ? "ready" : snapshot.pulse.configured ? "configured" : "staged",
      summary: compactParts([
        snapshot.pulse.projectSlug ? `project ${snapshot.pulse.projectSlug}` : "social rail",
        snapshot.pulse.status,
      ]),
      detail: compactParts([
        snapshot.pulse.webBaseUrl,
        snapshot.pulse.apiBaseUrl,
      ]) || "Set Pulse URLs and token when you are ready to wire social automation in.",
      href: snapshot.pulse.webBaseUrl ?? snapshot.pulse.apiBaseUrl,
      ctaLabel: snapshot.pulse.webBaseUrl || snapshot.pulse.apiBaseUrl ? "Open Pulse" : null,
    },
    {
      id: "public-surface",
      label: "Public Surface",
      tone: publicSurfaceHealthy ? "good" : "warn",
      status: publicSurfaceHealthy ? "healthy" : "attention",
      summary: compactParts([
        `x-card ${snapshot.publicSurface.socialImageVersion}`,
        snapshot.publicSurface.facebookComments.targetArticleUrl ? "comments wired" : "no article target",
      ]),
      detail: compactParts([
        `home ${snapshot.publicSurface.homeProbe.status ?? "n/a"}`,
        `og ${snapshot.publicSurface.socialImageProbe.status ?? "n/a"}`,
        snapshot.publicSurface.warnings.length > 0
          ? `${snapshot.publicSurface.warnings.length} warnings`
          : "no crawler warnings",
      ]),
      href: snapshot.publicSurface.homeUrl,
      ctaLabel: "Open home",
    },
  ];
}
