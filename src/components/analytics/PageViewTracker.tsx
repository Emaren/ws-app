"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import {
  readEditionFromDocument,
  readLayoutFromDocument,
  readPresetFromDocument,
  readSiteVersionFromDocument,
  readSkinFromDocument,
} from "@/lib/experiencePreferences";
import { readThemeFromDocument } from "@/lib/theme";

function dedupeKey(pathname: string): string {
  return `ws:page-view:${pathname}`;
}

export default function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) {
      return;
    }

    try {
      const key = dedupeKey(pathname);
      if (window.sessionStorage.getItem(key)) {
        return;
      }
      window.sessionStorage.setItem(key, new Date().toISOString());
    } catch {
      // Continue even if session storage is unavailable.
    }

    trackAnalyticsEvent({
      eventType: "PAGE_VIEW",
      sourceContext: pathname,
      pagePath: pathname,
      metadata: {
        theme: readThemeFromDocument(),
        layout: readLayoutFromDocument(),
        edition: readEditionFromDocument(),
        preset: readPresetFromDocument(),
        skin: readSkinFromDocument(),
        siteVersion: readSiteVersionFromDocument(),
        viewportWidth: window.innerWidth,
      },
    });
  }, [pathname]);

  return null;
}
