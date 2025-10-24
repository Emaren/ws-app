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

      {/* Divider directly under header; width matches page grid (header/article/ad) */}
      <div className="mx-auto w-full max-w-5xl px-6">
        <div className="border-t border-neutral-200 dark:border-neutral-800 mt-2 mb-6" />
      </div>

      {/* Page content */}
      <main className="min-h-[calc(100svh-var(--header-h,0px))]">{children}</main>
    </SessionProvider>
  );
}
