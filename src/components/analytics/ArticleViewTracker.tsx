"use client";

import { useEffect, useRef } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics/client";

type ArticleViewTrackerProps = {
  articleSlug: string;
  sourceContext: string;
};

function buildDedupeKey(articleSlug: string): string {
  return `ws:article-view:${articleSlug}:${window.location.pathname}`;
}

export default function ArticleViewTracker({
  articleSlug,
  sourceContext,
}: ArticleViewTrackerProps) {
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current) return;
    if (!articleSlug) return;
    sentRef.current = true;

    try {
      const dedupeKey = buildDedupeKey(articleSlug);
      if (window.sessionStorage.getItem(dedupeKey)) {
        return;
      }
      window.sessionStorage.setItem(dedupeKey, new Date().toISOString());
    } catch {
      // Continue even if sessionStorage is unavailable.
    }

    trackAnalyticsEvent({
      eventType: "ARTICLE_VIEW",
      articleSlug,
      sourceContext,
      metadata: {
        viewportWidth: window.innerWidth,
      },
    });
  }, [articleSlug, sourceContext]);

  return null;
}
