"use client";

import { getAnalyticsSessionId } from "@/lib/analytics/client";

type ClientFunnelStage = "REGISTER_VIEW_STARTED" | "REGISTER_SUBMIT_ATTEMPTED";

const FUNNEL_ENDPOINT = "/api/auth/funnel";

type TrackAuthFunnelClientInput = {
  stage: ClientFunnelStage;
  provider?: string | null;
  email?: string | null;
  sourceContext?: string | null;
  metadata?: Record<string, unknown> | null;
};

function trimTo(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

export function trackAuthFunnelEvent(input: TrackAuthFunnelClientInput): void {
  if (typeof window === "undefined") return;

  const body = JSON.stringify({
    stage: input.stage,
    provider: trimTo(input.provider, 40),
    email: trimTo(input.email, 320),
    sourceContext: trimTo(input.sourceContext, 120),
    sessionId: getAnalyticsSessionId(),
    metadata: input.metadata ?? null,
  });

  try {
    let sent = false;
    if (typeof navigator.sendBeacon === "function") {
      sent = navigator.sendBeacon(
        FUNNEL_ENDPOINT,
        new Blob([body], { type: "application/json" }),
      );
    }

    if (!sent) {
      void fetch(FUNNEL_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body,
        keepalive: true,
        cache: "no-store",
      }).catch(() => {
        // Non-blocking telemetry.
      });
    }
  } catch {
    // Non-blocking telemetry.
  }
}
