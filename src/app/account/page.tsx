import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";
import { normalizeAppRole, roleBadgePrefix } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import SignOutButton from "./SignOutButton";

function roleLandingPath(roleInput: string | null | undefined): string {
  const role = normalizeAppRole(roleInput);
  if (role === "CONTRIBUTOR") {
    return "/admin/new";
  }

  if (role === "OWNER" || role === "ADMIN" || role === "EDITOR") {
    return "/admin";
  }

  return "/";
}

const DEFAULT_PROFILE_TOKEN_SYMBOLS = ["WHEAT", "STONE", "TOKEN"] as const;

function parseProfileTokenSymbols() {
  const configured = (process.env.NEXT_PUBLIC_PROFILE_TOKEN_SYMBOLS || "")
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter((value) => /^[A-Z0-9_]{2,12}$/.test(value));

  return [...new Set([...DEFAULT_PROFILE_TOKEN_SYMBOLS, ...configured])];
}

function toTokenAmount(value: unknown) {
  const numeric = Number(typeof value === "object" && value !== null ? String(value) : value);
  if (!Number.isFinite(numeric)) return 0;
  return numeric;
}

function formatTokenBalance(value: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(value);
}

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login?callbackUrl=/account");
  }

  const roleLabel = roleBadgePrefix(session.user.role) || "👤 User";
  const primaryPath = roleLandingPath(session.user.role);
  const primaryLabel = primaryPath === "/admin/new" ? "New Article" : primaryPath === "/admin" ? "Admin" : "Home";
  const trackedTokens = parseProfileTokenSymbols();

  const rewardEntries = await prisma.rewardLedger.findMany({
    where: { userId: session.user.id },
    select: {
      token: true,
      direction: true,
      amount: true,
    },
  });

  const balancesByToken = new Map<string, number>();
  for (const entry of rewardEntries) {
    const token = String(entry.token || "").toUpperCase();
    if (!token) continue;
    const signedAmount =
      entry.direction === "DEBIT" ? -toTokenAmount(entry.amount) : toTokenAmount(entry.amount);
    balancesByToken.set(token, (balancesByToken.get(token) || 0) + signedAmount);
  }

  const tokenSymbols = [
    ...trackedTokens,
    ...[...balancesByToken.keys()].filter((symbol) => !trackedTokens.includes(symbol)),
  ];

  const tokenBalances = tokenSymbols.map((symbol) => ({
    symbol,
    balance: balancesByToken.get(symbol) || 0,
  }));

  return (
    <main className="ws-container py-8 md:py-10">
      <section className="ws-article rounded-2xl border border-black/10 dark:border-white/15 bg-black/[0.03] dark:bg-white/[0.04] p-5 md:p-6 space-y-4">
        <header>
          <p className="text-xs uppercase tracking-[0.24em] opacity-65">Account</p>
          <h1 className="text-2xl md:text-3xl font-semibold mt-1">Profile</h1>
        </header>

        <dl className="space-y-2 text-sm md:text-base">
          <div className="flex items-center justify-between gap-4">
            <dt className="opacity-70">Role</dt>
            <dd className="font-medium text-right">{roleLabel}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="opacity-70">Email</dt>
            <dd className="font-medium text-right">{session.user.email ?? "-"}</dd>
          </div>
        </dl>

        <section className="rounded-xl border border-black/10 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.03] p-4 md:p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base md:text-lg font-semibold">Token Balances</h2>
            <span className="text-xs opacity-70">Extensible display</span>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
            {tokenBalances.map((token) => (
              <div
                key={token.symbol}
                className="rounded-lg border border-black/10 dark:border-white/15 px-3 py-2"
              >
                <p className="text-xs uppercase tracking-[0.2em] opacity-70">${token.symbol}</p>
                <p className="mt-1 text-xl font-semibold">{formatTokenBalance(token.balance)}</p>
              </div>
            ))}
          </div>

          <p className="text-xs opacity-70">
            Add more display symbols via <code>NEXT_PUBLIC_PROFILE_TOKEN_SYMBOLS</code> (comma separated).
          </p>
        </section>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link
            href={primaryPath}
            className="inline-flex items-center rounded-lg border border-black/15 dark:border-white/20 px-3 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"
          >
            Open {primaryLabel}
          </Link>
          <SignOutButton />
        </div>
      </section>
    </main>
  );
}
