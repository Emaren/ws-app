"use client";

import { useEffect, useMemo, useState } from "react";

type IdentityStatus = "MATCHED" | "ROLE_MISMATCH" | "LOCAL_ONLY" | "WSAPI_ONLY";
type RoleValue = "OWNER" | "ADMIN" | "EDITOR" | "CONTRIBUTOR" | "USER";

type IdentityRow = {
  email: string;
  status: IdentityStatus;
  offerBadgeCount: number;
  local: {
    id: string;
    email: string;
    name: string;
    role: string;
    registeredVia: string;
    registeredAt: string;
    lastAuthProvider: string | null;
    lastAuthAt: string | null;
  } | null;
  wsApi: {
    id: string;
    email: string;
    name: string;
    role: string;
    createdAt: string;
    updatedAt: string;
  } | null;
};

type IdentityResponse = {
  generatedAt: string;
  wsApiAvailable: boolean;
  summary: {
    total: number;
    matched: number;
    roleMismatches: number;
    localOnly: number;
    wsApiOnly: number;
    zeroOfferUsers: number;
  };
  filters: {
    query: string;
    status: IdentityStatus | null;
  };
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  rows: IdentityRow[];
};

type ManualResetResponse = {
  ok: boolean;
  action: "manual_link" | "resend";
  email: string;
  delivered?: boolean;
  provider?: string;
  reason?: string | null;
  expiresAt: string;
  resetUrl?: string;
  debugResetUrl?: string;
};

type PasswordResetDispatchRow = {
  id: string;
  email: string;
  source: "SELF_SERVICE" | "ADMIN_MANUAL" | "ADMIN_RESEND";
  provider: string;
  delivered: boolean;
  reason: string | null;
  requestedByEmail: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    role: string;
  } | null;
  passwordResetToken: {
    id: string;
    expiresAt: string;
    usedAt: string | null;
  } | null;
};

type AuthSupportPayload = {
  generatedAt: string;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  query: string;
  summary: {
    totalDispatches: number;
    deliveredDispatches: number;
    failedDispatches: number;
    activeTokens: number;
  };
  rows: PasswordResetDispatchRow[];
};

type IdentityAutoHealRun = {
  id: string;
  actorUserId: string | null;
  actorEmail: string | null;
  mode: string;
  wsApiAvailable: boolean;
  scannedCount: number;
  roleMismatchBefore: number;
  roleMismatchAfter: number;
  localOnlyCount: number;
  wsApiOnlyCount: number;
  wsApiRoleUpdated: number;
  localUsersCreated: number;
  warnings: unknown;
  createdAt: string;
};

type AutoHealHistoryPayload = {
  generatedAt: string;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  rows: IdentityAutoHealRun[];
};

type AutoHealRunPayload = {
  ok: boolean;
  mode: "dry_run" | "apply";
  applied: boolean;
  summary: {
    before: {
      scannedCount: number;
      roleMismatchCount: number;
      localOnlyCount: number;
      wsApiOnlyCount: number;
    };
    after: {
      scannedCount: number;
      roleMismatchCount: number;
      localOnlyCount: number;
      wsApiOnlyCount: number;
    };
    wsApiRoleUpdated: number;
    localUsersCreated: number;
    warnings: string[];
  };
};

type AccountRescueRun = {
  id: string;
  actorUserId: string | null;
  actorEmail: string | null;
  targetUserId: string | null;
  targetEmail: string;
  wsApiAvailable: boolean;
  localPasswordUpdated: boolean;
  wsApiPasswordUpdated: boolean;
  resetDispatchDelivered: boolean;
  resetDispatchProvider: string;
  resetDispatchReason: string | null;
  warnings: unknown;
  createdAt: string;
};

type AccountRescueHistoryPayload = {
  generatedAt: string;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  rows: AccountRescueRun[];
};

type AccountRescueActionPayload = {
  ok: boolean;
  email: string;
  userId: string;
  temporaryPassword: string;
  resetExpiresAt: string;
  manualResetUrl: string;
  delivered: boolean;
  provider: string;
  reason: string | null;
  warnings: string[];
  debugResetUrl?: string;
};

const STATUS_OPTIONS: Array<{ value: "ALL" | IdentityStatus; label: string }> = [
  { value: "ALL", label: "All statuses" },
  { value: "ROLE_MISMATCH", label: "Role mismatch" },
  { value: "LOCAL_ONLY", label: "Local only" },
  { value: "WSAPI_ONLY", label: "ws-api only" },
  { value: "MATCHED", label: "Matched" },
];

