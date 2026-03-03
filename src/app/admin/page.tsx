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
};

function formatMethodLabel(method: string): string {
  if (method === "CREDENTIALS") return "Email + Password";
  if (method === "GOOGLE") return "Google";
  if (method === "APPLE") return "Apple";
  if (method === "MICROSOFT") return "Microsoft";
  if (method === "FACEBOOK") return "Facebook";
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

  async function reloadAll() {
    await Promise.all([load(), loadAuthStats()]);
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    void loadAuthStats();
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
              disabled={loading || authStatsLoading || isPending}
            >
              {loading || authStatsLoading ? "Loading..." : "Reload"}
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
                  <button
                    onClick={() => router.push("/admin/company")}
                    className="rounded-xl border border-sky-400/40 bg-sky-500/15 px-3 py-2 text-sm font-medium transition hover:bg-sky-500/25"
                  >
                    Company Dashboards
                  </button>
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
