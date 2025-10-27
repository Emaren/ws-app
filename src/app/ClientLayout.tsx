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

      {/* Divider under header */}
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
