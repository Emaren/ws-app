"use client";

import { useEffect, useMemo, useState } from "react";

type DataEntity = "users" | "offers" | "reactions" | "resetTokens";

type ExplorerResponse = {
  entity: DataEntity;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  query: string;
  rows: unknown[];
};

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  registeredVia: string;
  registeredAt: string;
  lastAuthProvider: string | null;
  lastAuthAt: string | null;
};

type OfferRow = {
  id: string;
  businessId: string;
  title: string;
  couponCode: string | null;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  business: {
    name: string;
    slug: string;
  } | null;
};

type ReactionRow = {
  id: string;
  articleId: string;
  userId: string | null;
  ipHash: string | null;
  type: string;
  scope: string;
  productSlug: string | null;
  createdAt: string;
  article: {
    slug: string;
    title: string;
  } | null;
  user: {
    email: string;
    name: string;
  } | null;
};

type ResetTokenRow = {
  id: string;
  userId: string;
  email: string;
  tokenHashPreview: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
  user: {
    name: string;
    email: string;
  } | null;
};

const ENTITY_OPTIONS: Array<{
  id: DataEntity;
  label: string;
  helper: string;
}> = [
  { id: "users", label: "Users", helper: "Accounts, role, provider, latest auth" },
  { id: "offers", label: "Offers", helper: "Offer inventory and business ownership" },
  { id: "reactions", label: "Reactions", helper: "Article/product reaction event stream" },
  { id: "resetTokens", label: "Reset Tokens", helper: "Password reset delivery state" },
];

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "n/a";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "n/a";
  return date.toLocaleString();
}

function formatMethodLabel(method: string | null): string {
  if (!method) return "n/a";
  if (method === "CREDENTIALS") return "Email + Password";
  if (method === "GOOGLE") return "Google";
  if (method === "APPLE") return "Apple";
  if (method === "MICROSOFT") return "Microsoft";
  if (method === "FACEBOOK") return "Facebook";
  if (method === "INSTAGRAM") return "Instagram";
  if (method === "GITHUB") return "GitHub";
  return method;
}

