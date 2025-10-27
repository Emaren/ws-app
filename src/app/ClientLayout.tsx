// src/app/ClientLayout.tsx
"use client";

import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import Header from "../components/Header";

const container = "ws-container";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const html = document.documentElement;
    if (saved === "dark") html.classList.add("dark");
    else html.classList.remove("dark");
  }, []);

  return (
    <SessionProvider>
      {/* Header */}
      <header className={container}>
        <Header />
      </header>

      {/* Divider directly under header; width matches page grid (header/article/ad) */}
      <div className="site-shell--wide">
        <div className="border-t border-neutral-200 dark:border-neutral-800 mt-2 mb-6" />
      </div>

      {/* Page content */}
      <main className="site-shell--wide min-h-[calc(100svh-var(--header-h,0px))] pb-16">
        {children}
      </main>
    </SessionProvider>
  );
}
