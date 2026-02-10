import { NextResponse } from "next/server";
import { recordAnalyticsEvent } from "@/lib/analytics/server";
import {
  ANALYTICS_CHANNELS,
  ANALYTICS_EVENT_TYPES,
  type AnalyticsEventPayload,
  type AnalyticsEventType,
} from "@/lib/analytics/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return NextResponse.json({ message: "Method Not Allowed" }, { status: 405 });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function trimTo(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function normalizeSlug(value: unknown): string | null {
  const text = trimTo(value, 120);
  if (!text) return null;
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function parsePayload(body: unknown): AnalyticsEventPayload | null {
  const input = asRecord(body);
  if (!input) return null;

  const rawEventType = trimTo(input.eventType, 64)?.toUpperCase();
  if (!rawEventType) return null;
  if (!(ANALYTICS_EVENT_TYPES as readonly string[]).includes(rawEventType)) {
    return null;
  }

  const channelRaw = trimTo(input.channel, 16)?.toUpperCase() ?? null;
  const channel: AnalyticsEventPayload["channel"] =
    channelRaw && (ANALYTICS_CHANNELS as readonly string[]).includes(channelRaw)
      ? (channelRaw as AnalyticsEventPayload["channel"])
      : null;

  const metadata =
    input.metadata && typeof input.metadata === "object"
      ? (input.metadata as AnalyticsEventPayload["metadata"])
      : null;

  return {
    eventType: rawEventType as AnalyticsEventType,
    articleSlug: normalizeSlug(input.articleSlug),
    businessSlug: normalizeSlug(input.businessSlug),
    campaignId: trimTo(input.campaignId, 64),
    offerId: trimTo(input.offerId, 64),
    inventoryItemId: trimTo(input.inventoryItemId, 64),
    sourceContext: trimTo(input.sourceContext, 120),
    adSlot: trimTo(input.adSlot, 64),
    channel,
    destinationUrl: trimTo(input.destinationUrl, 1000),
    referrerUrl: trimTo(input.referrerUrl, 1000),
    sessionId: trimTo(input.sessionId, 96),
    pagePath: trimTo(input.pagePath, 300),
    metadata,
  };
}

export async function POST(req: Request) {
  const payload = parsePayload(await req.json().catch(() => null));

  if (!payload) {
    return NextResponse.json({ message: "Invalid analytics payload" }, { status: 400 });
  }

  try {
    await recordAnalyticsEvent({
      ...payload,
      userId: null,
      request: null,
      userAgent: trimTo(req.headers.get("user-agent"), 600),
      sourceContext: payload.sourceContext ?? payload.pagePath ?? null,
    });
  } catch {
    // Analytics is non-blocking for user flows.
  }

  return NextResponse.json({ ok: true }, { status: 202 });
}
