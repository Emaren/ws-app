// src/components/Header.tsx
"use client";

declare global {
  interface Window {
    keplr?: { enable: (chainId: string) => Promise<void> };
  }
}

import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";

/** Clean icon-only profile glyph */
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

export default function Header() {
  const { data: session } = useSession();
  const router = useRouter();

  const [walletConnected, setWalletConnected] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false); // mobile menu
  const [profileOpen, setProfileOpen] = useState(false); // desktop profile dropdown

  // Measure header height and expose as CSS var --header-h
  const headerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const setVar = () => {
      const h = el.getBoundingClientRect().height;
      document.documentElement.style.setProperty("--header-h", `${h}px`);
    };
    setVar();

    const ro = new ResizeObserver(setVar);
    ro.observe(el);
    window.addEventListener("resize", setVar);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", setVar);
    };
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
  }, [router]);

  // Close mobile menu on outside click
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

  // Close profile dropdown on outside click
  const profileRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!profileRef.current) return;
      if (profileRef.current.contains(e.target as Node)) return;
      setProfileOpen(false);
    };
    if (profileOpen) document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [profileOpen]);

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

  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <header
      ref={headerRef}
      className="w-full bg-[var(--background)] text-[var(--foreground)] shadow relative"
    >
      <div className="mx-auto w-full max-w-5xl px-6 md:px-6 py-3 flex items-center justify-between gap-4">
        {/* Left: Logo */}
        <a href="/" aria-label="Wheat & Stone home" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            id="ws-header-logo"
            src="/tlogo.png"
            alt="Wheat & Stone"
            style={{ height: "clamp(72px, 12vw, 168px)", width: "auto" }}
            className="block select-none"
            loading="eager"
            decoding="async"
          />
        </a>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-3">
          {!session ? (
            <>
              <button
                onClick={() => router.push("/register")}
                className="hover:underline cursor-pointer"
              >
                Register
              </button>
              <button onClick={() => signIn()} className="hover:underline cursor-pointer">
                Login
              </button>
            </>
          ) : (
            <>
              {isAdmin && (
                <button
                  onClick={() => router.push("/admin")}
                  className="px-3 py-1 rounded bg-black text-white dark:bg-white dark:text-black hover:opacity-90 cursor-pointer"
                  aria-label="Open Admin Dashboard"
                  title="Admin Dashboard"
                >
                  Admin
                </button>
              )}

              <span className="text-sm">
                {session.user?.role === "ADMIN" && "👑 Admin "}
                {session.user?.role === "CONTRIBUTOR" && "✍️ Contributor "}
                {session.user?.role === "STONEHOLDER" && "🪨 Stoneholder "}
                {session.user?.role === undefined && "Visitor "}
                – {session.user?.email}
              </span>

              <button
                onClick={connectWallet}
                className={`px-3 py-1 rounded cursor-pointer ${
                  walletConnected
                    ? "bg-green-100 text-green-800"
                    : "bg-black text-white dark:bg-white dark:text-black"
                }`}
              >
                {walletConnected ? "Wallet Connected" : "Connect Wallet"}
              </button>

              {/* Profile icon */}
              <div className="relative" ref={profileRef}>
                <button
                  aria-haspopup="menu"
                  aria-expanded={profileOpen}
                  aria-label="Profile menu"
                  onClick={() => setProfileOpen((v) => !v)}
                  className="inline-flex items-center justify-center rounded-full border p-2 hover:bg-neutral-100 dark:hover:bg-neutral-900"
                >
                  <ProfileIcon className="text-[var(--foreground)]" />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-xl border bg-white text-black shadow-lg dark:border-neutral-800 dark:bg-neutral-900 dark:text-white z-50">
                    <button
                      className="w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      onClick={() => {
                        toggleTheme();
                        setProfileOpen(false);
                      }}
                    >
                      Theme
                    </button>
                    <button
                      className="w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      onClick={() => {
                        setProfileOpen(false);
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

        {/* Mobile: hamburger */}
        <div className="md:hidden">
          <button
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="p-2 rounded hover:bg-black/5 dark:hover:bg-white/10"
          >
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

      {/* Mobile slide-down */}
      <div
        ref={menuRef}
        className={`md:hidden absolute left-0 right-0 top-full bg-[var(--background)] text-[var(--foreground)] border-t border-black/10 dark:border-white/10 shadow transition-[max-height,opacity] overflow-hidden ${
          menuOpen ? "opacity-100 max-h-[480px]" : "opacity-0 max-h-0"
        }`}
      >
        <div className="mx-auto w-full max-w-5xl px-6 py-4 flex flex-col gap-3">
          {!session ? (
            <>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/register");
                }}
                className="text-left hover:underline cursor-pointer"
              >
                Register
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  signIn();
                }}
                className="text-left hover:underline cursor-pointer"
              >
                Login
              </button>
            </>
          ) : (
            <>
              {isAdmin && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    router.push("/admin");
                  }}
                  className="px-3 py-2 rounded w-full text-center bg-black text-white dark:bg-white dark:text-black hover:opacity-90 cursor-pointer"
                >
                  Admin Dashboard
                </button>
              )}

              <div className="text-sm opacity-80">
                {session.user?.role === "ADMIN" && "👑 Admin "}
                {session.user?.role === "CONTRIBUTOR" && "✍️ Contributor "}
                {session.user?.role === "STONEHOLDER" && "🪨 Stoneholder "}
                {session.user?.role === undefined && "Visitor "}
                – {session.user?.email}
              </div>

              <button
                onClick={() => {
                  setMenuOpen(false);
                  connectWallet();
                }}
                className={`px-3 py-2 rounded w-full text-center ${
                  walletConnected
                    ? "bg-green-100 text-green-800"
                    : "bg-black text-white dark:bg-white dark:text-black"
                }`}
              >
                {walletConnected ? "Wallet Connected" : "Connect Wallet"}
              </button>

              <button
                onClick={toggleTheme}
                className="px-3 py-2 rounded w-full text-center border border-black/10 dark:border-white/20"
              >
                Theme
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  signOut();
                }}
                className="text-left hover:underline"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
