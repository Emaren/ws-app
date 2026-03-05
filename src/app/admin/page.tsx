"use client";

import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { hasAnyRole, isStaffRole, normalizeAppRole, RBAC_ROLE_GROUPS } from "@/lib/rbac";
import {
  canDeleteArticle,
  normalizeArticleStatus,
  statusBadgeClassName,
  statusBadgeLabel,
} from "@/lib/articleLifecycle";

type Article = {
  id: string;
  title: string;
  slug: string;
  status: string;
  authorId: string | null;
  createdAt: string;
  updatedAt?: string;
  publishedAt?: string | null;
};

type RegistrationProviderStats = {
  method: string;
  success: number;
  failure: number;
  total: number;
  successRate: number;
};

type RecentRegistration = {
  id: string;
  email: string | null;
  method: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    role: string;
  } | null;
};

type RecentRegistrationFailure = {
  id: string;
  email: string | null;
  method: string;
  failureCode: string | null;
  failureMessage: string | null;
  createdAt: string;
};

type AuthFunnelStep = {
  stage: string;
  label: string;
  count: number;
  conversionFromPrevious: number;
  dropoffFromPrevious: number;
};

type AuthRegistrationStats = {
  windowDays: number;
  generatedAt: string;
  totals: {
    success: number;
    failure: number;
    total: number;
    successRate: number;
  };
  providers: RegistrationProviderStats[];
  recentSuccesses: RecentRegistration[];
  recentFailures: RecentRegistrationFailure[];
  topFailureCodes: Array<{ code: string; count: number }>;
  funnel: {
    steps: AuthFunnelStep[];
    totals: {
      viewStarted: number;
      submitAttempted: number;
      registeredSuccess: number;
      firstLoginSuccess: number;
      overallConversionRate: number;
    };
  };
  funnelByMethod: Array<{
    method: string;
    submitAttempted: number;
    registeredSuccess: number;
    firstLoginSuccess: number;
    registrationConversionRate: number;
    firstLoginConversionRate: number;
    endToEndConversionRate: number;
  }>;
};

type AuthProviderConfig = {
  id: string;
  label: string;
  enabled: boolean;
  missingEnv: string[];
  callbackUrl: string;
};

type AuthProviderConfigResponse = {
  generatedAt: string;
  providers: AuthProviderConfig[];
};

type SystemSnapshot = {
  generatedAt: string;
  localDb: {
    usersCount: number;
    ownerAdminUsersCount: number;
    articlesCount: number;
    commentsCount: number;
    reactionsCount: number;
    businessesCount: number;
    offersCount: number;
    liveOffersCount: number;
    userOfferInboxActiveCount: number;
    passwordResetPendingCount: number;
    authRegistrationEvents30dCount: number;
    authFunnelEvents30dCount: number;
    passwordResetDelivered7dCount: number;
    passwordResetFailed7dCount: number;
  };
  wsApi: {
    available: boolean;
    hasAccessToken: boolean;
    usersCount: number | null;
    error: string | null;
  };
  integrations: {
    passwordResetEmail: {
      provider: string;
      configured: boolean;
      debugLinkExposureEnabled: boolean;
    };
    wsApiBridge: {
      configured: boolean;
    };
  };
  publicSurface: {
    origin: string;
    homeUrl: string;
    apexUrl: string;
    xCardBypassUrl: string;
    socialImageUrl: string;
    socialImageVersion: string;
    homeProbe: {
      ok: boolean;
      status: number | null;
      redirectedTo: string | null;
      contentType: string | null;
      contentLength: string | null;
      error: string | null;
    };
    twitterBotProbe: {
      ok: boolean;
      status: number | null;
      redirectedTo: string | null;
      contentType: string | null;
      contentLength: string | null;
      error: string | null;
    };
    apexProbe: {
      ok: boolean;
      status: number | null;
      redirectedTo: string | null;
      contentType: string | null;
      contentLength: string | null;
      error: string | null;
    };
    socialImageProbe: {
      ok: boolean;
      status: number | null;
      redirectedTo: string | null;
      contentType: string | null;
      contentLength: string | null;
      error: string | null;
    };
    homeMeta: {
      hasOgImage: boolean;
      hasTwitterCard: boolean;
      hasSummaryLargeImage: boolean;
      ogImageCount: number;
      twitterImageCount: number;
      hasAbsoluteOgImage: boolean;
      hasAbsoluteTwitterImage: boolean;
      ogImageValues: string[];
      twitterImageValues: string[];
    };
    twitterBotMeta: {
      hasOgImage: boolean;
      hasTwitterCard: boolean;
      hasSummaryLargeImage: boolean;
      ogImageCount: number;
      twitterImageCount: number;
      hasAbsoluteOgImage: boolean;
      hasAbsoluteTwitterImage: boolean;
      ogImageValues: string[];
      twitterImageValues: string[];
    };
    warnings: string[];
    facebookComments: {
      targetArticleUrl: string | null;
      embedUrl: string | null;
      note: string;
    };
  };
  passwordResetRecentDispatches: Array<{
    id: string;
    email: string;
    source: string;
    provider: string;
    delivered: boolean;
    reason: string | null;
    requestedByEmail: string | null;
    createdAt: string;
  }>;
  recentUsers: Array<{
    id: string;
    email: string;
    name: string;
    role: string;
    registeredVia: string;
    registeredAt: string;
    lastAuthProvider: string | null;
    lastAuthAt: string | null;
    createdAt: string;
  }>;
};

