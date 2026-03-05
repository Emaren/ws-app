"use client";

import { useEffect, useMemo, useState } from "react";

type UserRecord = {
  id: string;
  email: string;
  name: string;
  role: string;
};

type BusinessRecord = {
  id: string;
  slug: string;
  name: string;
  ownerUserId: string | null;
  contactEmail: string | null;
  status: string;
  isVerified: boolean;
};

type CompanyAuthSupportRow = {
  id: string;
  email: string;
  source: "SELF_SERVICE" | "ADMIN_MANUAL" | "ADMIN_RESEND";
  provider: string;
  delivered: boolean;
  reason: string | null;
  requestedByEmail: string | null;
  createdAt: string;
  passwordResetToken: {
    expiresAt: string;
    usedAt: string | null;
  } | null;
};

type CompanyAuthSupportUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  lastAuthAt: string | null;
  registeredVia: string;
  activeOfferCount: number;
};

type CompanyAuthSupportPayload = {
  generatedAt: string;
  businesses: Array<{
    id: string;
    name: string;
    slug: string;
    ownerUserId: string | null;
    contactEmail: string | null;
  }>;
  selectedBusinessId: string | null;
  scopedUsersCount: number;
  activeOfferRecipients: number;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  rows: CompanyAuthSupportRow[];
  scopedUsers: CompanyAuthSupportUser[];
};

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      (payload && typeof payload.message === "string" && payload.message) ||
      `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return "-";
  return parsed.toLocaleString();
}

function providerLabel(value: string | null | undefined): string {
  if (!value) return "-";
  const normalized = value.trim().toUpperCase();
  if (normalized === "CREDENTIALS") return "Email";
  if (normalized === "GOOGLE") return "Google";
  if (normalized === "APPLE") return "Apple";
  if (normalized === "MICROSOFT") return "Microsoft";
  if (normalized === "FACEBOOK") return "Facebook";
  if (normalized === "INSTAGRAM") return "Instagram";
  if (normalized === "GITHUB") return "GitHub";
  if (normalized === "SELF_SERVICE") return "Self-service";
  if (normalized === "ADMIN_MANUAL") return "Admin manual";
  if (normalized === "ADMIN_RESEND") return "Admin resend";
  return value;
}

export default function CompanyDashboardsClient({
  isOwnerAdmin,
}: {
  isOwnerAdmin: boolean;
}) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [businesses, setBusinesses] = useState<BusinessRecord[]>([]);
  const [ownerByBusiness, setOwnerByBusiness] = useState<Record<string, string>>({});

  const [companyName, setCompanyName] = useState("Homesteader Health");
  const [companySlug, setCompanySlug] = useState("homesteader-health");
  const [companyOwnerId, setCompanyOwnerId] = useState("");
  const [companyContactEmail, setCompanyContactEmail] = useState("delivery@homesteaderhealth.ca");

  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [authSupportLoading, setAuthSupportLoading] = useState(false);
  const [authSupportError, setAuthSupportError] = useState<string | null>(null);
  const [authSupportData, setAuthSupportData] = useState<CompanyAuthSupportPayload | null>(null);
  const [authSupportBusinessId, setAuthSupportBusinessId] = useState("");
  const [authSupportEmail, setAuthSupportEmail] = useState("");
  const [authSupportQuery, setAuthSupportQuery] = useState("");

  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);

  async function syncToOffersEngine(businessIds?: string[]) {
    const payload =
      businessIds && businessIds.length > 0 ? { businessIds } : {};

    const result = await requestJson<{
      syncedCount: number;
      warnings?: string[];
    }>("/api/admin/company/sync", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (result.warnings && result.warnings.length > 0) {
      setNotice(
        `Synced ${result.syncedCount} business(es) to Offers Engine with warnings: ${result.warnings.join(" | ")}`,
      );
      return;
    }

    setNotice(`Synced ${result.syncedCount} business(es) to Offers Engine.`);
  }

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const [userRows, businessRows] = await Promise.all([
        isOwnerAdmin
          ? requestJson<UserRecord[]>("/api/admin/users")
          : Promise.resolve<UserRecord[]>([]),
        requestJson<BusinessRecord[]>("/api/ops/businesses"),
      ]);

      setUsers(userRows);
      setBusinesses(businessRows);

      const fallbackOwnerId = userRows[0]?.id ?? "";
      if (isOwnerAdmin && !companyOwnerId) {
        setCompanyOwnerId(fallbackOwnerId);
      }
      if (!authSupportBusinessId && businessRows[0]?.id) {
        setAuthSupportBusinessId(businessRows[0].id);
      }

      if (isOwnerAdmin) {
        const ownershipMap: Record<string, string> = {};
        for (const business of businessRows) {
          ownershipMap[business.id] = business.ownerUserId ?? fallbackOwnerId;
        }
        setOwnerByBusiness(ownershipMap);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }

  async function loadAuthSupport(nextBusinessId?: string) {
    const businessId = (nextBusinessId ?? authSupportBusinessId).trim();
    if (!businessId) {
      setAuthSupportData(null);
      return;
    }
    setAuthSupportLoading(true);
    setAuthSupportError(null);
    try {
      const params = new URLSearchParams({
        businessId,
        page: "1",
        pageSize: "10",
      });
      if (authSupportQuery.trim()) {
        params.set("query", authSupportQuery.trim());
      }
      const data = await requestJson<CompanyAuthSupportPayload>(
        `/api/admin/company/auth-support?${params.toString()}`,
      );
      setAuthSupportData(data);
      setAuthSupportBusinessId(data.selectedBusinessId || businessId);
    } catch (loadError) {
      setAuthSupportData(null);
      setAuthSupportError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setAuthSupportLoading(false);
    }
  }

  async function runCompanyAuthSupportAction(action: "manual_link" | "resend") {
    if (!authSupportBusinessId.trim()) {
      setAuthSupportError("Select a company first.");
      return;
    }
    if (!authSupportEmail.trim()) {
      setAuthSupportError("Enter a scoped user email first.");
      return;
    }
    setBusyAction(`company-auth-${action}`);
    setAuthSupportError(null);
    setNotice(null);
    try {
      const payload = await requestJson<{
        ok: boolean;
        action: "manual_link" | "resend";
        email: string;
        businessId: string;
        delivered?: boolean;
        provider?: string;
        expiresAt: string;
        resetUrl?: string;
      }>("/api/admin/company/auth-support", {
        method: "POST",
        body: JSON.stringify({
          businessId: authSupportBusinessId,
          email: authSupportEmail.trim(),
          action,
        }),
      });

      if (action === "manual_link" && payload.resetUrl) {
        setNotice(`Manual link generated for ${payload.email}: ${payload.resetUrl}`);
      } else {
        setNotice(
          `Resend submitted for ${payload.email}. Delivered: ${
            payload.delivered ? "yes" : "no"
          } (${payload.provider || "unknown"})`,
        );
      }

      await loadAuthSupport(authSupportBusinessId);
    } catch (actionError) {
      setAuthSupportError(
        actionError instanceof Error ? actionError.message : String(actionError),
      );
    } finally {
      setBusyAction(null);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authSupportBusinessId) return;
    void loadAuthSupport(authSupportBusinessId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authSupportBusinessId, authSupportQuery]);

  async function createCompanyDashboard() {
    if (!companyName.trim()) {
      setError("Company name is required.");
      return;
    }
    if (!companySlug.trim()) {
      setError("Company slug is required.");
      return;
    }
    if (!companyOwnerId) {
      setError("Select an owner user.");
      return;
    }

    setError(null);
    setNotice(null);
    setBusyAction("create-company");

    try {
      const created = await requestJson<BusinessRecord>("/api/ops/businesses", {
        method: "POST",
        body: JSON.stringify({
          name: companyName.trim(),
          slug: companySlug.trim(),
          ownerUserId: companyOwnerId,
          contactEmail: companyContactEmail.trim() || null,
          status: "ACTIVE",
          isVerified: true,
        }),
      });

      await syncToOffersEngine([created.id]);

      await requestJson<UserRecord>(`/api/admin/users/${encodeURIComponent(companyOwnerId)}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: "EDITOR" }),
      });

      setNotice(
        `Company dashboard created for ${created.name}. Owner role set to EDITOR for admin access.`,
      );
      await loadData();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : String(createError));
    } finally {
      setBusyAction(null);
    }
  }

  async function authorizeBusiness(business: BusinessRecord) {
    const ownerUserId = ownerByBusiness[business.id]?.trim() ?? "";
    if (!ownerUserId) {
      setError("Select a user before authorizing dashboard access.");
      return;
    }

    setError(null);
    setNotice(null);
    setBusyAction(`authorize-${business.id}`);

    try {
      await requestJson(`/api/ops/businesses/${encodeURIComponent(business.id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          ownerUserId,
          status: "ACTIVE",
        }),
      });

      await syncToOffersEngine([business.id]);

      await requestJson(`/api/admin/users/${encodeURIComponent(ownerUserId)}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: "EDITOR" }),
      });

      const owner = usersById.get(ownerUserId);
      setNotice(
        `${business.name} now points to ${owner?.email ?? ownerUserId}. User role set to EDITOR.`,
      );

      await loadData();
    } catch (authorizeError) {
      setError(authorizeError instanceof Error ? authorizeError.message : String(authorizeError));
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <section className="space-y-4">
      <div className="admin-card p-4 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold md:text-2xl">Company Dashboards</h2>
            <p className="mt-1 text-sm opacity-75">
              Build and authorize partner dashboards (starting with Homesteader Health) directly from Elite Admin.
            </p>
          </div>
          {isOwnerAdmin ? (
            <button
              type="button"
              onClick={() => {
                setBusyAction("sync-all");
                setError(null);
                setNotice(null);
                void syncToOffersEngine()
                  .then(() => loadData())
                  .catch((syncError) =>
                    setError(syncError instanceof Error ? syncError.message : String(syncError)),
                  )
                  .finally(() => setBusyAction(null));
              }}
              disabled={loading || busyAction !== null}
              className="rounded-xl border border-amber-300/40 bg-amber-200/20 px-3 py-2 text-sm font-medium transition hover:bg-amber-200/30 disabled:opacity-60"
            >
              {busyAction === "sync-all" ? "Syncing..." : "Sync All To Offers Engine"}
            </button>
          ) : (
            <span className="rounded-full border border-sky-300/35 bg-sky-500/10 px-2.5 py-1 text-xs text-sky-100">
              Company Manager View
            </span>
          )}
        </div>

        {error ? (
          <p className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="mt-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            {notice}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        {isOwnerAdmin ? (
          <div className="admin-card space-y-4 p-4 md:p-5">
            <h3 className="text-base font-semibold">Create Dashboard</h3>

            <label className="space-y-1 text-sm block">
              <span>Company Name</span>
              <input
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                className="admin-surface w-full rounded-xl px-3 py-2"
              />
            </label>

            <label className="space-y-1 text-sm block">
              <span>Company Slug</span>
              <input
                value={companySlug}
                onChange={(event) => setCompanySlug(event.target.value)}
                className="admin-surface w-full rounded-xl px-3 py-2"
              />
            </label>

            <label className="space-y-1 text-sm block">
              <span>Owner User</span>
              <select
                value={companyOwnerId}
                onChange={(event) => setCompanyOwnerId(event.target.value)}
                className="admin-surface w-full rounded-xl px-3 py-2"
              >
                <option value="">Select owner</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.email} ({user.role})
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm block">
              <span>Contact Email</span>
              <input
                value={companyContactEmail}
                onChange={(event) => setCompanyContactEmail(event.target.value)}
                className="admin-surface w-full rounded-xl px-3 py-2"
              />
            </label>

            <button
              type="button"
              onClick={() => void createCompanyDashboard()}
              disabled={busyAction !== null || loading}
              className="w-full rounded-xl border border-amber-300/40 bg-amber-200/20 px-4 py-2 text-sm font-medium transition hover:bg-amber-200/30 disabled:opacity-60"
            >
              {busyAction === "create-company" ? "Creating..." : "Create Company Dashboard"}
            </button>
          </div>
        ) : (
          <div className="admin-card p-4 md:p-5">
            <h3 className="text-base font-semibold">Dashboard Access</h3>
            <p className="mt-2 text-sm opacity-80">
              You have business-scoped manager access. Company creation and ownership reassignment
              are restricted to Owner/Admin.
            </p>
          </div>
        )}

        <div className="admin-card space-y-3 p-4 md:p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold">Current Company Dashboards</h3>
            <button
              type="button"
              onClick={() => void loadData()}
              className="rounded-xl border px-3 py-1.5 text-xs transition hover:bg-white/5 disabled:opacity-60"
              disabled={loading || busyAction !== null}
            >
              {loading ? "Loading..." : "Reload"}
            </button>
          </div>

          <ul className="space-y-3">
            {businesses.map((business) => {
              const busy = busyAction === `authorize-${business.id}`;
              return (
                <li key={business.id} className="rounded-xl border border-white/10 p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{business.name}</p>
                      <p className="text-xs opacity-70">
                        {business.slug} · {business.status} · {business.isVerified ? "Verified" : "Unverified"}
                      </p>
                    </div>
                    <span className="rounded-full border border-white/20 px-2 py-0.5 text-[11px]">
                      {usersById.get(business.ownerUserId ?? "")?.email ?? "No owner"}
                    </span>
                  </div>

                  {isOwnerAdmin ? (
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                      <select
                        value={ownerByBusiness[business.id] ?? ""}
                        onChange={(event) =>
                          setOwnerByBusiness((prev) => ({
                            ...prev,
                            [business.id]: event.target.value,
                          }))
                        }
                        className="admin-surface rounded-xl px-3 py-2 text-sm"
                      >
                        <option value="">Select owner</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.email} ({user.role})
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => void authorizeBusiness(business)}
                        disabled={busy || busyAction !== null}
                        className="rounded-xl border px-3 py-2 text-sm transition hover:bg-white/5 disabled:opacity-60"
                      >
                        {busy ? "Authorizing..." : "Authorize Dashboard"}
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-white/10 px-3 py-2 text-xs opacity-80">
                      Owner reassignment is available to Owner/Admin only.
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="admin-card space-y-3 p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold">Company-Scoped Auth Support</h3>
            <p className="mt-1 text-sm opacity-75">
              Password support limited to users inside the selected company audience.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadAuthSupport(authSupportBusinessId)}
            className="rounded-xl border px-3 py-1.5 text-xs transition hover:bg-white/5 disabled:opacity-60"
            disabled={authSupportLoading || busyAction !== null}
          >
            {authSupportLoading ? "Loading..." : "Reload"}
          </button>
        </div>

        <div className="grid gap-2 md:grid-cols-[220px_1fr_220px_auto_auto]">
          <select
            value={authSupportBusinessId}
            onChange={(event) => setAuthSupportBusinessId(event.target.value)}
            className="admin-surface rounded-xl px-3 py-2 text-sm"
          >
            <option value="">Select company</option>
            {businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.name}
              </option>
            ))}
          </select>

          <input
            value={authSupportQuery}
            onChange={(event) => setAuthSupportQuery(event.target.value)}
            placeholder="filter scoped users by email"
            className="admin-surface rounded-xl px-3 py-2 text-sm"
          />

          <input
            value={authSupportEmail}
            onChange={(event) => setAuthSupportEmail(event.target.value)}
            placeholder="user email"
            className="admin-surface rounded-xl px-3 py-2 text-sm"
          />

          <button
            type="button"
            onClick={() => void runCompanyAuthSupportAction("resend")}
            disabled={busyAction !== null || authSupportLoading}
            className="rounded-xl border px-3 py-2 text-sm transition hover:bg-white/5 disabled:opacity-60"
          >
            {busyAction === "company-auth-resend" ? "Sending..." : "Resend"}
          </button>

          <button
            type="button"
            onClick={() => void runCompanyAuthSupportAction("manual_link")}
            disabled={busyAction !== null || authSupportLoading}
            className="rounded-xl border border-amber-300/40 bg-amber-200/10 px-3 py-2 text-sm transition hover:bg-amber-200/20 disabled:opacity-60"
          >
            {busyAction === "company-auth-manual_link" ? "Generating..." : "Manual link"}
          </button>
        </div>

        {authSupportError ? (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {authSupportError}
          </p>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <div className="admin-surface rounded-xl px-3 py-2">
            <p className="text-xs uppercase opacity-70">Scoped Users</p>
            <p className="mt-1 text-lg font-semibold">
              {authSupportData?.scopedUsersCount ?? 0}
            </p>
          </div>
          <div className="admin-surface rounded-xl px-3 py-2">
            <p className="text-xs uppercase opacity-70">Active Offer Recipients</p>
            <p className="mt-1 text-lg font-semibold">
              {authSupportData?.activeOfferRecipients ?? 0}
            </p>
          </div>
          <div className="admin-surface rounded-xl px-3 py-2">
            <p className="text-xs uppercase opacity-70">Dispatch Rows</p>
            <p className="mt-1 text-lg font-semibold">
              {authSupportData?.rows.length ?? 0}
            </p>
          </div>
          <div className="admin-surface rounded-xl px-3 py-2">
            <p className="text-xs uppercase opacity-70">Selected Business</p>
            <p className="mt-1 text-sm font-semibold">
              {businesses.find((business) => business.id === authSupportBusinessId)?.name || "n/a"}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="opacity-70">
              <tr>
                <th className="px-3 py-2 pr-3">Email</th>
                <th className="px-3 py-2 pr-3">Source</th>
                <th className="px-3 py-2 pr-3">Delivery</th>
                <th className="px-3 py-2 pr-3">Provider</th>
                <th className="px-3 py-2 pr-3">Reason</th>
                <th className="px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {authSupportData?.rows.map((row) => (
                <tr key={row.id} className="border-t border-white/10">
                  <td className="px-3 py-2 pr-3">{row.email}</td>
                  <td className="px-3 py-2 pr-3">{providerLabel(row.source)}</td>
                  <td className="px-3 py-2 pr-3">
                    {row.delivered ? "Delivered" : "Not delivered"}
                  </td>
                  <td className="px-3 py-2 pr-3">{providerLabel(row.provider)}</td>
                  <td className="px-3 py-2 pr-3 text-xs opacity-80">{row.reason || "-"}</td>
                  <td className="px-3 py-2 text-xs opacity-80">{formatDate(row.createdAt)}</td>
                </tr>
              ))}
              {authSupportLoading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-3 text-sm opacity-70">
                    Loading company auth support...
                  </td>
                </tr>
              ) : null}
              {!authSupportLoading && (!authSupportData || authSupportData.rows.length === 0) ? (
                <tr>
                  <td colSpan={6} className="px-3 py-3 text-sm opacity-70">
                    No company-scoped dispatch rows yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10">
          <p className="px-3 pt-2 text-xs uppercase tracking-wide opacity-70">
            Scoped Users
          </p>
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="opacity-70">
              <tr>
                <th className="px-3 py-2 pr-3">Email</th>
                <th className="px-3 py-2 pr-3">Role</th>
                <th className="px-3 py-2 pr-3">Registered Via</th>
                <th className="px-3 py-2 pr-3">Last Auth</th>
                <th className="px-3 py-2">Active Offers</th>
              </tr>
            </thead>
            <tbody>
              {authSupportData?.scopedUsers.map((user) => (
                <tr key={user.id} className="border-t border-white/10">
                  <td className="px-3 py-2 pr-3">{user.email}</td>
                  <td className="px-3 py-2 pr-3">{user.role}</td>
                  <td className="px-3 py-2 pr-3">{providerLabel(user.registeredVia)}</td>
                  <td className="px-3 py-2 pr-3 text-xs opacity-80">
                    {formatDate(user.lastAuthAt)}
                  </td>
                  <td className="px-3 py-2">{user.activeOfferCount}</td>
                </tr>
              ))}
              {authSupportData && authSupportData.scopedUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-3 text-sm opacity-70">
                    No scoped local users found for this company filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