const ROLE_OPTIONS: RoleValue[] = ["OWNER", "ADMIN", "EDITOR", "CONTRIBUTOR", "USER"];

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return "-";
  return parsed.toLocaleString();
}

function providerLabel(value: string | null | undefined): string {
  if (!value) return "-";
  if (value === "CREDENTIALS") return "Email";
  if (value === "GOOGLE") return "Google";
  if (value === "APPLE") return "Apple";
  if (value === "MICROSOFT") return "Microsoft";
  if (value === "FACEBOOK") return "Facebook";
  if (value === "INSTAGRAM") return "Instagram";
  if (value === "GITHUB") return "GitHub";
  return value;
}

function dispatchSourceLabel(value: PasswordResetDispatchRow["source"]): string {
  if (value === "SELF_SERVICE") return "Self-service";
  if (value === "ADMIN_MANUAL") return "Admin manual link";
  if (value === "ADMIN_RESEND") return "Admin resend";
  return value;
}

function statusBadge(status: IdentityStatus): string {
  if (status === "ROLE_MISMATCH") {
    return "border-amber-300/40 bg-amber-300/15 text-amber-100";
  }
  if (status === "LOCAL_ONLY") {
    return "border-blue-300/40 bg-blue-300/10 text-blue-100";
  }
  if (status === "WSAPI_ONLY") {
    return "border-violet-300/40 bg-violet-300/10 text-violet-100";
  }
  return "border-emerald-300/40 bg-emerald-300/10 text-emerald-100";
}

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

  const payload = await response
    .json()
    .catch(() => ({} as { message?: string }));
  if (!response.ok) {
    const message =
      payload && typeof payload.message === "string"
        ? payload.message
        : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return payload as T;
}