type PublicSurfaceProbeRun = {
  id: string;
  actorUserId: string | null;
  actorEmail: string | null;
  origin: string;
  homeUrl: string;
  apexUrl: string;
  socialImageUrl: string;
  xCardBypassUrl: string;
  homeStatus: number | null;
  apexStatus: number | null;
  socialImageStatus: number | null;
  homeRedirectedTo: string | null;
  apexRedirectedTo: string | null;
  socialImageContentType: string | null;
  hasOgImage: boolean;
  hasTwitterCard: boolean;
  hasSummaryLargeImage: boolean;
  createdAt: string;
};

type PublicSurfaceProbeHistory = {
  generatedAt: string;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  rows: PublicSurfaceProbeRun[];
};

function probeBadgeClass(ok: boolean): string {
  return ok
    ? "rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300"
    : "rounded-full bg-rose-500/20 px-2 py-0.5 text-xs text-rose-200";
}

function formatMethodLabel(method: string): string {
  if (method === "CREDENTIALS") return "Email + Password";
  if (method === "GOOGLE") return "Google";
  if (method === "APPLE") return "Apple";
  if (method === "MICROSOFT") return "Microsoft";
  if (method === "FACEBOOK") return "Facebook";
  if (method === "INSTAGRAM") return "Instagram";
  if (method === "GITHUB") return "GitHub";
  return method;
}

