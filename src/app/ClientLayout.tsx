// src/app/ClientLayout.tsx
"use client";

import { useEffect, type ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import Header from "../components/Header";

const container = "ws-container";

export default function ClientLayout({ children }: { children: ReactNode }) {
  // Keep saved theme without altering visual scale/spacing
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const html = document.documentElement;
    if (saved === "dark") html.classList.add("dark");
    else html.classList.remove("dark");
  }, []);

  return (
    <SessionProvider>
      {/* Header: use a neutral wrapper to avoid nested <header> landmarks */}
      <div className={container}>
        <Header />
      </div>

      {/* Divider under header — preserve existing rhythm tokens */}
      <div className={container}>
        <div className="border-t border-neutral-200 dark:border-neutral-800 mt-[calc(var(--section-gap-sm)/2)] mb-[var(--section-gap-sm)]" />
      </div>

      {/* Main content — no visual changes */}
      <main className="min-h-[calc(100svh-var(--header-h,0px))] mt-[calc(var(--section-gap-sm)/3)] mb-[var(--section-gap-lg)]">
        {children}
      </main>
    </SessionProvider>
  );
}
