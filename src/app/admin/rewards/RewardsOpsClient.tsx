"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type TokenTotals = {
  WHEAT: number;
  STONE: number;
};

type RewardRuleView = {
  id: string;
  token: "WHEAT" | "STONE";
  amountPerEvent: number;
  reason: string;
  antiAbuse: {
    requireSourceId: boolean;
    uniquePerSource: boolean;
    cooldownSeconds: number;
    dailyCap: number;
    maxQuantityPerRequest: number;
  };
};

type RewardReport = {
  generatedAt: string;
  summary: {
    entries: number;
    totalByToken: TokenTotals;
    pendingByToken: TokenTotals;
    exportedByToken: TokenTotals;
    paidByToken: TokenTotals;
  };
  byRule: Array<{ ruleId: string; token: "WHEAT" | "STONE"; entries: number; amount: number }>;
  byUser: Array<{ userId: string; entries: number; amountByToken: TokenTotals }>;
};

type ExportPreview = {
  format: "json";
  payoutBatchId: string;
  generatedAt: string;
  count: number;
  entries: Array<{
    id: string;
    userId: string;
    token: "WHEAT" | "STONE";
    amount: number;
    ruleId: string;
    payoutStatus: string;
  }>;
};

function fmt(value: number): string {
  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
}

function dt(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    cache: "no-store",
    ...init,
  });

  const payload = (await response.json().catch(() => null)) as
    | T
    | { message?: string; error?: { message?: string } }
    | null;

  if (!response.ok) {
    const message =
      (payload as { message?: string } | null)?.message ||
      (payload as { error?: { message?: string } } | null)?.error?.message ||
      "Request failed";
    throw new Error(message);
  }

  return payload as T;
}

