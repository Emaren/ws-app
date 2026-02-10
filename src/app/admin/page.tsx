"use client";

import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { isStaffRole, normalizeAppRole } from "@/lib/rbac";
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

export default function AdminDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const role = normalizeAppRole(session?.user?.role);
  const canDeleteAsStaff = isStaffRole(role);

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

  useEffect(() => {
    void load();
  }, []);

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
              onClick={load}
              className="rounded-xl border px-3 py-2 text-sm transition hover:bg-white/5 disabled:opacity-60"
              disabled={loading || isPending}
            >
              {loading ? "Loading..." : "Reload"}
            </button>
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

