"use client";

import type { Dispatch, SetStateAction } from "react";
import {
  deliveryBadge,
  dispatchSourceLabel,
  formatDate,
  providerLabel,
  type AuthSupportPayload,
} from "./accessControlSupport";

type AccessAuthSupportPanelsProps = {
  authSupportQueryInput: string;
  setAuthSupportQueryInput: Dispatch<SetStateAction<string>>;
  authSupportLoading: boolean;
  authSupportError: string | null;
  authSupportData: AuthSupportPayload | null;
  authSupportPage: number;
  authActionBusyKey: string | null;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onExecuteAuthSupportAction: (action: "manual_link" | "resend", email: string) => void;
};

export function AccessAuthSupportPanels({
  authSupportQueryInput,
  setAuthSupportQueryInput,
  authSupportLoading,
  authSupportError,
  authSupportData,
  authSupportPage,
  authActionBusyKey,
  onPreviousPage,
  onNextPage,
  onExecuteAuthSupportAction,
}: AccessAuthSupportPanelsProps) {
  return (
    <div className="admin-card p-4 md:p-5">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold md:text-lg">Auth Support Dispatches</h3>
          <p className="mt-1 text-sm opacity-75">
            Track password reset delivery outcomes and run one-click resend/manual actions.
          </p>
        </div>
        <label className="block w-full md:w-auto">
          <span className="text-xs uppercase tracking-[0.14em] opacity-70">Search email</span>
          <input
            type="search"
            placeholder="user@example.com"
            value={authSupportQueryInput}
            onChange={(event) => setAuthSupportQueryInput(event.target.value)}
            className="admin-surface mt-1 w-full rounded-xl px-3 py-2 text-sm md:w-[260px]"
          />
        </label>
      </div>

      {authSupportError ? (
        <p className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {authSupportError}
        </p>
      ) : null}

      <div className="mb-3 grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(145px,1fr))]">
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
                      <span className={deliveryBadge(row.delivered)}>
                        {row.delivered ? "Delivered" : "Not delivered"}
                      </span>
                    </td>
                    <td className="px-3 py-2 pr-3">{providerLabel(row.provider)}</td>
                    <td className="px-3 py-2 pr-3 text-xs opacity-85">{row.reason || "-"}</td>
                    <td className="px-3 py-2 pr-3 text-xs opacity-85">
                      {row.requestedByEmail || "Self-service"}
                    </td>
                    <td className="px-3 py-2 pr-3 text-xs opacity-80">{formatDate(row.createdAt)}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => onExecuteAuthSupportAction("resend", row.email)}
                          disabled={authActionBusyKey === resendKey}
                          className="rounded-lg border px-2 py-1 text-xs transition hover:bg-white/5 disabled:opacity-60"
                        >
                          {authActionBusyKey === resendKey ? "Sending..." : "Resend"}
                        </button>
                        <button
                          type="button"
                          onClick={() => onExecuteAuthSupportAction("manual_link", row.email)}
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
          onClick={onPreviousPage}
          className="rounded-lg border px-3 py-1.5 text-sm transition hover:bg-white/5 disabled:opacity-50"
          disabled={!authSupportData || authSupportData.page <= 1 || authSupportLoading}
        >
          Previous
        </button>
        <span className="text-xs opacity-70">
          Page {authSupportData?.page ?? authSupportPage} of {authSupportData?.totalPages ?? 1}
        </span>
        <button
          type="button"
          onClick={onNextPage}
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
  );
}
