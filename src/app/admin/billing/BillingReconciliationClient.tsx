"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type EntitlementView = {
  plan: string;
  status: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  stripeProductId: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  latestInvoiceId: string | null;
  syncedAt?: string | null;
  mismatchReason?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
};

type ReconciliationRecord = {
  id: string;
  userExternalId: string | null;
  userEmail: string | null;
  local: EntitlementView;
  stripe: EntitlementView | null;
  mismatchReasons: string[];
  inSync: boolean;
};

type ReconciliationPayload = {
  stripeAvailable: boolean;
  generatedAt: string;
  summary: {
    total: number;
    inSync: number;
    mismatched: number;
  };
  records: ReconciliationRecord[];
};

type ReconciliationAction = "sync_from_stripe" | "reset_to_free";

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function truncateId(value: string | null | undefined): string {
  if (!value) return "-";
  if (value.length <= 20) return value;
  return `${value.slice(0, 8)}...${value.slice(-8)}`;
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="opacity-65">{label}</span>
      <span className="font-mono text-[11px] text-right">{value}</span>
    </div>
  );
}

export default function BillingReconciliationClient() {
  const [payload, setPayload] = useState<ReconciliationPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingActionKey, setPendingActionKey] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/billing/reconciliation?limit=100", {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json().catch(() => null)) as
        | ReconciliationPayload
        | { message?: string }
        | null;

      if (!response.ok) {
        throw new Error(data && "message" in data && data.message ? data.message : "Failed to load reconciliation data");
      }

      setPayload(data as ReconciliationPayload);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to load reconciliation data";
      setError(message);
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runAction = useCallback(
    async (entitlementId: string, action: ReconciliationAction) => {
      const key = `${entitlementId}:${action}`;
      setPendingActionKey(key);
      setError(null);

      try {
        const response = await fetch("/api/admin/billing/reconciliation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entitlementId, action }),
        });

        const data = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;

        if (!response.ok) {
          throw new Error(data?.message ?? "Failed to apply reconciliation action");
        }

        await refresh();
      } catch (actionError) {
        const message =
          actionError instanceof Error
            ? actionError.message
            : "Failed to apply reconciliation action";
        setError(message);
      } finally {
        setPendingActionKey(null);
      }
    },
    [refresh],
  );

  const summary = useMemo(
    () =>
      payload?.summary ?? {
        total: 0,
        inSync: 0,
        mismatched: 0,
      },
    [payload],
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="admin-card rounded-xl p-4">
          <p className="text-xs uppercase tracking-[0.14em] opacity-65">Total</p>
          <p className="mt-2 text-2xl font-semibold">{summary.total}</p>
        </div>
        <div className="admin-card rounded-xl p-4">
          <p className="text-xs uppercase tracking-[0.14em] opacity-65">In Sync</p>
          <p className="mt-2 text-2xl font-semibold">{summary.inSync}</p>
        </div>
        <div className="admin-card rounded-xl p-4">
          <p className="text-xs uppercase tracking-[0.14em] opacity-65">Mismatched</p>
          <p className="mt-2 text-2xl font-semibold">{summary.mismatched}</p>
        </div>
      </div>

      <div className="admin-card p-4 md:p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-base font-semibold">Subscription Reconciliation</h3>
            <p className="mt-1 text-sm opacity-75">
              Last generated: {formatDateTime(payload?.generatedAt)}
            </p>
            <p className="mt-1 text-xs opacity-65">
              Stripe connectivity: {payload?.stripeAvailable ? "Connected" : "Unavailable"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            className="cursor-pointer rounded-xl border border-white/15 px-3 py-2 text-sm hover:bg-white/5"
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {!loading && payload?.records.length === 0 ? (
          <div className="mt-4 rounded-xl border border-white/10 px-3 py-4 text-sm opacity-80">
            No entitlement records found.
          </div>
        ) : null}

        <div className="mt-4 space-y-3">
          {payload?.records.map((record) => {
            const syncKey = `${record.id}:sync_from_stripe`;
            const resetKey = `${record.id}:reset_to_free`;
            const isSyncPending = pendingActionKey === syncKey;
            const isResetPending = pendingActionKey === resetKey;

            return (
              <article key={record.id} className="admin-surface rounded-xl p-3 md:p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-semibold">
                      {record.userEmail ?? "Unknown email"}
                    </p>
                    <p className="mt-0.5 text-xs opacity-70">
                      userExternalId: {truncateId(record.userExternalId)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs ${
                        record.inSync
                          ? "bg-green-500/15 text-green-200"
                          : "bg-amber-400/15 text-amber-200"
                      }`}
                    >
                      {record.inSync ? "in sync" : "mismatch"}
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-white/10 px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.12em] opacity-60">Local</p>
                    <div className="mt-2 space-y-1.5">
                      <FieldRow label="Plan" value={record.local.plan} />
                      <FieldRow label="Status" value={record.local.status} />
                      <FieldRow
                        label="Subscription"
                        value={truncateId(record.local.stripeSubscriptionId)}
                      />
                      <FieldRow
                        label="Price"
                        value={truncateId(record.local.stripePriceId)}
                      />
                      <FieldRow
                        label="Period End"
                        value={formatDateTime(record.local.currentPeriodEnd)}
                      />
                      <FieldRow
                        label="Synced"
                        value={formatDateTime(record.local.syncedAt)}
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.12em] opacity-60">Stripe</p>
                    {record.stripe ? (
                      <div className="mt-2 space-y-1.5">
                        <FieldRow label="Plan" value={record.stripe.plan} />
                        <FieldRow label="Status" value={record.stripe.status} />
                        <FieldRow
                          label="Subscription"
                          value={truncateId(record.stripe.stripeSubscriptionId)}
                        />
                        <FieldRow
                          label="Price"
                          value={truncateId(record.stripe.stripePriceId)}
                        />
                        <FieldRow
                          label="Period End"
                          value={formatDateTime(record.stripe.currentPeriodEnd)}
                        />
                      </div>
                    ) : (
                      <p className="mt-2 text-xs opacity-75">No Stripe snapshot available.</p>
                    )}
                  </div>
                </div>

                {record.mismatchReasons.length > 0 ? (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-amber-200/90">
                    {record.mismatchReasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void runAction(record.id, "sync_from_stripe")}
                    disabled={
                      isSyncPending ||
                      !payload?.stripeAvailable ||
                      Boolean(pendingActionKey)
                    }
                    className="cursor-pointer rounded-lg border border-emerald-300/40 px-3 py-1.5 text-xs text-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSyncPending ? "Syncing..." : "Sync from Stripe"}
                  </button>

                  <button
                    type="button"
                    onClick={() => void runAction(record.id, "reset_to_free")}
                    disabled={isResetPending || Boolean(pendingActionKey)}
                    className="cursor-pointer rounded-lg border border-rose-300/40 px-3 py-1.5 text-xs text-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isResetPending ? "Resetting..." : "Reset to Free"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
