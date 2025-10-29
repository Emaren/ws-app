// src/components/header/MobileMenu.tsx
"use client";

import { useRouter } from "next/navigation";

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

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-4 flex flex-col gap-3">
      {!session ? (
        <>
          <button onClick={() => go("/register")} className="text-left hover:underline cursor-pointer">
            Register
          </button>
          <button
            onClick={async () => {
              close();
              const { signIn } = await import("next-auth/react");
              signIn();
            }}
            className="text-left hover:underline cursor-pointer"
          >
            Login
          </button>

          {/* Premium link on mobile too */}
          <button
            onClick={() => go("/premium")}
            className="text-left underline underline-offset-4 opacity-80 hover:opacity-100 cursor-pointer"
          >
            Premium
          </button>
        </>
      ) : (
        <>
          {isAdmin && (
            <button
              onClick={() => go("/admin")}
              className="px-3 py-2 rounded w-full text-center bg-black text-white dark:bg-white dark:text-black hover:opacity-90 cursor-pointer"
            >
              Admin Dashboard
            </button>
          )}

          <div className="text-sm opacity-80">
            {session?.user?.role === "ADMIN" && "👑 Admin "}
            {session?.user?.role === "CONTRIBUTOR" && "✍️ Contributor "}
            {session?.user?.role === "STONEHOLDER" && "🪨 Stoneholder "}
            {session?.user?.role === undefined && "Visitor "}
            – {session?.user?.email}
          </div>

          <button
            onClick={async () => {
              await connectWallet();
              close();
            }}
            className={`px-3 py-2 rounded w-full text-center cursor-pointer ${
              walletConnected
                ? "bg-green-100 text-green-800"
                : "bg-black text-white dark:bg-white dark:text-black"
            }`}
          >
            {walletConnected ? "Wallet Connected" : "Connect Wallet"}
          </button>

          <button
            onClick={() => {
              toggleTheme();
              close();
            }}
            className="px-3 py-2 rounded w-full text-center border border-black/10 dark:border-white/20 cursor-pointer"
          >
            Theme
          </button>

          <button
            onClick={async () => {
              const { signOut } = await import("next-auth/react");
              signOut();
              close();
            }}
            className="text-left hover:underline cursor-pointer"
          >
            Logout
          </button>
        </>
      )}
    </div>
  );
}
