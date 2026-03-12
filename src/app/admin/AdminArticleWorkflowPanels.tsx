"use client";

import {
  canDeleteArticle,
  normalizeArticleStatus,
  statusBadgeClassName,
  statusBadgeLabel,
} from "@/lib/articleLifecycle";
import type { AppRole } from "@/lib/rbac";
import type { Article } from "./adminDashboardTypes";

type Props = {
  articles: Article[];
  filteredArticles: Article[];
  query: string;
  loading: boolean;
  reloadBusy: boolean;
  canDeleteAsStaff: boolean;
  isOwnerAdmin: boolean;
  role: AppRole | undefined;
  sessionUserId: string | null | undefined;
  dashboard: {
    total: number;
    draft: number;
    published: number;
    archived: number;
    latest: string;
  };
  onQueryChange: (value: string) => void;
  onReload: () => void | Promise<void>;
  onNavigate: (href: string) => void;
  onDeleteArticle: (slug: string) => void;
};

export function AdminArticleWorkflowPanels({
  articles,
  filteredArticles,
  query,
  loading,
  reloadBusy,
  canDeleteAsStaff,
  isOwnerAdmin,
  role,
  sessionUserId,
  dashboard,
  onQueryChange,
  onReload,
  onNavigate,
  onDeleteArticle,
}: Props) {
  return (
    <>
      <div className="admin-card p-4 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold md:text-2xl">Operations Dashboard</h2>
            <p className="mt-1 text-sm opacity-75">
              Role-aware article operations with mobile-first controls.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onReload}
              className="rounded-xl border px-3 py-2 text-sm transition hover:bg-white/5 disabled:opacity-60"
              disabled={reloadBusy}
            >
              {reloadBusy ? "Loading..." : "Reload"}
            </button>
            {canDeleteAsStaff ? (
              <>
                <button
                  onClick={() => onNavigate("/admin/commerce")}
                  className="rounded-xl border border-amber-300/40 bg-amber-500/15 px-3 py-2 text-sm font-medium transition hover:bg-amber-500/25"
                >
                  Commerce Console
                </button>
                <button
                  onClick={() => onNavigate("/admin/offers")}
                  className="rounded-xl border border-red-500/45 bg-red-500/15 px-3 py-2 text-sm font-medium transition hover:bg-red-500/25"
                >
                  Offers Command
                </button>
                {isOwnerAdmin ? (
                  <>
                    <button
                      onClick={() => onNavigate("/admin/access")}
                      className="rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-3 py-2 text-sm font-medium transition hover:bg-emerald-500/25"
                    >
                      Access Control
                    </button>
                    <button
                      onClick={() => onNavigate("/admin/company")}
                      className="rounded-xl border border-sky-400/40 bg-sky-500/15 px-3 py-2 text-sm font-medium transition hover:bg-sky-500/25"
                    >
                      Company Dashboards
                    </button>
                    <button
                      onClick={() => onNavigate("/admin/data")}
                      className="rounded-xl border border-violet-400/40 bg-violet-500/15 px-3 py-2 text-sm font-medium transition hover:bg-violet-500/25"
                    >
                      Data Explorer
                    </button>
                  </>
                ) : null}
              </>
            ) : null}
            <button
              onClick={() => onNavigate("/admin/new")}
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
          <p className="mt-1 text-xl font-semibold md:text-2xl">{dashboard.total}</p>
        </article>
        <article className="admin-surface rounded-xl p-3 md:p-4">
          <p className="text-xs uppercase tracking-wide opacity-70">Draft/Review</p>
          <p className="mt-1 text-xl font-semibold md:text-2xl">{dashboard.draft}</p>
        </article>
        <article className="admin-surface rounded-xl p-3 md:p-4">
          <p className="text-xs uppercase tracking-wide opacity-70">Published</p>
          <p className="mt-1 text-xl font-semibold md:text-2xl">{dashboard.published}</p>
        </article>
        <article className="admin-surface rounded-xl p-3 md:p-4">
          <p className="text-xs uppercase tracking-wide opacity-70">Archived</p>
          <p className="mt-1 text-xl font-semibold md:text-2xl">{dashboard.archived}</p>
        </article>
        <article className="admin-surface col-span-2 rounded-xl p-3 md:col-span-1 md:p-4">
          <p className="text-xs uppercase tracking-wide opacity-70">Last Updated</p>
          <p className="mt-1 text-base font-semibold md:text-lg">{dashboard.latest}</p>
        </article>
      </div>

      <div className="admin-card p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <input
            type="search"
            placeholder="Filter by title or slug"
            className="admin-surface w-full rounded-xl px-3 py-2 text-sm"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
          <span className="text-xs opacity-70 md:whitespace-nowrap">
            Showing {filteredArticles.length} of {articles.length}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="admin-card p-5 text-sm opacity-75">Loading articles...</div>
      ) : null}

      {!loading && filteredArticles.length === 0 ? (
        <div className="admin-card p-5 text-sm opacity-75">
          No articles found{query.trim() ? " for that filter." : "."}
        </div>
      ) : null}

      <ul className="space-y-3">
        {filteredArticles.map((article) => {
          const lifecycleStatus = normalizeArticleStatus(article.status) ?? "DRAFT";
          const isOwner = Boolean(sessionUserId && article.authorId === sessionUserId);
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
                    <h3 className="text-base font-semibold md:text-lg">{article.title}</h3>
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
                    onClick={() => onNavigate(`/articles/${article.slug}`)}
                    className="rounded-xl border px-3 py-2 text-sm transition hover:bg-white/5"
                  >
                    View
                  </button>
                  <button
                    onClick={() => onNavigate(`/admin/edit/${article.slug}`)}
                    className="rounded-xl border px-3 py-2 text-sm transition hover:bg-white/5"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDeleteArticle(article.slug)}
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
    </>
  );
}