export default function AccessControlClient() {
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | IdentityStatus>("ALL");
  const [page, setPage] = useState(1);
  const [payload, setPayload] = useState<IdentityResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [roleDraftByEmail, setRoleDraftByEmail] = useState<Record<string, RoleValue>>({});
  const [resetEmail, setResetEmail] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [manualReset, setManualReset] = useState<ManualResetResponse | null>(null);
  const [authSupportQueryInput, setAuthSupportQueryInput] = useState("");
  const [authSupportQuery, setAuthSupportQuery] = useState("");
  const [authSupportPage, setAuthSupportPage] = useState(1);
  const [authSupportData, setAuthSupportData] = useState<AuthSupportPayload | null>(null);
  const [authSupportLoading, setAuthSupportLoading] = useState(false);
  const [authSupportError, setAuthSupportError] = useState<string | null>(null);
  const [authActionBusyKey, setAuthActionBusyKey] = useState<string | null>(null);
  const [autoHealHistory, setAutoHealHistory] = useState<AutoHealHistoryPayload | null>(null);
  const [autoHealLoading, setAutoHealLoading] = useState(false);
  const [autoHealError, setAutoHealError] = useState<string | null>(null);
  const [autoHealBusy, setAutoHealBusy] = useState<"dry_run" | "apply" | null>(null);
  const [autoHealLastRun, setAutoHealLastRun] = useState<AutoHealRunPayload | null>(null);
  const [rescueEmail, setRescueEmail] = useState("");
  const [rescueBusy, setRescueBusy] = useState(false);
  const [rescueError, setRescueError] = useState<string | null>(null);
  const [rescueData, setRescueData] = useState<AccountRescueActionPayload | null>(null);
  const [rescueHistory, setRescueHistory] = useState<AccountRescueHistoryPayload | null>(null);
  const [rescueHistoryLoading, setRescueHistoryLoading] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(queryInput.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [queryInput]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAuthSupportQuery(authSupportQueryInput.trim());
      setAuthSupportPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [authSupportQueryInput]);

  async function loadData(nextPage = page) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        pageSize: "20",
      });
      if (query) {
        params.set("query", query);
      }
      if (statusFilter !== "ALL") {
        params.set("status", statusFilter);
      }

      const data = await requestJson<IdentityResponse>(
        `/api/admin/access/identity?${params.toString()}`,
      );
      setPayload(data);
      setRoleDraftByEmail((prev) => {
        const next = { ...prev };
        for (const row of data.rows) {
          const current =
            row.local?.role ??
            row.wsApi?.role ??
            "USER";
          if (!next[row.email] && ROLE_OPTIONS.includes(current as RoleValue)) {
            next[row.email] = current as RoleValue;
          }
        }
        return next;
      });
    } catch (loadError) {
      setPayload(null);
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }

  async function loadAuthSupport(nextPage = authSupportPage) {
    setAuthSupportLoading(true);
    setAuthSupportError(null);
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        pageSize: "12",
      });
      if (authSupportQuery) {
        params.set("query", authSupportQuery);
      }

      const data = await requestJson<AuthSupportPayload>(
        `/api/admin/auth/support?${params.toString()}`,
      );
      setAuthSupportData(data);
    } catch (loadError) {
      setAuthSupportData(null);
      setAuthSupportError(
        loadError instanceof Error ? loadError.message : String(loadError),
      );
    } finally {
      setAuthSupportLoading(false);
    }
  }

  async function loadAutoHealHistory() {
    setAutoHealLoading(true);
    setAutoHealError(null);
    try {
      const data = await requestJson<AutoHealHistoryPayload>(
        "/api/admin/access/auto-heal?page=1&pageSize=10",
      );
      setAutoHealHistory(data);
    } catch (loadError) {
      setAutoHealHistory(null);
      setAutoHealError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setAutoHealLoading(false);
    }
  }

  async function loadRescueHistory() {
    setRescueHistoryLoading(true);
    try {
      const data = await requestJson<AccountRescueHistoryPayload>(
        "/api/admin/access/account-rescue?page=1&pageSize=10",
      );
      setRescueHistory(data);
    } finally {
      setRescueHistoryLoading(false);
    }
  }

  useEffect(() => {
    void loadData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, statusFilter]);

  useEffect(() => {
    void loadData(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    void loadAuthSupport(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authSupportQuery]);

  useEffect(() => {
    void loadAuthSupport(authSupportPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authSupportPage]);

  useEffect(() => {
    void loadAutoHealHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadRescueHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statsLabel = useMemo(() => {
    if (!payload) return "No data loaded";
    const from = payload.total === 0 ? 0 : (payload.page - 1) * payload.pageSize + 1;
    const to = Math.min(payload.page * payload.pageSize, payload.total);
    return `${from}-${to} of ${payload.total}`;
  }, [payload]);

  async function applyRole(email: string) {
    const role = roleDraftByEmail[email] ?? "USER";
    setBusyEmail(email);
    setError(null);
    setNotice(null);
    try {
      const result = await requestJson<{
        ok: boolean;
        email: string;
        role: string;
        localUpdated: boolean;
        wsApiUpdated: boolean;
        warning?: string | null;
      }>("/api/admin/access/identity", {
        method: "PATCH",
        body: JSON.stringify({ email, role }),
      });
      const detail = result.warning ? ` (${result.warning})` : "";
      setNotice(
        `Role set to ${result.role} for ${result.email}. local=${result.localUpdated ? "yes" : "no"}, ws-api=${result.wsApiUpdated ? "yes" : "no"}${detail}`,
      );
      await loadData(payload?.page ?? 1);
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : String(applyError));
    } finally {
      setBusyEmail(null);
    }
  }

  async function generateManualResetLink() {
    if (!resetEmail.trim()) {
      setError("Enter an email first.");
      return;
    }

    setResetBusy(true);
    setError(null);
    setNotice(null);
    setManualReset(null);
    try {
      const result = await requestJson<ManualResetResponse>(
        "/api/admin/auth/support",
        {
          method: "POST",
          body: JSON.stringify({ email: resetEmail.trim(), action: "manual_link" }),
        },
      );
      setManualReset(result);
      setNotice(`Manual reset link generated for ${result.email}.`);
      await loadAuthSupport(authSupportData?.page ?? 1);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : String(resetError));
    } finally {
      setResetBusy(false);
    }
  }

  async function executeAuthSupportAction(
    action: "manual_link" | "resend",
    email: string,
  ) {
    const key = `${action}:${email}`;
    setAuthActionBusyKey(key);
    setError(null);
    setNotice(null);
    try {
      const result = await requestJson<ManualResetResponse>("/api/admin/auth/support", {
        method: "POST",
        body: JSON.stringify({ email, action }),
      });

      if (action === "manual_link") {
        setManualReset(result);
        setNotice(`Manual reset link generated for ${result.email}.`);
      } else {
        setNotice(
          `Resend submitted for ${result.email}. Delivered: ${
            result.delivered ? "yes" : "no"
          } (${result.provider || "unknown provider"})`,
        );
      }
      await loadAuthSupport(authSupportData?.page ?? 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : String(actionError));
    } finally {
      setAuthActionBusyKey(null);
    }
  }

  async function runIdentityAutoHeal(mode: "dry_run" | "apply") {
    setAutoHealBusy(mode);
    setAutoHealError(null);
    setNotice(null);
    try {
      const result = await requestJson<AutoHealRunPayload>(
        "/api/admin/access/auto-heal",
        {
          method: "POST",
          body: JSON.stringify({
            mode,
            alignWsApiRoles: true,
            createLocalForWsApiOnly: true,
          }),
        },
      );
      setAutoHealLastRun(result);
      setNotice(
        mode === "apply"
          ? `Auto-heal applied. Role mismatches ${result.summary.before.roleMismatchCount} -> ${result.summary.after.roleMismatchCount}.`
          : `Dry run complete. Role mismatches ${result.summary.before.roleMismatchCount} -> ${result.summary.after.roleMismatchCount} (projected).`,
      );
      await Promise.all([
        loadAutoHealHistory(),
        loadData(payload?.page ?? 1),
      ]);
    } catch (runError) {
      setAutoHealError(runError instanceof Error ? runError.message : String(runError));
    } finally {
      setAutoHealBusy(null);
    }
  }

  async function runAccountRescue() {
    if (!rescueEmail.trim()) {
      setRescueError("Enter an email first.");
      return;
    }
    setRescueBusy(true);
    setRescueError(null);
    setRescueData(null);
    setNotice(null);
    try {
      const result = await requestJson<AccountRescueActionPayload>(
        "/api/admin/access/account-rescue",
        {
          method: "POST",
          body: JSON.stringify({ email: rescueEmail.trim() }),
        },
      );
      setRescueData(result);
      setNotice(
        `Account rescue complete for ${result.email}. Delivered: ${
          result.delivered ? "yes" : "no"
        }`,
      );
      await Promise.all([
        loadRescueHistory(),
        loadAuthSupport(authSupportData?.page ?? 1),
      ]);
    } catch (error) {
      setRescueError(error instanceof Error ? error.message : String(error));
    } finally {
      setRescueBusy(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="admin-card p-4 md:p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
          <label className="block">
            <span className="text-xs uppercase tracking-[0.14em] opacity-70">Search identity</span>
            <input
              type="search"
              value={queryInput}
              onChange={(event) => setQueryInput(event.target.value)}
              placeholder="email, role, status..."
              className="admin-surface mt-1 w-full rounded-xl px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-xs uppercase tracking-[0.14em] opacity-70">Status</span>
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as "ALL" | IdentityStatus);
                setPage(1);
              }}
              className="admin-surface mt-1 w-full min-w-[170px] rounded-xl px-3 py-2 text-sm"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => void loadData(payload?.page ?? 1)}
            className="rounded-xl border px-3 py-2 text-sm transition hover:bg-white/5 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Loading..." : "Reload"}
          </button>
        </div>

        {payload ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
            <div className="admin-surface rounded-xl px-3 py-2">
              <p className="text-xs uppercase opacity-70">Accounts</p>
              <p className="mt-1 text-lg font-semibold">{payload.summary.total}</p>
            </div>
            <div className="admin-surface rounded-xl px-3 py-2">
              <p className="text-xs uppercase opacity-70">Role Mismatch</p>
              <p className="mt-1 text-lg font-semibold text-amber-200">
                {payload.summary.roleMismatches}
              </p>
            </div>
            <div className="admin-surface rounded-xl px-3 py-2">
              <p className="text-xs uppercase opacity-70">Local Only</p>
              <p className="mt-1 text-lg font-semibold">{payload.summary.localOnly}</p>
            </div>
            <div className="admin-surface rounded-xl px-3 py-2">
              <p className="text-xs uppercase opacity-70">ws-api Only</p>
              <p className="mt-1 text-lg font-semibold">{payload.summary.wsApiOnly}</p>
            </div>
            <div className="admin-surface rounded-xl px-3 py-2">
              <p className="text-xs uppercase opacity-70">Zero Offer Users</p>
              <p className="mt-1 text-lg font-semibold">{payload.summary.zeroOfferUsers}</p>
            </div>
            <div className="admin-surface rounded-xl px-3 py-2">
              <p className="text-xs uppercase opacity-70">ws-api Link</p>
              <p className="mt-1 text-sm font-semibold">
                {payload.wsApiAvailable ? "Session synced" : "Unavailable"}
              </p>
            </div>
          </div>
        ) : null}

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

      <div className="admin-card p-4 md:p-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold md:text-lg">Identity Drift Table</h3>
          <span className="text-xs opacity-70">{statsLabel}</span>
        </div>

        {!payload ? (
          <p className="text-sm opacity-75">{loading ? "Loading identities..." : "No data yet."}</p>
        ) : payload.rows.length === 0 ? (
          <p className="text-sm opacity-75">No identities matched this filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px] text-left text-sm">
              <thead className="opacity-70">
                <tr>
                  <th className="pb-2 pr-3">Email</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3">Local Role</th>
                  <th className="pb-2 pr-3">ws-api Role</th>
                  <th className="pb-2 pr-3">Registered Via</th>
                  <th className="pb-2 pr-3">Last Auth</th>
                  <th className="pb-2 pr-3">Offers Badge</th>
                  <th className="pb-2 pr-3">Set Role</th>
                  <th className="pb-2">Apply</th>
                </tr>
              </thead>
              <tbody>
                {payload.rows.map((row) => {
                  const nextRole = roleDraftByEmail[row.email] ?? "USER";
                  return (
                    <tr key={row.email} className="border-t border-white/10 align-top">
                      <td className="py-2 pr-3">
                        <p>{row.email}</p>
                        <p className="text-xs opacity-60">
                          local:{row.local?.id ?? "-"} / ws:{row.wsApi?.id ?? "-"}
                        </p>
                      </td>
                      <td className="py-2 pr-3">
                        <span
                          className={`inline-flex rounded-full border px-2 py-1 text-[11px] uppercase tracking-[0.1em] ${statusBadge(
                            row.status,
                          )}`}
                        >
                          {row.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-2 pr-3">{row.local?.role ?? "-"}</td>
                      <td className="py-2 pr-3">{row.wsApi?.role ?? "-"}</td>
                      <td className="py-2 pr-3">{providerLabel(row.local?.registeredVia)}</td>
                      <td className="py-2 pr-3">{formatDate(row.local?.lastAuthAt ?? row.wsApi?.updatedAt)}</td>
                      <td className="py-2 pr-3">{row.offerBadgeCount}</td>
                      <td className="py-2 pr-3">
                        <select
                          value={nextRole}
                          onChange={(event) =>
                            setRoleDraftByEmail((prev) => ({
                              ...prev,
                              [row.email]: event.target.value as RoleValue,
                            }))
                          }
                          className="admin-surface w-[150px] rounded-lg px-2 py-1.5 text-xs"
                        >
                          {ROLE_OPTIONS.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2">
                        <button
                          type="button"
                          onClick={() => void applyRole(row.email)}
                          disabled={busyEmail === row.email}
                          className="rounded-lg border px-3 py-1.5 text-xs transition hover:bg-white/5 disabled:opacity-60"
                        >
                          {busyEmail === row.email ? "Applying..." : "Apply"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            className="rounded-lg border px-3 py-1.5 text-sm transition hover:bg-white/5 disabled:opacity-50"
            disabled={!payload || payload.page <= 1 || loading}
          >
            Previous
          </button>
          <span className="text-xs opacity-70">
            Page {payload?.page ?? page} of {payload?.totalPages ?? 1}
          </span>
          <button
            type="button"
            onClick={() =>
              setPage((prev) => {
                if (!payload) return prev;
                return Math.min(payload.totalPages, prev + 1);
              })
            }
            className="rounded-lg border px-3 py-1.5 text-sm transition hover:bg-white/5 disabled:opacity-50"
            disabled={!payload || payload.page >= payload.totalPages || loading}
          >
            Next
          </button>
        </div>
      </div>

      <div className="admin-card p-4 md:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold md:text-lg">One-Click Account Rescue</h3>
            <p className="mt-1 text-sm opacity-75">
              Force-rotate credentials, sync ws-api bridge password, and issue a fresh reset link.
            </p>
          </div>
        </div>

        {rescueError ? (
          <p className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {rescueError}
          </p>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            type="email"
            placeholder="user@example.com"
            value={rescueEmail}
            onChange={(event) => setRescueEmail(event.target.value)}
            className="admin-surface rounded-xl px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void runAccountRescue()}
            disabled={rescueBusy}
            className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm font-medium transition hover:bg-rose-500/20 disabled:opacity-60"
          >
            {rescueBusy ? "Rescuing..." : "Run Rescue"}
          </button>
        </div>

        {rescueData ? (
          <div className="mt-3 rounded-xl border border-rose-400/25 bg-rose-500/10 p-3 text-sm">
            <p className="font-medium">Rescue completed for {rescueData.email}</p>
            <p className="mt-1 text-xs opacity-80">
              Temp password (copy now):{" "}
              <span className="rounded border border-white/20 bg-black/25 px-1.5 py-0.5 font-mono">
                {rescueData.temporaryPassword}
              </span>
            </p>
            <p className="mt-1 text-xs opacity-80">
              Reset expires: {formatDate(rescueData.resetExpiresAt)} · Email provider:{" "}
              {providerLabel(rescueData.provider)} · Delivered:{" "}
              {rescueData.delivered ? "yes" : "no"}
            </p>
            <a
              href={rescueData.manualResetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block break-all text-xs underline underline-offset-2"
            >
              {rescueData.manualResetUrl}
            </a>
            {rescueData.warnings.length > 0 ? (
              <p className="mt-2 text-xs text-amber-100">
                Warnings: {rescueData.warnings.join(" | ")}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-3 overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="opacity-70">
              <tr>
                <th className="px-3 py-2 pr-3">Run Time</th>
                <th className="px-3 py-2 pr-3">Target</th>
                <th className="px-3 py-2 pr-3">Local</th>
                <th className="px-3 py-2 pr-3">ws-api</th>
                <th className="px-3 py-2 pr-3">Dispatch</th>
                <th className="px-3 py-2">Operator</th>
              </tr>
            </thead>
            <tbody>
              {rescueHistory?.rows.map((row) => (
                <tr key={row.id} className="border-t border-white/10">
                  <td className="px-3 py-2 pr-3 text-xs opacity-80">
                    {formatDate(row.createdAt)}
                  </td>
                  <td className="px-3 py-2 pr-3">{row.targetEmail}</td>
                  <td className="px-3 py-2 pr-3">
                    {row.localPasswordUpdated ? "updated" : "no"}
                  </td>
                  <td className="px-3 py-2 pr-3">
                    {row.wsApiPasswordUpdated ? "updated" : "no"}
                  </td>
                  <td className="px-3 py-2 pr-3">
                    {providerLabel(row.resetDispatchProvider)} ·{" "}
                    {row.resetDispatchDelivered ? "delivered" : "not delivered"}
                  </td>
                  <td className="px-3 py-2 text-xs opacity-80">
                    {row.actorEmail || "n/a"}
                  </td>
                </tr>
              ))}
              {rescueHistoryLoading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-3 text-sm opacity-70">
                    Loading rescue history...
                  </td>
                </tr>
              ) : null}
              {!rescueHistoryLoading && (!rescueHistory || rescueHistory.rows.length === 0) ? (
                <tr>
                  <td colSpan={6} className="px-3 py-3 text-sm opacity-70">
                    No account rescue runs yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-card p-4 md:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold md:text-lg">Identity Auto-Heal</h3>
            <p className="mt-1 text-sm opacity-75">
              Reconcile role drift and missing local users from ws-api in one controlled pass.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void runIdentityAutoHeal("dry_run")}
              disabled={autoHealBusy !== null}
              className="rounded-lg border px-3 py-1.5 text-xs transition hover:bg-white/5 disabled:opacity-60"
            >
              {autoHealBusy === "dry_run" ? "Running..." : "Dry run"}
            </button>
            <button
              type="button"
              onClick={() => void runIdentityAutoHeal("apply")}
              disabled={autoHealBusy !== null}
              className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-1.5 text-xs transition hover:bg-emerald-500/20 disabled:opacity-60"
            >
              {autoHealBusy === "apply" ? "Applying..." : "Apply heal"}
            </button>
          </div>
        </div>

        {autoHealError ? (
          <p className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {autoHealError}
          </p>
        ) : null}

        {autoHealLastRun ? (
          <div className="mb-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <div className="admin-surface rounded-xl px-3 py-2">
              <p className="text-xs uppercase opacity-70">Mismatches (before)</p>
              <p className="mt-1 text-lg font-semibold text-amber-200">
                {autoHealLastRun.summary.before.roleMismatchCount}
              </p>
            </div>
            <div className="admin-surface rounded-xl px-3 py-2">
              <p className="text-xs uppercase opacity-70">Mismatches (after)</p>
              <p className="mt-1 text-lg font-semibold text-emerald-200">
                {autoHealLastRun.summary.after.roleMismatchCount}
              </p>
            </div>
            <div className="admin-surface rounded-xl px-3 py-2">
              <p className="text-xs uppercase opacity-70">ws-api Roles Updated</p>
              <p className="mt-1 text-lg font-semibold">
                {autoHealLastRun.summary.wsApiRoleUpdated}
              </p>
            </div>
            <div className="admin-surface rounded-xl px-3 py-2">
              <p className="text-xs uppercase opacity-70">Local Users Created</p>
              <p className="mt-1 text-lg font-semibold">
                {autoHealLastRun.summary.localUsersCreated}
              </p>
            </div>
          </div>
        ) : null}

        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="opacity-70">
              <tr>
                <th className="px-3 py-2 pr-3">Run Time</th>
                <th className="px-3 py-2 pr-3">Mode</th>
                <th className="px-3 py-2 pr-3">Mismatches</th>
                <th className="px-3 py-2 pr-3">ws-api Updated</th>
                <th className="px-3 py-2 pr-3">Local Created</th>
                <th className="px-3 py-2 pr-3">Operator</th>
                <th className="px-3 py-2">Warnings</th>
              </tr>
            </thead>
            <tbody>
              {autoHealHistory?.rows.map((row) => {
                const warningCount = Array.isArray(row.warnings) ? row.warnings.length : 0;
                return (
                  <tr key={row.id} className="border-t border-white/10">
                    <td className="px-3 py-2 pr-3 text-xs opacity-80">
                      {formatDate(row.createdAt)}
                    </td>
                    <td className="px-3 py-2 pr-3">
                      {row.mode === "apply" ? "Apply" : "Dry run"}
                    </td>
                    <td className="px-3 py-2 pr-3 tabular-nums">
                      {row.roleMismatchBefore} → {row.roleMismatchAfter}
                    </td>
                    <td className="px-3 py-2 pr-3 tabular-nums">{row.wsApiRoleUpdated}</td>
                    <td className="px-3 py-2 pr-3 tabular-nums">{row.localUsersCreated}</td>
                    <td className="px-3 py-2 pr-3 text-xs opacity-80">
                      {row.actorEmail || "n/a"}
                    </td>
                    <td className="px-3 py-2 text-xs opacity-80">
                      {warningCount > 0 ? `${warningCount} warning(s)` : "none"}
                    </td>
                  </tr>
                );
              })}
              {autoHealLoading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-3 text-sm opacity-70">
                    Loading auto-heal history...
                  </td>
                </tr>
              ) : null}
              {!autoHealLoading && (!autoHealHistory || autoHealHistory.rows.length === 0) ? (
                <tr>
                  <td colSpan={7} className="px-3 py-3 text-sm opacity-70">
                    No auto-heal runs yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-card p-4 md:p-5">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold md:text-lg">Auth Support Dispatches</h3>
            <p className="mt-1 text-sm opacity-75">
              Track password reset delivery outcomes and run one-click resend/manual actions.
            </p>
          </div>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.14em] opacity-70">Search email</span>
            <input
              type="search"
              placeholder="user@example.com"
              value={authSupportQueryInput}
              onChange={(event) => setAuthSupportQueryInput(event.target.value)}
              className="admin-surface mt-1 w-[260px] rounded-xl px-3 py-2 text-sm"
            />
          </label>
        </div>

        {authSupportError ? (
          <p className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {authSupportError}
          </p>
        ) : null}

        <div className="mb-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <div className="admin-surface rounded-xl px-3 py-2">
            <p className="text-xs uppercase opacity-70">Dispatches</p>
            <p className="mt-1 text-lg font-semibold">
              {authSupportData?.summary.totalDispatches ?? 0}
            </p>
          </div>
          <div className="admin-surface rounded-xl px-3 py-2">
            <p className="text-xs uppercase opacity-70">Delivered</p>
            <p className="mt-1 text-lg font-semibold text-emerald-300">
              {authSupportData?.summary.deliveredDispatches ?? 0}
            </p>
          </div>
          <div className="admin-surface rounded-xl px-3 py-2">
            <p className="text-xs uppercase opacity-70">Failed/Not Sent</p>
            <p className="mt-1 text-lg font-semibold text-amber-200">
              {authSupportData?.summary.failedDispatches ?? 0}
            </p>
          </div>
          <div className="admin-surface rounded-xl px-3 py-2">
            <p className="text-xs uppercase opacity-70">Active Tokens</p>
            <p className="mt-1 text-lg font-semibold">
              {authSupportData?.summary.activeTokens ?? 0}
            </p>
          </div>
        </div>

        {!authSupportData && authSupportLoading ? (
          <p className="text-sm opacity-75">Loading auth support log...</p>
        ) : null}

        {authSupportData ? (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[1160px] text-left text-sm">
              <thead className="opacity-70">
                <tr>
                  <th className="px-3 py-2 pr-3">Email</th>
                  <th className="px-3 py-2 pr-3">Source</th>
                  <th className="px-3 py-2 pr-3">Delivery</th>
                  <th className="px-3 py-2 pr-3">Provider</th>
                  <th className="px-3 py-2 pr-3">Reason</th>
                  <th className="px-3 py-2 pr-3">Requested By</th>
                  <th className="px-3 py-2 pr-3">Created</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {authSupportData.rows.map((row) => {
                  const resendKey = `resend:${row.email}`;
                  const manualKey = `manual_link:${row.email}`;
                  return (
                    <tr key={row.id} className="border-t border-white/10 align-top">
                      <td className="px-3 py-2 pr-3">
                        <p>{row.email}</p>
                        <p className="text-xs opacity-60">
                          {row.user?.name || "Unknown"} ({row.user?.role || "n/a"})
                        </p>
                      </td>
                      <td className="px-3 py-2 pr-3">{dispatchSourceLabel(row.source)}</td>
                      <td className="px-3 py-2 pr-3">
                        <span
                          className={
                            row.delivered
                              ? "rounded-full border border-emerald-400/35 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-200"
                              : "rounded-full border border-amber-400/35 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-100"
                          }
                        >
                          {row.delivered ? "Delivered" : "Not delivered"}
                        </span>
                      </td>
                      <td className="px-3 py-2 pr-3">{providerLabel(row.provider)}</td>
                      <td className="px-3 py-2 pr-3 text-xs opacity-85">
                        {row.reason || "-"}
                      </td>
                      <td className="px-3 py-2 pr-3 text-xs opacity-85">
                        {row.requestedByEmail || "Self-service"}
                      </td>
                      <td className="px-3 py-2 pr-3 text-xs opacity-80">
                        {formatDate(row.createdAt)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void executeAuthSupportAction("resend", row.email)}
                            disabled={authActionBusyKey === resendKey}
                            className="rounded-lg border px-2 py-1 text-xs transition hover:bg-white/5 disabled:opacity-60"
                          >
                            {authActionBusyKey === resendKey ? "Sending..." : "Resend"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void executeAuthSupportAction("manual_link", row.email)
                            }
                            disabled={authActionBusyKey === manualKey}
                            className="rounded-lg border border-amber-300/40 bg-amber-300/10 px-2 py-1 text-xs transition hover:bg-amber-300/20 disabled:opacity-60"
                          >
                            {authActionBusyKey === manualKey ? "Generating..." : "Manual link"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {authSupportData.rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-3 text-sm opacity-70">
                      No dispatch rows for this filter.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setAuthSupportPage((prev) => Math.max(1, prev - 1))}
            className="rounded-lg border px-3 py-1.5 text-sm transition hover:bg-white/5 disabled:opacity-50"
            disabled={!authSupportData || authSupportData.page <= 1 || authSupportLoading}
          >
            Previous
          </button>
          <span className="text-xs opacity-70">
            Page {authSupportData?.page ?? authSupportPage} of{" "}
            {authSupportData?.totalPages ?? 1}
          </span>
          <button
            type="button"
            onClick={() =>
              setAuthSupportPage((prev) =>
                authSupportData ? Math.min(authSupportData.totalPages, prev + 1) : prev,
              )
            }
            className="rounded-lg border px-3 py-1.5 text-sm transition hover:bg-white/5 disabled:opacity-50"
            disabled={
              !authSupportData ||
              authSupportData.page >= authSupportData.totalPages ||
              authSupportLoading
            }
          >
            Next
          </button>
        </div>
      </div>

      <div className="admin-card p-4 md:p-5">
        <h3 className="text-base font-semibold md:text-lg">Manual Password Reset Link</h3>
        <p className="mt-1 text-sm opacity-75">
          Owner/admin recovery tool for cases where email delivery is unavailable.
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            type="email"
            placeholder="user@example.com"
            value={resetEmail}
            onChange={(event) => setResetEmail(event.target.value)}
            className="admin-surface rounded-xl px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void generateManualResetLink()}
            disabled={resetBusy}
            className="rounded-xl border border-amber-300/40 bg-amber-300/15 px-3 py-2 text-sm font-medium transition hover:bg-amber-300/25 disabled:opacity-60"
          >
            {resetBusy ? "Generating..." : "Generate link"}
          </button>
        </div>

        {manualReset ? (
          <div className="mt-3 rounded-xl border border-amber-300/30 bg-amber-300/10 p-3 text-sm">
            <p className="font-medium">Reset link ready for {manualReset.email}</p>
            <p className="mt-1 text-xs opacity-80">Expires: {formatDate(manualReset.expiresAt)}</p>
            {manualReset.resetUrl ? (
              <a
                href={manualReset.resetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 block break-all text-xs underline underline-offset-2"
              >
                {manualReset.resetUrl}
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
