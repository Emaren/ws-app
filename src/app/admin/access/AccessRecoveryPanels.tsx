"use client";

import type { Dispatch, SetStateAction } from "react";
import {
  formatDate,
  providerLabel,
  type AccountRescueActionPayload,
  type AccountRescueHistoryPayload,
  type ManualResetResponse,
} from "./accessControlSupport";

type AccessRecoveryPanelsProps = {
  rescueEmail: string;
  setRescueEmail: Dispatch<SetStateAction<string>>;
  rescueBusy: boolean;
  rescueError: string | null;
  rescueData: AccountRescueActionPayload | null;
  rescueHistory: AccountRescueHistoryPayload | null;
  rescueHistoryLoading: boolean;
  rescueHistoryError: string | null;
  onRunRescue: () => void;
  resetEmail: string;
  setResetEmail: Dispatch<SetStateAction<string>>;
  resetBusy: boolean;
  manualReset: ManualResetResponse | null;
  onGenerateManualResetLink: () => void;
};

export function AccessRecoveryPanels({
  rescueEmail,
  setRescueEmail,
  rescueBusy,
  rescueError,
  rescueData,
  rescueHistory,
  rescueHistoryLoading,
  rescueHistoryError,
  onRunRescue,
  resetEmail,
  setResetEmail,
  resetBusy,
  manualReset,
  onGenerateManualResetLink,
}: AccessRecoveryPanelsProps) {
  return (
    <>
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
        {rescueHistoryError ? (
          <p className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
            {rescueHistoryError}
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
            onClick={onRunRescue}
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
            onClick={onGenerateManualResetLink}
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
    </>
  );
}
