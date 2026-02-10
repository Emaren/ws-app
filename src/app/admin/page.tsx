// src/app/admin/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { isEditorialRole, isStaffRole, normalizeAppRole } from "@/lib/rbac";
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
  const { data: session, status } = useSession();
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const role = normalizeAppRole(session?.user?.role);
  const canAccess = isEditorialRole(role);
  const canDeleteAsStaff = isStaffRole(role);

  // Redirect if unauthenticated
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // Fetch list when we have an admin
  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/articles?scope=all", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data: Article[] = await res.json();
      setArticles(data ?? []);
    } catch (e) {
      console.error(e);
      alert("Failed to load articles.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (canAccess) load();
  }, [canAccess]);

  // Derived, filtered list
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter((a) => a.title.toLowerCase().includes(q) || a.slug.toLowerCase().includes(q));
  }, [articles, query]);

  async function handleDelete(slug: string) {
    if (!confirm("Delete this article? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/articles/${encodeURIComponent(slug)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(String(res.status));
      // Soft refresh
      startTransition(() => {
        setArticles((prev) => prev.filter((a) => a.slug !== slug));
      });
    } catch (e) {
      console.error(e);
      alert("Delete failed.");
    }
  }

  if (!canAccess) {
    // While session is loading, avoid flashing the "no permission" message
    if (status === "loading") {
      return <p className="p-8 opacity-70">Checking permissions…</p>;
    }
    return <p className="p-8">You do not have permission to view this page.</p>;
  }

  return (
    <main className="max-w-5xl mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="border px-3 py-2 rounded cursor-pointer disabled:opacity-60"
            disabled={loading || isPending}
            title="Reload list"
          >
            {loading ? "Loading…" : "Reload"}
          </button>
          <button
            onClick={() => router.push("/admin/new")}
            className="bg-black text-white px-4 py-2 rounded cursor-pointer"
          >
            + New Article
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="search"
          placeholder="Filter by title or slug…"
          className="w-full px-3 py-2 border rounded"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="text-sm opacity-60 whitespace-nowrap">
          {filtered.length} / {articles.length}
        </span>
      </div>

      {loading && (
        <div className="border rounded p-4 text-sm opacity-70">Loading articles…</div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="border rounded p-6 text-sm opacity-70">
          No articles found{query ? " for your filter." : "."}
        </div>
      )}

      <ul className="space-y-3">
        {filtered.map((article) => {
          const activityDate = new Date(article.updatedAt || article.createdAt);
          const when = isNaN(activityDate.getTime())
            ? ""
            : activityDate.toLocaleDateString();
          const lifecycleStatus = normalizeArticleStatus(article.status) ?? "DRAFT";
          const canDelete = canDeleteAsStaff
            ? true
            : canDeleteArticle(
                lifecycleStatus,
                role,
                Boolean(session?.user?.id && article.authorId === session.user.id),
              );

          return (
            <li
              key={article.id}
              className="p-4 border rounded flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold truncate">{article.title}</h2>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${statusBadgeClassName(
                      lifecycleStatus,
                    )}`}
                  >
                    {statusBadgeLabel(lifecycleStatus)}
                  </span>
                </div>
                <p className="text-xs opacity-60 truncate">
                  /articles/{article.slug} · {when || "—"}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => router.push(`/articles/${article.slug}`)}
                  className="px-3 py-1.5 border rounded hover:bg-neutral-100 dark:hover:bg-neutral-900"
                  title="View"
                >
                  View
                </button>
                <button
                  onClick={() => router.push(`/admin/edit/${article.slug}`)}
                  className="px-3 py-1.5 border rounded hover:bg-neutral-100 dark:hover:bg-neutral-900"
                  title="Edit"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(article.slug)}
                  disabled={!canDelete}
                  className="px-3 py-1.5 border rounded border-red-500 text-red-600 hover:bg-red-500/10"
                  title="Delete"
                >
                  Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