export default function RewardsOpsClient() {
  const [rules, setRules] = useState<RewardRuleView[]>([]);
  const [report, setReport] = useState<RewardReport | null>(null);
  const [preview, setPreview] = useState<ExportPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [manualUserId, setManualUserId] = useState("");
  const [manualToken, setManualToken] = useState<"WHEAT" | "STONE">("WHEAT");
  const [manualAmount, setManualAmount] = useState("10");
  const [manualReason, setManualReason] = useState("Manual bridge allocation");

  const [settleBatchId, setSettleBatchId] = useState("");
  const [settleTxHash, setSettleTxHash] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [rulesPayload, reportPayload] = await Promise.all([
        fetchJson<{ rules: RewardRuleView[] }>("/api/rewards/rules"),
        fetchJson<RewardReport>("/api/rewards/report"),
      ]);

      setRules(rulesPayload.rules);
      setReport(reportPayload);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Failed to load rewards ops");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const previewPendingExport = useCallback(async () => {
    setActionBusy(true);
    setError(null);
    setNotice(null);

    try {
      const exportPayload = await fetchJson<ExportPreview>(
        "/api/rewards/export?format=json&payoutStatus=PENDING",
      );
      setPreview(exportPayload);
      setSettleBatchId(exportPayload.payoutBatchId);
      setNotice(
        `Prepared export preview: ${exportPayload.count} pending entries (batch ${exportPayload.payoutBatchId}).`,
      );
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "Failed to preview export");
    } finally {
      setActionBusy(false);
    }
  }, []);

  const markExported = useCallback(async () => {
    if (!preview || preview.entries.length === 0) {
      setError("Generate export preview first.");
      return;
    }

    setActionBusy(true);
    setError(null);
    setNotice(null);

    try {
      const payload = await fetchJson<{
        payoutBatchId: string;
        exported: number;
        requested: number;
      }>("/api/rewards/export/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payoutBatchId: preview.payoutBatchId,
          entryIds: preview.entries.map((entry) => entry.id),
        }),
      });

      setSettleBatchId(payload.payoutBatchId);
      setNotice(
        `Marked ${payload.exported}/${payload.requested} entries as EXPORTED in batch ${payload.payoutBatchId}.`,
      );
      await refresh();
      setPreview(null);
    } catch (markError) {
      setError(markError instanceof Error ? markError.message : "Failed to mark exported");
    } finally {
      setActionBusy(false);
    }
  }, [preview, refresh]);

  const settleExport = useCallback(async () => {
    setActionBusy(true);
    setError(null);
    setNotice(null);

    try {
      const payload = await fetchJson<{
        payoutBatchId: string;
        payoutTxHash: string;
        settled: number;
        requested: number;
      }>("/api/rewards/export/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payoutBatchId: settleBatchId,
          payoutTxHash: settleTxHash,
        }),
      });

      setNotice(
        `Settled ${payload.settled}/${payload.requested} entries for batch ${payload.payoutBatchId}.`,
      );
      await refresh();
    } catch (settleError) {
      setError(settleError instanceof Error ? settleError.message : "Failed to settle batch");
    } finally {
      setActionBusy(false);
    }
  }, [refresh, settleBatchId, settleTxHash]);

  const submitManualGrant = useCallback(async () => {
    setActionBusy(true);
    setError(null);
    setNotice(null);

    try {
      const payload = await fetchJson<{ id: string; amount: number; token: string }>(
        "/api/rewards/ledger",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: manualUserId,
            token: manualToken,
            amount: Number(manualAmount),
            reason: manualReason,
          }),
        },
      );

      setNotice(`Manual grant created (${payload.token} ${fmt(payload.amount)}).`);
      await refresh();
    } catch (grantError) {
      setError(grantError instanceof Error ? grantError.message : "Manual grant failed");
    } finally {
      setActionBusy(false);
    }
  }, [manualAmount, manualReason, manualToken, manualUserId, refresh]);

  const topRules = useMemo(() => report?.byRule.slice(0, 5) ?? [], [report]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="admin-card rounded-xl p-4">
          <p className="text-xs uppercase tracking-[0.14em] opacity-65">Entries</p>
          <p className="mt-2 text-2xl font-semibold">{report?.summary.entries ?? 0}</p>
        </div>
        <div className="admin-card rounded-xl p-4">
          <p className="text-xs uppercase tracking-[0.14em] opacity-65">Pending WHEAT</p>
          <p className="mt-2 text-2xl font-semibold">{fmt(report?.summary.pendingByToken.WHEAT ?? 0)}</p>
        </div>
        <div className="admin-card rounded-xl p-4">
          <p className="text-xs uppercase tracking-[0.14em] opacity-65">Pending STONE</p>
          <p className="mt-2 text-2xl font-semibold">{fmt(report?.summary.pendingByToken.STONE ?? 0)}</p>
        </div>
        <div className="admin-card rounded-xl p-4">
          <p className="text-xs uppercase tracking-[0.14em] opacity-65">Last Report</p>
          <p className="mt-2 text-sm font-medium">{dt(report?.generatedAt)}</p>
        </div>
      </div>

      <div className="admin-card p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading || actionBusy}
            className="cursor-pointer rounded-lg border border-white/15 px-3 py-2 text-sm hover:bg-white/5 disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>

          <button
            type="button"
            onClick={() => void previewPendingExport()}
            disabled={actionBusy}
            className="cursor-pointer rounded-lg border border-emerald-300/40 px-3 py-2 text-sm text-emerald-100 disabled:opacity-60"
          >
            Preview Pending Export
          </button>

          <a
            href="/api/rewards/export?format=csv&payoutStatus=PENDING"
            className="rounded-lg border border-amber-300/40 px-3 py-2 text-sm text-amber-100 hover:bg-white/5"
          >
            Download Pending CSV
          </a>
        </div>

        {error ? (
          <p className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        {notice ? (
          <p className="mt-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
            {notice}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="admin-card space-y-3 p-4 md:p-5">
          <h3 className="text-base font-semibold">Rule Performance</h3>
          {topRules.length === 0 ? (
            <p className="text-sm opacity-70">No accrual activity yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {topRules.map((rule) => (
                <li key={rule.ruleId} className="admin-surface rounded-lg px-3 py-2">
                  <p className="font-medium">{rule.ruleId}</p>
                  <p className="mt-1 opacity-80">
                    {rule.token} {fmt(rule.amount)} across {rule.entries} entries
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="admin-card space-y-3 p-4 md:p-5">
          <h3 className="text-base font-semibold">Accrual Rules</h3>
          {rules.length === 0 ? (
            <p className="text-sm opacity-70">Rules unavailable.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {rules.map((rule) => (
                <li key={rule.id} className="admin-surface rounded-lg px-3 py-2">
                  <p className="font-medium">{rule.id}</p>
                  <p className="mt-1 opacity-80">
                    {rule.token} {fmt(rule.amountPerEvent)} | daily cap {fmt(rule.antiAbuse.dailyCap)} | cooldown {rule.antiAbuse.cooldownSeconds}s
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="admin-card space-y-3 p-4 md:p-5">
          <h3 className="text-base font-semibold">Manual Grant</h3>
          <label className="block text-sm">
            <span className="mb-1 block opacity-80">Target User ID</span>
            <input
              value={manualUserId}
              onChange={(event) => setManualUserId(event.target.value)}
              className="admin-surface w-full rounded-lg px-3 py-2"
              placeholder="usr_..."
            />
          </label>

          <div className="grid gap-2 md:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block opacity-80">Token</span>
              <select
                value={manualToken}
                onChange={(event) => setManualToken(event.target.value as "WHEAT" | "STONE")}
                className="admin-surface w-full rounded-lg px-3 py-2"
              >
                <option value="WHEAT">WHEAT</option>
                <option value="STONE">STONE</option>
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block opacity-80">Amount</span>
              <input
                value={manualAmount}
                onChange={(event) => setManualAmount(event.target.value)}
                className="admin-surface w-full rounded-lg px-3 py-2"
                inputMode="decimal"
              />
            </label>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block opacity-80">Reason</span>
            <input
              value={manualReason}
              onChange={(event) => setManualReason(event.target.value)}
              className="admin-surface w-full rounded-lg px-3 py-2"
            />
          </label>

          <button
            type="button"
            onClick={() => void submitManualGrant()}
            disabled={actionBusy}
            className="cursor-pointer rounded-lg border border-white/15 px-3 py-2 text-sm hover:bg-white/5 disabled:opacity-60"
          >
            Create Manual Grant
          </button>
        </div>

        <div className="admin-card space-y-3 p-4 md:p-5">
          <h3 className="text-base font-semibold">Payout Settlement</h3>
          <p className="text-sm opacity-75">
            Mark EXPORTED entries as PAID after on-chain contract payout.
          </p>

          <label className="block text-sm">
            <span className="mb-1 block opacity-80">Batch ID</span>
            <input
              value={settleBatchId}
              onChange={(event) => setSettleBatchId(event.target.value)}
              className="admin-surface w-full rounded-lg px-3 py-2"
              placeholder="payout_batch_..."
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block opacity-80">Payout Tx Hash</span>
            <input
              value={settleTxHash}
              onChange={(event) => setSettleTxHash(event.target.value)}
              className="admin-surface w-full rounded-lg px-3 py-2"
              placeholder="0x..."
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void markExported()}
              disabled={actionBusy || !preview || preview.entries.length === 0}
              className="cursor-pointer rounded-lg border border-amber-300/40 px-3 py-2 text-sm text-amber-100 disabled:opacity-60"
            >
              Mark Previewed Entries Exported
            </button>

            <button
              type="button"
              onClick={() => void settleExport()}
              disabled={actionBusy}
              className="cursor-pointer rounded-lg border border-emerald-300/40 px-3 py-2 text-sm text-emerald-100 disabled:opacity-60"
            >
              Settle Batch as Paid
            </button>
          </div>

          <p className="text-xs opacity-65">
            Pending preview count: {preview?.count ?? 0}
          </p>
        </div>
      </div>
    </div>
  );
}
