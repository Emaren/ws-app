// src/app/ClientLayout.tsx
"use client";

import { useEffect, type ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import Header from "../components/Header";

const container = "ws-container";

export default function ClientLayout({ children }: { children: ReactNode }) {
  // Apply saved theme without hiding the page (no opacity gate)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("theme");
      const html = document.documentElement;
      if (saved === "light") {
        html.classList.remove("dark");
      } else {
        html.classList.add("dark");
      }
    } catch {
      // ignore
    }
  }, []);

  return (
    <SessionProvider>
      {/* Header: neutral wrapper to avoid nested <header> landmarks */}
      <div className={container}>
        <Header />
      </div>

      {/* Divider under header — keep vertical rhythm tokens */}
      <div className={container}>
        <div className="border-t border-neutral-200 dark:border-neutral-800 mt-[calc(var(--section-gap-sm)/2)] mb-[var(--section-gap-sm)]" />
      </div>

      {/* Main content */}
      <main className="min-h-[calc(100svh-var(--header-h,0px))] mt-[calc(var(--section-gap-sm)/3)] mb-[var(--section-gap-lg)]">
        {children}
      </main>
    </SessionProvider>
  );
}
