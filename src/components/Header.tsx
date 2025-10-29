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

  const isAdmin = session?.user?.role === "ADMIN";
  const rightRailPx = 30;
  const dropRatio = session ? 0.4 : 0.15;

  return (
    <header
      ref={headerRef}
      className="w-full bg-[var(--background)] text-[var(--foreground)] shadow relative z-50"
      role="banner"
    >
      <div
        className="ws-container py-3 grid items-start gap-4 min-w-0"
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
            style={{ height: "clamp(72px, 12vw, 168px)", width: "auto" }}
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

        {/* Mobile hamburger */}
        <div className="md:hidden" style={{ gridColumn: 3 }} ref={menuBtnRef}>
          <button
            aria-label="Open menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((v) => !v)}
            className="p-2 rounded hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
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