export default function DataExplorerClient() {
  const [entity, setEntity] = useState<DataEntity>("users");
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<ExplorerResponse | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(queryInput.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [queryInput]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        entity,
        page: String(page),
        pageSize: String(pageSize),
      });
      if (query) {
        params.set("query", query);
      }
      const res = await fetch(`/api/admin/system/data?${params.toString()}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as ExplorerResponse | { message?: string };
      if (!res.ok) {
        throw new Error((data as { message?: string }).message || `Request failed (${res.status})`);
      }
      setPayload(data as ExplorerResponse);
    } catch (loadError) {
      console.error(loadError);
      setError(loadError instanceof Error ? loadError.message : "Failed to load data");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity, page, pageSize, query]);

  const statsLabel = useMemo(() => {
    if (!payload) return "No results loaded";
    const from = payload.total === 0 ? 0 : (payload.page - 1) * payload.pageSize + 1;
    const to = Math.min(payload.page * payload.pageSize, payload.total);
    return `${from}-${to} of ${payload.total}`;
  }, [payload]);

  const hasPrev = (payload?.page ?? page) > 1;
  const hasNext = payload ? payload.page < payload.totalPages : false;

  function renderUsers(rows: UserRow[]) {
    return (
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="opacity-70">
          <tr>
            <th className="pb-2 pr-3">Email</th>
            <th className="pb-2 pr-3">Name</th>
            <th className="pb-2 pr-3">Role</th>
            <th className="pb-2 pr-3">Registered Via</th>
            <th className="pb-2 pr-3">Registered</th>
            <th className="pb-2 pr-3">Last Provider</th>
            <th className="pb-2">Last Auth</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-white/10">
              <td className="py-2 pr-3">{row.email}</td>
              <td className="py-2 pr-3">{row.name}</td>
              <td className="py-2 pr-3">{row.role}</td>
              <td className="py-2 pr-3">{formatMethodLabel(row.registeredVia)}</td>
              <td className="py-2 pr-3">{formatDateTime(row.registeredAt)}</td>
              <td className="py-2 pr-3">{formatMethodLabel(row.lastAuthProvider)}</td>
              <td className="py-2">{formatDateTime(row.lastAuthAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  function renderOffers(rows: OfferRow[]) {
    return (
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="opacity-70">
          <tr>
            <th className="pb-2 pr-3">Title</th>
            <th className="pb-2 pr-3">Code</th>
            <th className="pb-2 pr-3">Status</th>
            <th className="pb-2 pr-3">Business</th>
            <th className="pb-2 pr-3">Starts</th>
            <th className="pb-2 pr-3">Ends</th>
            <th className="pb-2">Created</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-white/10">
              <td className="py-2 pr-3">{row.title}</td>
              <td className="py-2 pr-3">{row.couponCode || "n/a"}</td>
              <td className="py-2 pr-3">{row.status}</td>
              <td className="py-2 pr-3">
                {row.business?.name || "Unknown"}{" "}
                <span className="text-xs opacity-70">({row.business?.slug || "n/a"})</span>
              </td>
              <td className="py-2 pr-3">{formatDateTime(row.startsAt)}</td>
              <td className="py-2 pr-3">{formatDateTime(row.endsAt)}</td>
              <td className="py-2">{formatDateTime(row.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  function renderReactions(rows: ReactionRow[]) {
    return (
      <table className="w-full min-w-[1080px] text-left text-sm">
        <thead className="opacity-70">
          <tr>
            <th className="pb-2 pr-3">Type</th>
            <th className="pb-2 pr-3">Scope</th>
            <th className="pb-2 pr-3">Article</th>
            <th className="pb-2 pr-3">User</th>
            <th className="pb-2 pr-3">User ID</th>
            <th className="pb-2 pr-3">Product Slug</th>
            <th className="pb-2 pr-3">IP Hash</th>
            <th className="pb-2">Created</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-white/10">
              <td className="py-2 pr-3">{row.type}</td>
              <td className="py-2 pr-3">{row.scope}</td>
              <td className="py-2 pr-3">
                {row.article?.slug || "n/a"}{" "}
                <span className="text-xs opacity-70">({row.article?.title || "Unknown"})</span>
              </td>
              <td className="py-2 pr-3">{row.user?.email || "anonymous"}</td>
              <td className="py-2 pr-3">{row.userId || "n/a"}</td>
              <td className="py-2 pr-3">{row.productSlug || "n/a"}</td>
              <td className="py-2 pr-3">{row.ipHash ? `${row.ipHash.slice(0, 10)}...` : "n/a"}</td>
              <td className="py-2">{formatDateTime(row.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  function renderResetTokens(rows: ResetTokenRow[]) {
    return (
      <table className="w-full min-w-[1080px] text-left text-sm">
        <thead className="opacity-70">
          <tr>
            <th className="pb-2 pr-3">Email</th>
            <th className="pb-2 pr-3">User</th>
            <th className="pb-2 pr-3">User ID</th>
            <th className="pb-2 pr-3">Token Hash</th>
            <th className="pb-2 pr-3">Created</th>
            <th className="pb-2 pr-3">Expires</th>
            <th className="pb-2">Used</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-white/10">
              <td className="py-2 pr-3">{row.email}</td>
              <td className="py-2 pr-3">{row.user?.name || "n/a"}</td>
              <td className="py-2 pr-3">{row.userId}</td>
              <td className="py-2 pr-3">{row.tokenHashPreview}</td>
              <td className="py-2 pr-3">{formatDateTime(row.createdAt)}</td>
              <td className="py-2 pr-3">{formatDateTime(row.expiresAt)}</td>
              <td className="py-2">{row.usedAt ? formatDateTime(row.usedAt) : "Not used"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  function renderTable() {
    if (!payload) return null;
    if (payload.rows.length === 0) {
      return (
        <div className="rounded-xl border border-white/10 p-4 text-sm opacity-70">
          No rows matched this filter.
        </div>
      );
    }

    if (entity === "users") {
      return renderUsers(payload.rows as UserRow[]);
    }
    if (entity === "offers") {
      return renderOffers(payload.rows as OfferRow[]);
    }
    if (entity === "reactions") {
      return renderReactions(payload.rows as ReactionRow[]);
    }
    return renderResetTokens(payload.rows as ResetTokenRow[]);
  }

  return (
    <section className="space-y-4">
      <div className="admin-card p-4 md:p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
          <label className="block">
            <span className="text-xs uppercase tracking-[0.14em] opacity-70">Search</span>
            <input
              type="search"
              value={queryInput}
              onChange={(event) => setQueryInput(event.target.value)}
              placeholder="email, title, status, slug..."
              className="admin-surface mt-1 w-full rounded-xl px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-xs uppercase tracking-[0.14em] opacity-70">Entity</span>
            <select
              value={entity}
              onChange={(event) => {
                setEntity(event.target.value as DataEntity);
                setPage(1);
              }}
              className="admin-surface mt-1 w-full min-w-[180px] rounded-xl px-3 py-2 text-sm"
            >
              {ENTITY_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs uppercase tracking-[0.14em] opacity-70">Page Size</span>
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number.parseInt(event.target.value, 10));
                setPage(1);
              }}
              className="admin-surface mt-1 w-full rounded-xl px-3 py-2 text-sm"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>

          <button
            onClick={() => void load()}
            className="rounded-xl border border-amber-300/40 bg-amber-200/20 px-3 py-2 text-sm font-medium transition hover:bg-amber-200/30"
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        <p className="mt-3 text-xs opacity-75">
          {ENTITY_OPTIONS.find((option) => option.id === entity)?.helper}
        </p>
      </div>

      {error ? (
        <div className="admin-card rounded-xl border border-rose-500/30 p-4 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="admin-card overflow-x-auto p-4 md:p-5">
        {renderTable()}
      </div>

      <div className="admin-card p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm opacity-80">{statsLabel}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={loading || !hasPrev}
              className="rounded-lg border px-3 py-1.5 text-sm transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm tabular-nums">
              Page {payload?.page ?? page} / {payload?.totalPages ?? 1}
            </span>
            <button
              onClick={() => setPage((current) => current + 1)}
              disabled={loading || !hasNext}
              className="rounded-lg border px-3 py-1.5 text-sm transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
