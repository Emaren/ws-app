// src/app/ClientLayout.tsx
"use client";

import { useEffect, type ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import Header from "../components/Header";
import PwaClient from "../components/pwa/PwaClient";

const container = "ws-container";

export default function ClientLayout({ children }: { children: ReactNode }) {
  // theme
  useEffect(() => {
    try {
      const saved = localStorage.getItem("theme");
      const html = document.documentElement;
      if (saved === "light") html.classList.remove("dark");
      else html.classList.add("dark");
    } catch {}
  }, []);

  // overflow debugger (visit with ?debug=overflow)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = location.search.toLowerCase();
    if (!q.includes("debug=overflow") && !q.includes("overflow")) return;
    requestAnimationFrame(() => {
      const vw = document.documentElement.clientWidth;
      const offenders: Element[] = [];
      document.querySelectorAll<HTMLElement>("body *").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (Math.ceil(el.scrollWidth) > vw || Math.ceil(r.right) > vw || r.left < -1) {
          el.style.outline = "2px solid #ff00ff";
          offenders.push(el);
        }
      });
      console.log("[OVERFLOW OFFENDERS]", offenders.map(el => ({
        tag: el.tagName, id: (el as HTMLElement).id, class: (el as HTMLElement).className,
        sw: (el as HTMLElement).scrollWidth
      })));
    });
  }, []);

  return (
    <SessionProvider>
      {/* ROOT CLAMP — nothing may exceed the visual viewport */}
      <div id="viewport-clamp" className="w-full max-w-[100svw] overflow-x-clip">
        <div className={container}>
          <Header />
        </div>

        <div className={container}>
          <div className="border-t border-neutral-200 dark:border-neutral-800 mt-[calc(var(--section-gap-sm)/7)] mb-[calc(var(--section-gap-sm)/2.2)]" />
        </div>

        <main className="w-full overflow-x-clip min-h-[calc(100svh-var(--header-h,0px))] mt-[calc(var(--section-gap-sm)/7)] mb-[var(--section-gap-lg)]">
          {children}
        </main>

        <PwaClient />
      </div>
    </SessionProvider>
  );
}
