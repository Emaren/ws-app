"use client";

import {
  countWarnings,
  formatDate,
  type AutoHealHistoryPayload,
  type AutoHealRunPayload,
} from "./accessControlSupport";

type AccessAutoHealPanelProps = {
  autoHealBusy: "dry_run" | "apply" | null;
  autoHealError: string | null;
  autoHealLastRun: AutoHealRunPayload | null;
  autoHealHistory: AutoHealHistoryPayload | null;
  autoHealLoading: boolean;
  onRunAutoHeal: (mode: "dry_run" | "apply") => void;
};

export function AccessAutoHealPanel({
  autoHealBusy,
  autoHealError,
  autoHealLastRun,
  autoHealHistory,
  autoHealLoading,
  onRunAutoHeal,
}: AccessAutoHealPanelProps) {
  return (
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
            onClick={() => onRunAutoHeal("dry_run")}
            disabled={autoHealBusy !== null}
            className="rounded-lg border px-3 py-1.5 text-xs transition hover:bg-white/5 disabled:opacity-60"
          >
            {autoHealBusy === "dry_run" ? "Running..." : "Dry run"}
          </button>
          <button
            type="button"
            onClick={() => onRunAutoHeal("apply")}
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
        <div className="mb-3 grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
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
            {autoHealHistory?.rows.map((row) => (
              <tr key={row.id} className="border-t border-white/10">
                <td className="px-3 py-2 pr-3 text-xs opacity-80">{formatDate(row.createdAt)}</td>
                <td className="px-3 py-2 pr-3">{row.mode === "apply" ? "Apply" : "Dry run"}</td>
                <td className="px-3 py-2 pr-3 tabular-nums">
                  {row.roleMismatchBefore} → {row.roleMismatchAfter}
                </td>
                <td className="px-3 py-2 pr-3 tabular-nums">{row.wsApiRoleUpdated}</td>
                <td className="px-3 py-2 pr-3 tabular-nums">{row.localUsersCreated}</td>
                <td className="px-3 py-2 pr-3 text-xs opacity-80">{row.actorEmail || "n/a"}</td>
                <td className="px-3 py-2 text-xs opacity-80">
                  {countWarnings(row.warnings) > 0 ? `${countWarnings(row.warnings)} warning(s)` : "none"}
                </td>
              </tr>
            ))}
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
  );
}
