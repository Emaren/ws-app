"use client";

import { useEffect, useMemo, useState } from "react";

type RewardLedgerEntry = {
  token?: unknown;
  amount?: unknown;
  payoutStatus?: unknown;
};

type TokenBalance = {
  symbol: string;
  balance: number;
};

function normalizeTokenSymbol(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const next = value.trim().toUpperCase();
  if (!/^[A-Z0-9_]{2,12}$/.test(next)) return null;
  return next;
}

function toTokenAmount(value: unknown): number {
  const numeric =
    typeof value === "object" && value !== null ? Number(String(value)) : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatTokenBalance(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(value);
}

function sumTokenBalances(entries: RewardLedgerEntry[], trackedTokens: string[]): TokenBalance[] {
  const totals = new Map<string, number>();

  for (const entry of entries) {
    const symbol = normalizeTokenSymbol(entry.token);
    if (!symbol) continue;

    const payoutStatus =
      typeof entry.payoutStatus === "string" ? entry.payoutStatus.trim().toUpperCase() : "";
    if (payoutStatus === "VOID") continue;

    const amount = toTokenAmount(entry.amount);
    totals.set(symbol, (totals.get(symbol) || 0) + amount);
  }

  const orderedSymbols = [
    ...trackedTokens,
    ...[...totals.keys()].filter((symbol) => !trackedTokens.includes(symbol)),
  ];

  return orderedSymbols.map((symbol) => ({
    symbol,
    balance: totals.get(symbol) || 0,
  }));
}

export default function TokenBalancesCard({
  userId,
  trackedTokens,
}: {
  userId: string;
  trackedTokens: string[];
}) {
  const [entries, setEntries] = useState<RewardLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadLedger = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(
          `/api/rewards/ledger?userId=${encodeURIComponent(userId)}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const payload = await response.json().catch(() => null);
        if (!active) return;

        if (!response.ok) {
          const message =
            payload && typeof payload === "object" && "message" in payload
              ? String(payload.message)
              : "Could not load token balances";
          setError(message);
          setEntries([]);
          return;
        }

        if (Array.isArray(payload)) {
          setEntries(payload);
        } else {
          setEntries([]);
        }
      } catch {
        if (!active) return;
        setError("Could not load token balances");
        setEntries([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadLedger();

    return () => {
      active = false;
    };
  }, [userId]);

  const tokenBalances = useMemo(
    () => sumTokenBalances(entries, trackedTokens),
    [entries, trackedTokens],
  );

  return (
    <section className="rounded-xl border border-black/10 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.03] p-4 md:p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base md:text-lg font-semibold">Token Balances</h2>
        <span className="text-xs opacity-70">Extensible display</span>
      </div>

      {error ? (
        <p className="text-sm text-amber-600 dark:text-amber-300">{error}</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
          {tokenBalances.map((token) => (
            <div
              key={token.symbol}
              className="rounded-lg border border-black/10 dark:border-white/15 px-3 py-2"
            >
              <p className="text-xs uppercase tracking-[0.2em] opacity-70">${token.symbol}</p>
              <p className="mt-1 text-xl font-semibold">
                {loading ? "…" : formatTokenBalance(token.balance)}
              </p>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs opacity-70">
        Add more display symbols via <code>NEXT_PUBLIC_PROFILE_TOKEN_SYMBOLS</code> (comma
        separated).
      </p>
    </section>
  );
}
