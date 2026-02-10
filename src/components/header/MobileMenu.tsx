// src/components/header/MobileMenu.tsx
"use client";

import { useRouter } from "next/navigation";
import { roleBadgePrefix } from "@/lib/rbac";

type SessionLike = {
  user?: { email?: string | null; role?: string | null } | null;
} | null;

export default function MobileMenu({
  session,
  isAdmin,
  walletConnected,
  connectWallet,
  toggleTheme,
  close,
}: {
  session: SessionLike;
  isAdmin: boolean;
  walletConnected: boolean;
  connectWallet: () => Promise<void> | void;
  toggleTheme: () => void;
  close: () => void;
}) {
  const router = useRouter();

  const go = (path: string) => {
    close();
    router.push(path);
  };

  const identityLabel = session?.user?.email
    ? `${roleBadgePrefix(session?.user?.role)} - ${session.user.email}`
    : roleBadgePrefix(session?.user?.role);

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-4 flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => go("/articles")}
          className="rounded-lg border border-black/10 dark:border-white/15 px-3 py-2 text-sm text-left hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
        >
          Articles
        </button>

        <button
          onClick={() => go("/premium")}
          className="rounded-lg border border-black/10 dark:border-white/15 px-3 py-2 text-sm text-left hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
        >
          Premium
        </button>

        {!session ? (
          <>
            <button
              onClick={() => go("/register")}
              className="rounded-lg border border-black/10 dark:border-white/15 px-3 py-2 text-sm text-left hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
            >
              Register
            </button>
            <button
              onClick={async () => {
                close();
                const { signIn } = await import("next-auth/react");
                signIn();
              }}
              className="rounded-lg border border-black/10 dark:border-white/15 px-3 py-2 text-sm text-left hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
            >
              Login
            </button>
          </>
        ) : isAdmin ? (
          <button
            onClick={() => go("/admin")}
            className="rounded-lg border border-black/10 dark:border-white/15 px-3 py-2 text-sm text-left hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
          >
            Admin Dashboard
          </button>
        ) : (
          <span aria-hidden className="rounded-lg border border-transparent px-3 py-2" />
        )}
      </div>

      {session ? (
        <>
          <div className="rounded-xl border border-black/10 dark:border-white/10 px-3 py-3">
            <button
              onClick={async () => {
                await connectWallet();
                close();
              }}
              className={`w-full px-3 py-2 rounded text-sm font-medium text-center cursor-pointer transition ${
                walletConnected
                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 hover:bg-emerald-500/25"
                  : "bg-black text-white dark:bg-white dark:text-black"
              }`}
            >
              {walletConnected ? "Wallet Connected" : "Connect Wallet"}
            </button>

            <div className="mt-2 text-[12px] opacity-80 break-all">{identityLabel}</div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                toggleTheme();
                close();
              }}
              className="rounded-lg border border-black/10 dark:border-white/20 px-3 py-2 text-sm text-left hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
            >
              Theme
            </button>

            <button
              onClick={async () => {
                const { signOut } = await import("next-auth/react");
                signOut();
                close();
              }}
              className="rounded-lg border border-black/10 dark:border-white/20 px-3 py-2 text-sm text-left hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
            >
              Logout
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
