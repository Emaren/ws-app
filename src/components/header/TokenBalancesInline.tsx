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

const DEFAULT_HEADER_TOKEN_SYMBOLS = ["WHEAT", "STONE"] as const;

function normalizeTokenSymbol(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z0-9_]{2,12}$/.test(normalized)) {
    return null;
  }

  return normalized;
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return parsed;
}

function parseTrackedSymbols(): string[] {
  const configured = (process.env.NEXT_PUBLIC_PROFILE_TOKEN_SYMBOLS || "")
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter((value) => /^[A-Z0-9_]{2,12}$/.test(value));

  return [...new Set([...DEFAULT_HEADER_TOKEN_SYMBOLS, ...configured])];
}

function formatTokenBalance(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function TokenBalancesInline({
  userId,
}: {
  userId?: string | null;
}) {
  const [entries, setEntries] = useState<RewardLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const trackedSymbols = useMemo(() => parseTrackedSymbols(), []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(false);
        const endpoint = userId
          ? `/api/rewards/ledger?userId=${encodeURIComponent(userId)}`
          : "/api/rewards/ledger";
        const response = await fetch(endpoint, {
          method: "GET",
          cache: "no-store",
        });

        const payload = await response.json().catch(() => null);
        if (!active) return;

        if (!response.ok || !Array.isArray(payload)) {
          setEntries([]);
          setError(true);
          return;
        }

        setEntries(payload);
      } catch {
        if (!active) return;
        setEntries([]);
        setError(true);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [userId]);

  const balances = useMemo<TokenBalance[]>(() => {
    const totals = new Map<string, number>();

    for (const symbol of trackedSymbols) {
      totals.set(symbol, 0);
    }

    for (const entry of entries) {
      const symbol = normalizeTokenSymbol(entry.token);
      if (!symbol) continue;

      const payoutStatus =
        typeof entry.payoutStatus === "string" ? entry.payoutStatus.trim().toUpperCase() : "";
      if (payoutStatus === "VOID") continue;

      totals.set(symbol, (totals.get(symbol) || 0) + toNumber(entry.amount));
    }

    return [...totals.entries()].map(([symbol, balance]) => ({ symbol, balance }));
  }, [entries, trackedSymbols]);

  if (error && !loading) {
    return (
      <div className="w-full text-right text-[11px] text-amber-300/90">
        Token balances unavailable
      </div>
    );
  }

  return (
    <div className="w-full flex flex-wrap justify-end gap-1.5">
      {balances.map((token) => (
        <span
          key={token.symbol}
          className="inline-flex items-center rounded-full border border-black/15 dark:border-white/15 px-2 py-0.5 text-[11px] font-medium"
        >
          ${token.symbol}: {loading ? "…" : formatTokenBalance(token.balance)}
        </span>
      ))}
    </div>
  );
}
