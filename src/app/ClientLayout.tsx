// src/app/ClientLayout.tsx
"use client";

import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import Header from "../components/Header";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  // Restore theme on first paint
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const html = document.documentElement;
    if (saved === "dark") html.classList.add("dark");
    else html.classList.remove("dark");
  }, []);

  return (
    <SessionProvider>
      <Header />

      {/* 3/4-width divider under the header, centered */}
      <div className="mx-auto w-3/4 border-t border-neutral-200 dark:border-neutral-800 mt-2 mb-6" />

      {/* Page content area (keeps viewport height minus header if you want) */}
      <main className="min-h-[calc(100svh-var(--header-h,0px))]">
        {children}
      </main>
    </SessionProvider>
  );
}
