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

export default function CompanyDashboardsClient() {
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
        requestJson<UserRecord[]>("/api/admin/users"),
        requestJson<BusinessRecord[]>("/api/ops/businesses"),
      ]);

      setUsers(userRows);
      setBusinesses(businessRows);

      const fallbackOwnerId = userRows[0]?.id ?? "";
      if (!companyOwnerId) {
        setCompanyOwnerId(fallbackOwnerId);
      }

      const ownershipMap: Record<string, string> = {};
      for (const business of businessRows) {
        ownershipMap[business.id] = business.ownerUserId ?? fallbackOwnerId;
      }
      setOwnerByBusiness(ownershipMap);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
