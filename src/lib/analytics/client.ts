"use client";

import {
  ANALYTICS_EVENT_TYPES,
  type AnalyticsEventPayload,
  type AnalyticsEventType,
} from "./types";

const ANALYTICS_ENDPOINT = "/api/analytics/events";
const SESSION_ID_STORAGE_KEY = "ws:analytics:session-id";

declare global {
  interface Window {
    plausible?: (
      eventName: string,
      options?: {
        props?: Record<string, string | number | boolean | null | undefined>;
      },
    ) => void;
  }
}

function isValidEventType(value: string): value is AnalyticsEventType {
  return (ANALYTICS_EVENT_TYPES as readonly string[]).includes(value);
}

function trimTo(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function buildFallbackSessionId(): string {
  return `ws-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getAnalyticsSessionId(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const existing = window.sessionStorage.getItem(SESSION_ID_STORAGE_KEY);
    if (existing) return existing;

    const nextSessionId =
      typeof window.crypto?.randomUUID === "function"
        ? window.crypto.randomUUID()
        : buildFallbackSessionId();

    window.sessionStorage.setItem(SESSION_ID_STORAGE_KEY, nextSessionId);
    return nextSessionId;
  } catch {
    return null;
  }
}

function trackPlausibleEvent(payload: AnalyticsEventPayload): void {
  if (typeof window === "undefined" || typeof window.plausible !== "function") {
    return;
  }

  try {
    window.plausible(`ws_${payload.eventType.toLowerCase()}`, {
      props: {
        articleSlug: payload.articleSlug ?? undefined,
        businessSlug: payload.businessSlug ?? undefined,
        sourceContext: payload.sourceContext ?? undefined,
        adSlot: payload.adSlot ?? undefined,
        channel: payload.channel ?? undefined,
      },
    });
  } catch {
    // Ignore analytics mirroring failures.
  }
}

export function trackAnalyticsEvent(payload: AnalyticsEventPayload): void {
  if (typeof window === "undefined") return;
  if (!isValidEventType(payload.eventType)) return;

  const event: AnalyticsEventPayload = {
    ...payload,
    articleSlug: trimTo(payload.articleSlug, 120),
    businessSlug: trimTo(payload.businessSlug, 120),
    campaignId: trimTo(payload.campaignId, 64),
    offerId: trimTo(payload.offerId, 64),
    inventoryItemId: trimTo(payload.inventoryItemId, 64),
    sourceContext: trimTo(payload.sourceContext, 120),
    adSlot: trimTo(payload.adSlot, 64),
    destinationUrl: trimTo(payload.destinationUrl, 1000),
    referrerUrl: trimTo(payload.referrerUrl, 1000) ??
      trimTo(document.referrer, 1000),
    sessionId: trimTo(payload.sessionId, 96) ?? getAnalyticsSessionId(),
    pagePath: trimTo(payload.pagePath, 300) ?? trimTo(window.location.pathname, 300),
  };

  const body = JSON.stringify(event);

  try {
    let sent = false;

    if (typeof navigator.sendBeacon === "function") {
      sent = navigator.sendBeacon(
        ANALYTICS_ENDPOINT,
        new Blob([body], { type: "application/json" }),
      );
    }

    if (!sent) {
      void fetch(ANALYTICS_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body,
        keepalive: true,
        cache: "no-store",
      }).catch(() => {
        // Ignore client-side analytics network failures.
      });
    }
  } catch {
    // Ignore serialization/network errors.
  }

  trackPlausibleEvent(event);
}
