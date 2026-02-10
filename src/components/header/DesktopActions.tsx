// src/components/header/DesktopActions.tsx
"use client";

import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { roleBadgePrefix } from "@/lib/rbac";

type SessionLike = {
  user?: { email?: string | null; role?: string | null } | null;
} | null;

function ProfileIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M12 12c2.76 0 5-2.69 5-6s-2.24-5-5-5-5 2.69-5 6 2.24 5 5 5Zm0 2c-3.33 0-10 1.67-10 5v1a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-1c0-3.33-6.67-5-10-5Z"
      />
    </svg>
  );
}

export default function DesktopActions({
  gridColumn,
  dropRatio,
  session,
  isAdmin,
  walletConnected,
  connectWallet,
  toggleTheme,
  profileOpen,
  setProfileOpen,
  profileRef,
}: {
  gridColumn: number;
  dropRatio: number;
  session: SessionLike;
  isAdmin: boolean;
  walletConnected: boolean;
  connectWallet: () => Promise<void> | void;
  toggleTheme: () => void;
  profileOpen: boolean;
  setProfileOpen: (v: boolean) => void;
  // accept MutableRefObject or RefObject (null-safe)
  profileRef:
    | React.MutableRefObject<HTMLDivElement | null>
    | React.RefObject<HTMLDivElement | null>;
}) {
  const router = useRouter();
  const identityLabel = session?.user?.email
    ? `${roleBadgePrefix(session?.user?.role)} - ${session.user.email}`
    : roleBadgePrefix(session?.user?.role);

  return (
    <div
      className="hidden md:flex items-center gap-3 whitespace-nowrap min-w-0 justify-end"
      style={{
        gridColumn,
        transform: `translateY(calc(var(--logo-h, 96px) * ${dropRatio}))`,
      }}
    >
      {!session ? (
        // Guest: Register/Login on the first row, Premium under them
        <div className="flex flex-col items-end">
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
        </div>
      ) : (
        <>
          {isAdmin && (
            <button
              onClick={() => router.push("/admin")}
              className="shrink-0 px-3 py-1 rounded bg-black text-white dark:bg-neutral-800 dark:text-black hover:opacity-90 cursor-pointer"
              aria-label="Open Admin Dashboard"
              title="Admin Dashboard"
            >
              Admin
            </button>
          )}

          <div className="flex min-w-[220px] max-w-[36ch] flex-col items-end">
            <button
              onClick={connectWallet}
              className={`shrink-0 px-3 py-1 rounded-md border transition cursor-pointer ${
                walletConnected
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/30 hover:bg-emerald-500/25"
                  : "bg-neutral-200 text-neutral-900 border-neutral-300 hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-700"
              }`}
            >
              {walletConnected ? "Wallet Connected" : "Connect Wallet"}
            </button>

            {/* On constrained widths, identity lives below Connect Wallet. */}
            <span className="mt-1 hidden w-full truncate text-right text-[11px] opacity-75 lg:block xl:hidden">
              {identityLabel}
            </span>
          </div>

          <span className="hidden max-w-[38ch] truncate text-sm xl:block">
            {identityLabel}
          </span>

          {/* Profile popover */}
          <div className="relative shrink-0" ref={profileRef as any}>
            <button
              aria-haspopup="menu"
              aria-expanded={profileOpen}
              aria-label="Profile menu"
              onClick={() => setProfileOpen(!profileOpen)}
              className="inline-flex items-center justify-center rounded-full border p-2 hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
            >
              <ProfileIcon className="text-[var(--foreground)]" />
            </button>

            {profileOpen && (
              <div
                className="absolute right-0 mt-2 w-44 rounded-xl border bg-white text-black shadow-lg dark:border-neutral-800 dark:bg-neutral-900 dark:text-white z-[60] flex flex-col p-1"
                role="menu"
                aria-label="Profile"
              >
                <button
                  role="menuitem"
                  className="block w-full px-3 py-2 text-left rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                  onClick={() => {
                    toggleTheme();
                    setProfileOpen(false);
                  }}
                >
                  Theme
                </button>
                <button
                  role="menuitem"
                  className="block w-full px-3 py-2 text-left rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                  onClick={async () => {
                    setProfileOpen(false);
                    const { signOut } = await import("next-auth/react");
                    signOut();
                  }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
