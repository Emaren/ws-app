"use client";

import type { Dispatch, SetStateAction } from "react";
import {
  buildPageSummary,
  formatDate,
  providerLabel,
  ROLE_OPTIONS,
  STATUS_OPTIONS,
  statusBadge,
  type IdentityResponse,
  type IdentityStatus,
  type RoleValue,
} from "./accessControlSupport";

type AccessIdentityGovernancePanelsProps = {
  queryInput: string;
  setQueryInput: Dispatch<SetStateAction<string>>;
  statusFilter: "ALL" | IdentityStatus;
  onStatusFilterChange: (next: "ALL" | IdentityStatus) => void;
  payload: IdentityResponse | null;
  loading: boolean;
  error: string | null;
  notice: string | null;
  busyEmail: string | null;
  roleDraftByEmail: Record<string, RoleValue>;
  onRoleDraftChange: (email: string, role: RoleValue) => void;
  onReload: () => void;
  onApplyRole: (email: string) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
};

export function AccessIdentityGovernancePanels({
  queryInput,
  setQueryInput,
  statusFilter,
  onStatusFilterChange,
  payload,
  loading,
  error,
  notice,
  busyEmail,
  roleDraftByEmail,
  onRoleDraftChange,
  onReload,
  onApplyRole,
  onPreviousPage,
  onNextPage,
}: AccessIdentityGovernancePanelsProps) {
  const statsLabel = buildPageSummary(payload);

  return (
    <>
      <div className="admin-card p-4 md:p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
          <label className="block min-w-0">
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
              onChange={(event) =>
                onStatusFilterChange(event.target.value as "ALL" | IdentityStatus)
              }
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
            onClick={onReload}
            className="rounded-xl border px-3 py-2 text-sm transition hover:bg-white/5 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Loading..." : "Reload"}
          </button>
        </div>

        {payload ? (
          <div className="mt-3 grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(145px,1fr))]">
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
                      <td className="py-2 pr-3">
                        {formatDate(row.local?.lastAuthAt ?? row.wsApi?.updatedAt)}
                      </td>
                      <td className="py-2 pr-3">{row.offerBadgeCount}</td>
                      <td className="py-2 pr-3">
                        <select
                          value={nextRole}
                          onChange={(event) =>
                            onRoleDraftChange(row.email, event.target.value as RoleValue)
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
                          onClick={() => onApplyRole(row.email)}
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
            onClick={onPreviousPage}
            className="rounded-lg border px-3 py-1.5 text-sm transition hover:bg-white/5 disabled:opacity-50"
            disabled={!payload || payload.page <= 1 || loading}
          >
            Previous
          </button>
          <span className="text-xs opacity-70">
            Page {payload?.page ?? 1} of {payload?.totalPages ?? 1}
          </span>
          <button
            type="button"
            onClick={onNextPage}
            className="rounded-lg border px-3 py-1.5 text-sm transition hover:bg-white/5 disabled:opacity-50"
            disabled={!payload || payload.page >= payload.totalPages || loading}
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
}
