// src/app/ClientLayout.tsx
"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import PageViewTracker from "@/components/analytics/PageViewTracker";
import Header from "../components/Header";
import PwaClient from "../components/pwa/PwaClient";
import {
  getSystemDefaultTheme,
  readThemeFromStorage,
} from "@/lib/theme";
import {
  applyExperienceToDocument,
  hasExperiencePreviewOverride,
  readExperienceFromClientStorage,
  readExperiencePreviewOverrideFromUrl,
} from "@/lib/experiencePreferences";

const container = "ws-container";

export default function ClientLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isExperiencePreviewRoute = pathname?.startsWith("/preview/") ?? false;

  // theme
  useEffect(() => {
    const previewOverride = readExperiencePreviewOverrideFromUrl();
    if (previewOverride) {
      applyExperienceToDocument(previewOverride);
      return;
    }

    const saved = readExperienceFromClientStorage();
    applyExperienceToDocument({
      theme: saved.theme ?? readThemeFromStorage() ?? getSystemDefaultTheme(),
      layout: saved.layout,
      edition: saved.edition,
      preset: saved.preset,
    });
  }, [pathname]);

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
      <div
        id="viewport-clamp"
        className="w-full max-w-[100svw] overflow-x-clip bg-[var(--background)]"
      >
        {isExperiencePreviewRoute ? null : (
          <>
            <div className={container}>
              <Header />
            </div>

            <div className={container}>
              <div className="border-t border-neutral-200 dark:border-neutral-800 mt-[calc(var(--section-gap-sm)/7)] mb-[calc(var(--section-gap-sm)/2.2)]" />
            </div>
          </>
        )}

        <main
          data-experience-preview={hasExperiencePreviewOverride() ? "true" : "false"}
          className={`w-full overflow-x-clip min-h-[calc(100svh-var(--header-h,0px))] ${
            isExperiencePreviewRoute
              ? "my-0"
              : "mt-[calc(var(--section-gap-sm)/7)] mb-[var(--section-gap-lg)]"
          }`}
        >
          <PageViewTracker />
          {children}
        </main>

        <PwaClient />
      </div>
    </SessionProvider>
  );
}
