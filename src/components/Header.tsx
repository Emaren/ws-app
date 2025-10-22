// src/components/Header.tsx
'use client';

declare global {
  interface Window {
    keplr?: {
      enable: (chainId: string) => Promise<void>;
    };
  }
}

import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Header() {
  const { data: session } = useSession();
  const router = useRouter();
  const [walletConnected, setWalletConnected] = useState(false);

  const connectWallet = async () => {
    if (window.keplr) {
      try {
        await window.keplr.enable("wheatandstone");
        setWalletConnected(true);
      } catch {
        console.warn("Wallet not connected.");
      }
    }
  };

  return (
    <header className="w-full flex justify-between items-center px-1 py-1 bg-white shadow">
      {/* Left: Logo */}
      <a href="/">
        <img src="/logog.png" alt="Wheat and Stone" className="h-40" />
      </a>

      {/* Right: Session + Buttons */}
      <div className="flex gap-4 items-center">
        {!session ? (
          <>
            <button
              onClick={() => router.push("/register")}
              className="hover:underline cursor-pointer"
            >
              Register
            </button>
            <button
              onClick={() => signIn()}
              className="hover:underline cursor-pointer"
            >
              Login
            </button>
          </>
        ) : (
          <>
            <span className="text-gray-700">
              {session.user?.role === "ADMIN" && "👑 Admin "}
              {session.user?.role === "CONTRIBUTOR" && "✍️ Contributor "}
              {session.user?.role === "STONEHOLDER" && "🪨 Stoneholder "}
              {session.user?.role === undefined && "Visitor "}
              – {session.user?.email}
            </span>
            <button
              onClick={() => signOut()}
              className="hover:underline cursor-pointer"
            >
              Logout
            </button>
          </>
        )}

        {session && (
          <button
            onClick={connectWallet}
            className={`px-3 py-1 rounded cursor-pointer ${
              walletConnected
                ? "bg-green-100 text-green-800"
                : "bg-black text-white"
            }`}
          >
            {walletConnected ? "Wallet Connected" : "Connect Wallet"}
          </button>
        )}
      </div>
    </header>
  );
}