export default function AdminDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [authStatsLoading, setAuthStatsLoading] = useState(false);
  const [authStats, setAuthStats] = useState<AuthRegistrationStats | null>(null);
  const [authProviderConfigLoading, setAuthProviderConfigLoading] = useState(false);
  const [authProviderConfig, setAuthProviderConfig] = useState<AuthProviderConfig[]>(
    [],
  );
  const [systemSnapshotLoading, setSystemSnapshotLoading] = useState(false);
  const [systemSnapshot, setSystemSnapshot] = useState<SystemSnapshot | null>(null);
  const [publicProbeHistoryLoading, setPublicProbeHistoryLoading] = useState(false);
  const [publicProbeHistory, setPublicProbeHistory] = useState<PublicSurfaceProbeHistory | null>(
    null,
  );
  const [publicProbeError, setPublicProbeError] = useState<string | null>(null);
  const [publicProbeRunBusy, setPublicProbeRunBusy] = useState(false);
  const [healthCheckBusy, setHealthCheckBusy] = useState(false);
  const [healthCheckNote, setHealthCheckNote] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const role = normalizeAppRole(session?.user?.role);
  const canDeleteAsStaff = isStaffRole(role);
  const isOwnerAdmin = hasAnyRole(role, RBAC_ROLE_GROUPS.ownerAdmin);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/articles?scope=all", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data: Article[] = await res.json();
      setArticles(data ?? []);
    } catch (error) {
      console.error(error);
      alert("Failed to load articles.");
    } finally {
      setLoading(false);
    }
  }

  async function loadAuthStats() {
    if (!isOwnerAdmin) {
      setAuthStats(null);
      return;
    }

    setAuthStatsLoading(true);
    try {
      const res = await fetch("/api/admin/auth/registration-stats?days=30", {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(String(res.status));
      }
      const data = (await res.json()) as AuthRegistrationStats;
      setAuthStats(data);
    } catch (error) {
      console.error(error);
      setAuthStats(null);
    } finally {
      setAuthStatsLoading(false);
    }
  }

  async function loadAuthProviderConfig() {
    if (!isOwnerAdmin) {
      setAuthProviderConfig([]);
      return;
    }

    setAuthProviderConfigLoading(true);
    try {
      const res = await fetch("/api/admin/auth/provider-config", {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(String(res.status));
      }
      const data = (await res.json()) as AuthProviderConfigResponse;
      setAuthProviderConfig(data.providers ?? []);
    } catch (error) {
      console.error(error);
      setAuthProviderConfig([]);
    } finally {
      setAuthProviderConfigLoading(false);
    }
  }

  async function loadSystemSnapshot() {
    if (!isOwnerAdmin) {
      setSystemSnapshot(null);
      return;
    }

    setSystemSnapshotLoading(true);
    try {
      const res = await fetch("/api/admin/system/snapshot", {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(String(res.status));
      }
      const data = (await res.json()) as SystemSnapshot;
      setSystemSnapshot(data);
    } catch (error) {
      console.error(error);
      setSystemSnapshot(null);
    } finally {
      setSystemSnapshotLoading(false);
    }
  }

  async function loadPublicProbeHistory() {
    if (!isOwnerAdmin) {
      setPublicProbeHistory(null);
      return;
    }

    setPublicProbeHistoryLoading(true);
    setPublicProbeError(null);
    try {
      const res = await fetch("/api/admin/system/public-surface?page=1&pageSize=8", {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(String(res.status));
      }
      const data = (await res.json()) as PublicSurfaceProbeHistory;
      setPublicProbeHistory(data);
    } catch (error) {
      console.error(error);
      setPublicProbeHistory(null);
      setPublicProbeError(error instanceof Error ? error.message : String(error));
    } finally {
      setPublicProbeHistoryLoading(false);
    }
  }

  async function runPublicProbeNow() {
    if (!isOwnerAdmin) return;
    setPublicProbeRunBusy(true);
    setPublicProbeError(null);
    try {
      const res = await fetch("/api/admin/system/public-surface", {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error(String(res.status));
      }

      await Promise.all([loadSystemSnapshot(), loadPublicProbeHistory()]);
    } catch (error) {
      console.error(error);
      setPublicProbeError(error instanceof Error ? error.message : String(error));
    } finally {
      setPublicProbeRunBusy(false);
    }
  }

  async function runSystemHealthCheck() {
    if (!isOwnerAdmin) return;
    setHealthCheckBusy(true);
    setHealthCheckNote(null);
    setPublicProbeError(null);
    try {
      const res = await fetch("/api/admin/system/health-check", {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error(String(res.status));
      }
      const payload = (await res.json()) as {
        identitySummary?: {
          roleMismatchCount: number;
          localOnlyCount: number;
          wsApiOnlyCount: number;
        };
        warnings?: string[];
      };
      const summary = payload.identitySummary;
      setHealthCheckNote(
        summary
          ? `Health check complete: mismatch=${summary.roleMismatchCount}, localOnly=${summary.localOnlyCount}, wsOnly=${summary.wsApiOnlyCount}`
          : "Health check complete.",
      );
      await Promise.all([
        loadSystemSnapshot(),
        loadPublicProbeHistory(),
      ]);
    } catch (error) {
      console.error(error);
      setPublicProbeError(error instanceof Error ? error.message : String(error));
    } finally {
      setHealthCheckBusy(false);
    }
  }

  async function reloadAll() {
    await Promise.all([
      load(),
      loadAuthStats(),
      loadAuthProviderConfig(),
      loadSystemSnapshot(),
      loadPublicProbeHistory(),
    ]);
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    void loadAuthStats();
  }, [isOwnerAdmin]);

  useEffect(() => {
    void loadAuthProviderConfig();
  }, [isOwnerAdmin]);

  useEffect(() => {
    void loadSystemSnapshot();
  }, [isOwnerAdmin]);

  useEffect(() => {
    void loadPublicProbeHistory();
  }, [isOwnerAdmin]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter(
      (article) =>
        article.title.toLowerCase().includes(q) ||
        article.slug.toLowerCase().includes(q),
    );
  }, [articles, query]);

  const dashboard = useMemo(() => {
    const draft = articles.filter((article) => {
      const status = normalizeArticleStatus(article.status);
      return status === "DRAFT" || status === "REVIEW";
    }).length;
    const published = articles.filter(
      (article) => normalizeArticleStatus(article.status) === "PUBLISHED",
    ).length;
    const archived = articles.filter(
      (article) => normalizeArticleStatus(article.status) === "ARCHIVED",
    ).length;
    const latest = [...articles]
      .map((article) => article.updatedAt || article.createdAt)
      .sort((a, b) => Date.parse(b) - Date.parse(a))[0];

    return {
      total: articles.length,
      draft,
      published,
      archived,
      latest:
        latest && Number.isFinite(Date.parse(latest))
          ? new Date(latest).toLocaleDateString()
          : "n/a",
    };
  }, [articles]);

  async function handleDelete(slug: string) {
    if (!confirm("Delete this article? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/articles/${encodeURIComponent(slug)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(String(res.status));
      startTransition(() => {
        setArticles((prev) => prev.filter((article) => article.slug !== slug));
      });
    } catch (error) {
      console.error(error);
      alert("Delete failed.");
    }
  }

  return (
    <section className="space-y-4 md:space-y-5">
      <div className="admin-card p-4 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold md:text-2xl">
              Operations Dashboard
            </h2>
            <p className="mt-1 text-sm opacity-75">
              Role-aware article operations with mobile-first controls.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={reloadAll}
              className="rounded-xl border px-3 py-2 text-sm transition hover:bg-white/5 disabled:opacity-60"
              disabled={
                loading ||
                authStatsLoading ||
                authProviderConfigLoading ||
                systemSnapshotLoading ||
                publicProbeHistoryLoading ||
                isPending
              }
            >
              {loading ||
              authStatsLoading ||
              authProviderConfigLoading ||
              systemSnapshotLoading ||
              publicProbeHistoryLoading
                ? "Loading..."
                : "Reload"}
            </button>
            {canDeleteAsStaff ? (
              <>
                <button
                  onClick={() => router.push("/admin/offers")}
                  className="rounded-xl border border-red-500/45 bg-red-500/15 px-3 py-2 text-sm font-medium transition hover:bg-red-500/25"
                >
                  Offers Command
                </button>
                {isOwnerAdmin ? (
                  <>
                    <button
                      onClick={() => router.push("/admin/access")}
                      className="rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-3 py-2 text-sm font-medium transition hover:bg-emerald-500/25"
                    >
                      Access Control
                    </button>
                    <button
                      onClick={() => router.push("/admin/company")}
                      className="rounded-xl border border-sky-400/40 bg-sky-500/15 px-3 py-2 text-sm font-medium transition hover:bg-sky-500/25"
                    >
                      Company Dashboards
                    </button>
                    <button
                      onClick={() => router.push("/admin/data")}
                      className="rounded-xl border border-violet-400/40 bg-violet-500/15 px-3 py-2 text-sm font-medium transition hover:bg-violet-500/25"
                    >
                      Data Explorer
                    </button>
                  </>
                ) : null}
              </>
            ) : null}
            <button
              onClick={() => router.push("/admin/new")}
              className="rounded-xl border border-amber-300/40 bg-amber-200/20 px-3 py-2 text-sm font-medium transition hover:bg-amber-200/30"
            >
              New Article
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <article className="admin-surface rounded-xl p-3 md:p-4">
          <p className="text-xs uppercase tracking-wide opacity-70">Total</p>
          <p className="mt-1 text-xl font-semibold md:text-2xl">
            {dashboard.total}
          </p>
        </article>
        <article className="admin-surface rounded-xl p-3 md:p-4">
          <p className="text-xs uppercase tracking-wide opacity-70">Draft/Review</p>
          <p className="mt-1 text-xl font-semibold md:text-2xl">
            {dashboard.draft}
          </p>
        </article>
        <article className="admin-surface rounded-xl p-3 md:p-4">
          <p className="text-xs uppercase tracking-wide opacity-70">Published</p>
          <p className="mt-1 text-xl font-semibold md:text-2xl">
            {dashboard.published}
          </p>
        </article>
        <article className="admin-surface rounded-xl p-3 md:p-4">
          <p className="text-xs uppercase tracking-wide opacity-70">Archived</p>
          <p className="mt-1 text-xl font-semibold md:text-2xl">
            {dashboard.archived}
          </p>
        </article>
        <article className="admin-surface col-span-2 rounded-xl p-3 md:col-span-1 md:p-4">
          <p className="text-xs uppercase tracking-wide opacity-70">Last Updated</p>
          <p className="mt-1 text-base font-semibold md:text-lg">
            {dashboard.latest}
          </p>
        </article>
      </div>

      <div className="admin-card p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <input
            type="search"
            placeholder="Filter by title or slug"
            className="admin-surface w-full rounded-xl px-3 py-2 text-sm"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <span className="text-xs opacity-70 md:whitespace-nowrap">
            Showing {filtered.length} of {articles.length}
          </span>
        </div>
      </div>

      {isOwnerAdmin ? (
        <div className="admin-card space-y-4 p-4 md:p-5">
          <div className="admin-surface space-y-3 rounded-xl p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold md:text-base">
                  System Data Snapshot
                </h4>
                <p className="text-xs opacity-75">
                  Direct live counts from your app database so you don&apos;t need Prisma Studio for routine checks.
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
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  <article className="rounded-lg border border-white/10 p-2.5">
                    <p className="text-[11px] uppercase tracking-wide opacity-70">Users</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">
                      {systemSnapshot.localDb.usersCount}
                    </p>
                  </article>
                  <article className="rounded-lg border border-white/10 p-2.5">
                    <p className="text-[11px] uppercase tracking-wide opacity-70">Owner/Admin</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">
                      {systemSnapshot.localDb.ownerAdminUsersCount}
                    </p>
                  </article>
                  <article className="rounded-lg border border-white/10 p-2.5">
                    <p className="text-[11px] uppercase tracking-wide opacity-70">Articles</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">
                      {systemSnapshot.localDb.articlesCount}
                    </p>
                  </article>
                  <article className="rounded-lg border border-white/10 p-2.5">
                    <p className="text-[11px] uppercase tracking-wide opacity-70">Reactions</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">
                      {systemSnapshot.localDb.reactionsCount}
                    </p>
                  </article>
                  <article className="rounded-lg border border-white/10 p-2.5">
                    <p className="text-[11px] uppercase tracking-wide opacity-70">Offers</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">
                      {systemSnapshot.localDb.offersCount}
                    </p>
                  </article>
                  <article className="rounded-lg border border-white/10 p-2.5">
                    <p className="text-[11px] uppercase tracking-wide opacity-70">Live Offers</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">
                      {systemSnapshot.localDb.liveOffersCount}
                    </p>
                  </article>
                  <article className="rounded-lg border border-white/10 p-2.5">
                    <p className="text-[11px] uppercase tracking-wide opacity-70">Offer Inbox Active</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">
                      {systemSnapshot.localDb.userOfferInboxActiveCount}
                    </p>
                  </article>
                  <article className="rounded-lg border border-white/10 p-2.5">
                    <p className="text-[11px] uppercase tracking-wide opacity-70">Reset Tokens Live</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">
                      {systemSnapshot.localDb.passwordResetPendingCount}
                    </p>
                  </article>
                  <article className="rounded-lg border border-white/10 p-2.5">
                    <p className="text-[11px] uppercase tracking-wide opacity-70">Reset Delivered (7d)</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-300">
                      {systemSnapshot.localDb.passwordResetDelivered7dCount}
                    </p>
                  </article>
                  <article className="rounded-lg border border-white/10 p-2.5">
                    <p className="text-[11px] uppercase tracking-wide opacity-70">Reset Failed (7d)</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums text-rose-300">
                      {systemSnapshot.localDb.passwordResetFailed7dCount}
                    </p>
                  </article>
                </div>

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
                    Access token: {systemSnapshot.wsApi.hasAccessToken ? "present" : "missing"} ·
                    WS users: {systemSnapshot.wsApi.usersCount ?? "n/a"}
                  </p>
                  {systemSnapshot.wsApi.error ? (
                    <p className="mt-1 text-xs text-rose-300">
                      {systemSnapshot.wsApi.error}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-lg border border-white/10 p-3">
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
                      {systemSnapshot.integrations.passwordResetEmail.debugLinkExposureEnabled
                        ? "enabled"
                        : "disabled"}
                    </span>
                  </p>
                  <p className="mt-1 text-xs opacity-80">
                    WS-API password bridge key:{" "}
                    <span className="font-semibold">
                      {systemSnapshot.integrations.wsApiBridge.configured ? "configured" : "missing"}
                    </span>
                  </p>
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

                <div className="rounded-lg border border-white/10 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">Public Share + Embed Diagnostics</p>
                      <p className="text-xs opacity-75">
                        X card version {systemSnapshot.publicSurface.socialImageVersion}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void runPublicProbeNow()}
                        disabled={publicProbeRunBusy || healthCheckBusy}
                        className="rounded border border-white/20 px-2 py-1 text-xs hover:bg-white/10 disabled:opacity-60"
                      >
                        {publicProbeRunBusy ? "Running probe..." : "Run probe now"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void runSystemHealthCheck()}
                        disabled={healthCheckBusy || publicProbeRunBusy}
                        className="rounded border border-sky-300/30 bg-sky-500/10 px-2 py-1 text-xs hover:bg-sky-500/20 disabled:opacity-60"
                      >
                        {healthCheckBusy ? "Running health check..." : "Run full health check"}
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 text-xs opacity-80">
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
                        <p className="mt-1 text-[11px] text-amber-200/90">
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
                        <p className="mt-1 text-[11px] text-amber-200/90">
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
                        <p className="mt-1 text-[11px] text-amber-200/90">
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
                      <p className="mt-1 text-xs opacity-80">
                        Status: {systemSnapshot.publicSurface.socialImageProbe.status ?? "n/a"} ·{" "}
                        {systemSnapshot.publicSurface.socialImageProbe.contentType || "unknown content-type"}
                      </p>
                    </article>
                  </div>
                  <p className="mt-3 text-xs opacity-80">
                    Home meta: og:image{" "}
                    <span className="font-semibold">
                      {systemSnapshot.publicSurface.homeMeta.hasOgImage ? "present" : "missing"}
                    </span>
                    {" "}({systemSnapshot.publicSurface.homeMeta.ogImageCount}) · absolute{" "}
                    <span className="font-semibold">
                      {systemSnapshot.publicSurface.homeMeta.hasAbsoluteOgImage ? "yes" : "no"}
                    </span>
                    {" "}· twitter:image{" "}
                    <span className="font-semibold">
                      {systemSnapshot.publicSurface.homeMeta.twitterImageCount}
                    </span>
                    {" "}
                    · twitter:card{" "}
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
                    </span>
                    {" "}({systemSnapshot.publicSurface.twitterBotMeta.ogImageCount}) · absolute{" "}
                    <span className="font-semibold">
                      {systemSnapshot.publicSurface.twitterBotMeta.hasAbsoluteOgImage ? "yes" : "no"}
                    </span>
                    {" "}· twitter:image{" "}
                    <span className="font-semibold">
                      {systemSnapshot.publicSurface.twitterBotMeta.twitterImageCount}
                    </span>
                    {" "}
                    · twitter:card{" "}
                    <span className="font-semibold">
                      {systemSnapshot.publicSurface.twitterBotMeta.hasTwitterCard ? "present" : "missing"}
                    </span>{" "}
                    · summary_large_image{" "}
                    <span className="font-semibold">
                      {systemSnapshot.publicSurface.twitterBotMeta.hasSummaryLargeImage
                        ? "present"
                        : "missing"}
                    </span>
                  </p>
                  <p className="mt-1 text-xs opacity-80">
                    Facebook target:{" "}
                    {systemSnapshot.publicSurface.facebookComments.targetArticleUrl ? (
                      <span className="font-semibold">
                        {systemSnapshot.publicSurface.facebookComments.targetArticleUrl}
                      </span>
                    ) : (
                      "No published article yet"
                    )}
                  </p>
                  <p className="mt-1 text-xs opacity-75">
                    {systemSnapshot.publicSurface.facebookComments.note}
                  </p>
                  {systemSnapshot.publicSurface.warnings.length > 0 ? (
                    <div className="mt-2 rounded-lg border border-amber-300/35 bg-amber-300/10 p-2.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-100">
                        Crawler + Embed Warnings
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
                    {systemSnapshot.publicSurface.facebookComments.embedUrl ? (
                      <a
                        href={systemSnapshot.publicSurface.facebookComments.embedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded border border-white/20 px-2 py-1 hover:bg-white/10"
                      >
                        Open FB plugin URL
                      </a>
                    ) : null}
                  </div>
                  {publicProbeError ? (
                    <p className="mt-2 text-xs text-rose-300">
                      Probe history error: {publicProbeError}
                    </p>
                  ) : null}
                  {healthCheckNote ? (
                    <p className="mt-1 text-xs text-sky-200">
                      {healthCheckNote}
                    </p>
                  ) : null}
                  <div className="mt-3 overflow-x-auto rounded-lg border border-white/10 p-2.5">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide opacity-80">
                      Probe History
                    </p>
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
                            <td className="py-1.5 pr-2">
                              {new Date(row.createdAt).toLocaleString()}
                            </td>
                            <td className="py-1.5 pr-2">{row.homeStatus ?? "n/a"}</td>
                            <td className="py-1.5 pr-2">{row.apexStatus ?? "n/a"}</td>
                            <td className="py-1.5 pr-2">
                              {row.socialImageStatus ?? "n/a"}{" "}
                              {row.socialImageContentType ? `(${row.socialImageContentType})` : ""}
                            </td>
                            <td className="py-1.5 pr-2">
                              og:{row.hasOgImage ? "y" : "n"} · tw:{row.hasTwitterCard ? "y" : "n"} ·
                              lg:{row.hasSummaryLargeImage ? "y" : "n"}
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
                          <td className="py-2 pr-3">
                            {new Date(user.registeredAt).toLocaleString()}
                          </td>
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
            ) : null}
          </div>

          <div className="admin-surface space-y-3 rounded-xl p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold md:text-base">
                  OAuth Provider Readiness
                </h4>
                <p className="text-xs opacity-75">
                  Configure these keys on local and VPS so social login buttons become active.
                </p>
              </div>
              <span className="text-xs opacity-70">
                {authProviderConfigLoading
                  ? "Checking..."
                  : `${authProviderConfig.filter((item) => item.enabled).length}/${
                      authProviderConfig.length
                    } live`}
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
                        {provider.missingEnv.length > 0
                          ? provider.missingEnv.join(", ")
                          : "none"}
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
              <h3 className="text-base font-semibold md:text-lg">
                Registration Intelligence
              </h3>
              <p className="text-xs opacity-75">
                Who registered by method, plus where onboarding failures happened.
              </p>
            </div>
            <span className="text-xs opacity-70">
              Window: last {authStats?.windowDays ?? 30} days
            </span>
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
                <h4 className="mb-3 text-sm font-semibold">
                  Registration Funnel
                </h4>
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
                          <p className="mt-1 text-xs opacity-75">
                            Top of funnel traffic
                          </p>
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
                        <td className="py-2 pr-3 text-emerald-400">
                          {row.registeredSuccess}
                        </td>
                        <td className="py-2 pr-3 text-sky-300">
                          {row.firstLoginSuccess}
                        </td>
                        <td className="py-2 pr-3">
                          {row.registrationConversionRate.toFixed(1)}%
                        </td>
                        <td className="py-2 pr-3">
                          {row.firstLoginConversionRate.toFixed(1)}%
                        </td>
                        <td className="py-2">
                          {row.endToEndConversionRate.toFixed(1)}%
                        </td>
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
                          {new Date(item.createdAt).toLocaleString()} ·{" "}
                          {item.user?.name || "No profile"} ({item.user?.role || "n/a"})
                        </p>
                      </li>
                    ))}
                    {authStats.recentSuccesses.length === 0 ? (
                      <li className="text-xs opacity-70">
                        No successful registrations yet.
                      </li>
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
                          {item.failureCode || "UNSPECIFIED"} ·{" "}
                          {item.failureMessage || "No detail"} ·{" "}
                          {new Date(item.createdAt).toLocaleString()}
                        </p>
                      </li>
                    ))}
                    {authStats.recentFailures.length === 0 ? (
                      <li className="text-xs opacity-70">
                        No registration failures in this window.
                      </li>
                    ) : null}
                  </ul>
                </div>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <div className="admin-card p-5 text-sm opacity-75">Loading articles...</div>
      ) : null}

      {!loading && filtered.length === 0 ? (
        <div className="admin-card p-5 text-sm opacity-75">
          No articles found{query.trim() ? " for that filter." : "."}
        </div>
      ) : null}

      <ul className="space-y-3">
        {filtered.map((article) => {
          const lifecycleStatus = normalizeArticleStatus(article.status) ?? "DRAFT";
          const isOwner = Boolean(
            session?.user?.id && article.authorId === session.user.id,
          );
          const canDelete = canDeleteAsStaff
            ? true
            : canDeleteArticle(lifecycleStatus, role, isOwner);
          const activityDate = new Date(article.updatedAt || article.createdAt);
          const when = Number.isFinite(activityDate.getTime())
            ? activityDate.toLocaleDateString()
            : "n/a";

          return (
            <li key={article.id} className="admin-card p-4 md:p-5">
              <div className="flex flex-col gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold md:text-lg">
                      {article.title}
                    </h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${statusBadgeClassName(
                        lifecycleStatus,
                      )}`}
                    >
                      {statusBadgeLabel(lifecycleStatus)}
                    </span>
                  </div>
                  <p className="text-xs opacity-70">
                    /articles/{article.slug} · {when}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap">
                  <button
                    onClick={() => router.push(`/articles/${article.slug}`)}
                    className="rounded-xl border px-3 py-2 text-sm transition hover:bg-white/5"
                  >
                    View
                  </button>
                  <button
                    onClick={() => router.push(`/admin/edit/${article.slug}`)}
                    className="rounded-xl border px-3 py-2 text-sm transition hover:bg-white/5"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(article.slug)}
                    disabled={!canDelete}
                    className="col-span-2 rounded-xl border border-red-500/70 px-3 py-2 text-sm text-red-500 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50 md:col-span-1"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
