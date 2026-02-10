// src/components/Header.tsx
"use client";

declare global {
  interface Window {
    keplr?: { enable: (chainId: string) => Promise<void> };
  }
}

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import DesktopActions from "./header/DesktopActions";
import MobileMenu from "./header/MobileMenu";
import { isEditorialRole } from "@/lib/rbac";

export default function Header() {
  const { data: session } = useSession();
  const router = useRouter();

  const [walletConnected, setWalletConnected] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const headerRef = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const menuBtnRef = useRef<HTMLDivElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Expose header height
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const setHeaderVar = () =>
      document.documentElement.style.setProperty("--header-h", `${el.getBoundingClientRect().height}px`);
    setHeaderVar();
    const ro = new ResizeObserver(setHeaderVar);
    ro.observe(el);
    addEventListener("resize", setHeaderVar);
    return () => {
      ro.disconnect();
      removeEventListener("resize", setHeaderVar);
    };
  }, []);

  // Expose logo height
  useEffect(() => {
    const img = logoRef.current;
    if (!img) return;
    const setLogoVar = () =>
      document.documentElement.style.setProperty("--logo-h", `${img.getBoundingClientRect().height}px`);
    if (img.complete) setLogoVar();
    else img.addEventListener("load", setLogoVar, { once: true });
    const ro = new ResizeObserver(setLogoVar);
    ro.observe(img);
    addEventListener("resize", setLogoVar);
    return () => {
      ro.disconnect();
      removeEventListener("resize", setLogoVar);
    };
  }, []);

  // Close popovers on route change / outside click / Esc
  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
  }, [router]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuPanelRef.current && !menuPanelRef.current.contains(t) && menuBtnRef.current && !menuBtnRef.current.contains(t)) {
        setMenuOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(t)) setProfileOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setProfileOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const connectWallet = async () => {
    try {
      await window.keplr?.enable("wheatandstone");
      setWalletConnected(true);
    } catch {
      console.warn("Wallet not connected.");
    }
  };

  const toggleTheme = () => {
    const html = document.documentElement;
    const isDark = html.classList.contains("dark");
    html.classList.toggle("dark", !isDark);
    localStorage.setItem("theme", isDark ? "light" : "dark");
  };

  const isAdmin = isEditorialRole(session?.user?.role);

  // Right rail for hamburger (44px target + breathing room)
  const rightRailPx = 56;
  const dropRatio = session ? 0.4 : 0.15;

  return (
    <header
      ref={headerRef}
      className="w-full bg-[var(--background)] text-[var(--foreground)] shadow relative z-50"
      role="banner"
    >
      <div
        // slightly tighter on mobile
        className="ws-container pt-1 pb-0.5 md:pt-2 md:pb-2 grid items-center gap-4 min-w-0"
        style={{ gridTemplateColumns: `auto 1fr auto ${rightRailPx}px` }}
      >
        {/* Logo */}
        <a href="/" aria-label="Wheat & Stone home" className="flex items-start shrink-0 cursor-pointer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={logoRef}
            src="/tlogo.png"
            alt="Wheat & Stone"
            width={560}
            height={168}
            // slightly larger word-mark on small screens
            style={{ height: "clamp(72px, 10.8vw, 150px)", width: "auto" }}
            className="block select-none cursor-pointer"
            loading="eager"
            decoding="async"
          />
        </a>

        {/* Desktop actions */}
        <DesktopActions
          gridColumn={3}
          dropRatio={dropRatio}
          session={session}
          isAdmin={!!isAdmin}
          walletConnected={walletConnected}
          connectWallet={connectWallet}
          toggleTheme={toggleTheme}
          profileOpen={profileOpen}
          setProfileOpen={setProfileOpen}
          profileRef={profileRef}
        />

        {/* Mobile hamburger — flush right in its own rail */}
        <div
          className="md:hidden justify-self-end self-center"
          style={{ gridColumn: 4, transform: "translateY(3px)", marginRight: "-2px" }}
          ref={menuBtnRef}
        >
          <button
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((v) => !v)}
            className="w-11 h-11 inline-flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 active:scale-[0.98] transition cursor-pointer"
          >
            <svg
              className={`w-6 h-6 text-[var(--foreground)] opacity-90 transition-transform ${menuOpen ? "rotate-90" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {menuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <>
                  <path d="M3 6h18" />
                  <path d="M3 12h18" />
                  <path d="M3 18h18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile slide-down */}
      <div
        id="mobile-menu"
        ref={menuPanelRef}
        className={`md:hidden absolute left-0 right-0 top-full bg-[var(--background)] text-[var(--foreground)] border-t border-black/10 dark:border-white/10 shadow transition-[max-height,opacity] overflow-hidden ${
          menuOpen ? "opacity-100 max-h-[480px]" : "opacity-0 max-h-0"
        }`}
      >
        <MobileMenu
          session={session}
          isAdmin={!!isAdmin}
          walletConnected={walletConnected}
          connectWallet={connectWallet}
          toggleTheme={toggleTheme}
          close={() => setMenuOpen(false)}
        />
      </div>
    </header>
  );
}
