// src/components/Header.tsx
'use client';

declare global {
  interface Window {
    keplr?: { enable: (chainId: string) => Promise<void> };
  }
}

import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";

export default function Header() {
  const { data: session } = useSession();
  const router = useRouter();
  const [walletConnected, setWalletConnected] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // close the mobile menu on route changes (best effort)
  useEffect(() => {
    setMenuOpen(false);
  }, [router]);

  // close on outside click
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (menuRef.current.contains(e.target as Node)) return;
      setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [menuOpen]);

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

  const toggleTheme = () => {
    const html = document.documentElement;
    const isDark = html.classList.contains("dark");
    html.classList.toggle("dark", !isDark);
    localStorage.setItem("theme", isDark ? "light" : "dark");
  };

  return (
    <header className="w-full px-6 md:px-8 py-3 bg-[var(--background)] text-[var(--foreground)] shadow relative">
      <div className="mx-auto max-w-6xl flex items-center justify-between gap-4">
        {/* Left: Logo (responsive height via clamp) */}
        <a href="/" aria-label="Wheat & Stone home" className="flex items-center">
          <img
            id="ws-header-logo"
            src="/tlogo.png"
            alt="Wheat & Stone"
            style={{ height: 'clamp(72px, 12vw, 168px)', width: 'auto' }}
            className="block select-none"
            loading="eager"
            decoding="async"
          />
        </a>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-4">
          {!session ? (
            <>
              <button onClick={() => router.push("/register")} className="hover:underline">
                Register
              </button>
              <button onClick={() => signIn()} className="hover:underline">
                Login
              </button>
            </>
          ) : (
            <>
              <span>
                {session.user?.role === "ADMIN" && "👑 Admin "}
                {session.user?.role === "CONTRIBUTOR" && "✍️ Contributor "}
                {session.user?.role === "STONEHOLDER" && "🪨 Stoneholder "}
                {session.user?.role === undefined && "Visitor "}– {session.user?.email}
              </span>
              <button onClick={() => signOut()} className="hover:underline">
                Logout
              </button>
            </>
          )}

          {session && (
            <button
              onClick={connectWallet}
              className={`px-3 py-1 rounded ${
                walletConnected
                  ? "bg-green-100 text-green-800"
                  : "bg-black text-white dark:bg-white dark:text-black"
              }`}
            >
              {walletConnected ? "Wallet Connected" : "Connect Wallet"}
            </button>
          )}

          <button
            onClick={toggleTheme}
            className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-800"
          >
            Toggle Theme
          </button>
        </div>

        {/* Mobile: hamburger */}
        <div className="md:hidden">
          <button
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="p-2 rounded hover:bg-black/5 dark:hover:bg-white/10"
          >
            {/* Hamburger / X */}
            <svg
              className={`h-6 w-6 transition-transform ${menuOpen ? "rotate-90" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M3 12h18M3 18h18" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile slide-down panel */}
      <div
        ref={menuRef}
        className={`md:hidden absolute left-0 right-0 top-full bg-[var(--background)] text-[var(--foreground)] border-t border-black/10 dark:border-white/10 shadow transition-[max-height,opacity] overflow-hidden ${menuOpen ? "opacity-100 max-h-[420px]" : "opacity-0 max-h-0"}`}
      >
        <div className="mx-auto max-w-6xl px-6 py-4 flex flex-col gap-3">
          {!session ? (
            <>
              <button
                onClick={() => { setMenuOpen(false); router.push("/register"); }}
                className="text-left hover:underline"
              >
                Register
              </button>
              <button
                onClick={() => { setMenuOpen(false); signIn(); }}
                className="text-left hover:underline"
              >
                Login
              </button>
            </>
          ) : (
            <>
              <div className="text-sm opacity-80">
                {session.user?.role === "ADMIN" && "👑 Admin "}
                {session.user?.role === "CONTRIBUTOR" && "✍️ Contributor "}
                {session.user?.role === "STONEHOLDER" && "🪨 Stoneholder "}
                {session.user?.role === undefined && "Visitor "}– {session.user?.email}
              </div>
              <button
                onClick={() => { setMenuOpen(false); signOut(); }}
                className="text-left hover:underline"
              >
                Logout
              </button>
            </>
          )}

          {session && (
            <button
              onClick={() => { setMenuOpen(false); connectWallet(); }}
              className={`px-3 py-2 rounded w-full text-center ${
                walletConnected
                  ? "bg-green-100 text-green-800"
                  : "bg-black text-white dark:bg-white dark:text-black"
              }`}
            >
              {walletConnected ? "Wallet Connected" : "Connect Wallet"}
            </button>
          )}

          <button
            onClick={() => { setMenuOpen(false); toggleTheme(); }}
            className="px-3 py-2 rounded bg-gray-200 dark:bg-gray-800 w-full text-center"
          >
            Toggle Theme
          </button>
        </div>
      </div>
    </header>
  );
}
