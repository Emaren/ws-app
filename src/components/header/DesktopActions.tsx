// src/components/header/DesktopActions.tsx
"use client";

import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import type { SVGProps } from "react";
import { normalizeAppRole, roleBadgePrefix } from "@/lib/rbac";
import ThemeCircles from "./ThemeCircles";
import TokenBalancesInline from "./TokenBalancesInline";
import type { ThemeMode } from "@/lib/theme";

type SessionLike = {
  user?: {
    id?: string | null;
    wsApiUserId?: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
} | null;

function ProfileIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M12 12c2.76 0 5-2.69 5-6s-2.24-5-5-5-5 2.69-5 6 2.24 5 5 5Zm0 2c-3.33 0-10 1.67-10 5v1a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-1c0-3.33-6.67-5-10-5Z"
      />
    </svg>
  );
}

function roleLandingPath(roleInput: string | null | undefined): string {
  const role = normalizeAppRole(roleInput);
  if (role === "CONTRIBUTOR") {
    return "/admin/new";
  }

  if (role === "OWNER" || role === "ADMIN" || role === "EDITOR") {
    return "/admin";
  }

  return "/account";
}

export default function DesktopActions({
  gridColumn,
  session,
  theme,
  setTheme,
  walletConnected,
  walletBusy,
  walletAddressLabel,
  walletError,
  connectWallet,
}: {
  gridColumn: number;
  session: SessionLike;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  walletConnected: boolean;
  walletBusy: boolean;
  walletAddressLabel: string | null;
  walletError: string | null;
  connectWallet: () => Promise<void> | void;
}) {
  const router = useRouter();
  const roleLanding = roleLandingPath(session?.user?.role);
  const identityLabel = session?.user?.email
    ? `${roleBadgePrefix(session?.user?.role)} - ${session.user.email}`
    : roleBadgePrefix(session?.user?.role);

  return (
    <div
      className="hidden min-w-0 justify-self-end whitespace-nowrap md:flex"
      style={{
        gridColumn,
      }}
    >
      {!session ? (
        // Guest: Register/Login first row, Premium second row, themes third row.
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/register")}
              className="hover:underline shrink-0 cursor-pointer"
            >
              Register
            </button>
            <button
              onClick={() => signIn()}
              className="hover:underline shrink-0 cursor-pointer"
            >
              Login
            </button>
          </div>

          <button
            onClick={() => router.push("/premium")}
            className="mt-1 text-[13px] opacity-80 hover:opacity-100 cursor-pointer"
            aria-label="Premium subscription signup"
            title="Premium"
          >
            Premium
          </button>

          <ThemeCircles value={theme} onChange={setTheme} />
        </div>
      ) : (
        <div className="flex min-w-[260px] max-w-[360px] flex-col items-end gap-1.5">
          <div className="flex w-full items-center justify-end gap-2">
            <button
              onClick={connectWallet}
              disabled={walletBusy}
              className="inline-flex h-10 items-center shrink-0 rounded-xl border border-black/10 bg-black/10 px-3 text-sm font-medium hover:bg-black/15 dark:border-white/15 dark:bg-white/10 dark:hover:bg-white/15 cursor-pointer"
              aria-label={walletConnected ? "Wallet linked" : "Connect wallet"}
            >
              {walletBusy
                ? "Linking..."
                : walletConnected
                  ? "Wallet Linked"
                  : "Connect Wallet"}
            </button>

            <button
              aria-label="Open profile"
              title="Profile"
              onClick={() => router.push("/account")}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 hover:bg-neutral-100 dark:border-white/15 dark:hover:bg-neutral-900 cursor-pointer"
            >
              <ProfileIcon className="text-[var(--foreground)]" />
            </button>
          </div>

          <button
            onClick={() => router.push(roleLanding)}
            className="w-full truncate text-right text-[12px] opacity-75 hover:opacity-100 hover:underline underline-offset-4 cursor-pointer"
            title={identityLabel}
          >
            {identityLabel}
          </button>

          <div className="w-full flex items-center justify-end">
            <ThemeCircles value={theme} onChange={setTheme} />
          </div>

          {session?.user?.id ? (
            <TokenBalancesInline userId={session.user.id} />
          ) : null}

          {walletAddressLabel ? (
            <span className="w-full truncate text-right text-[11px] text-emerald-300/90">
              {walletAddressLabel}
            </span>
          ) : null}

          {walletError ? (
            <span className="w-full truncate text-right text-[11px] text-amber-300/90">
              {walletError}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
