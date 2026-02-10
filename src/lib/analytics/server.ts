import { createHash } from "node:crypto";
import type {
  AnalyticsEventType as PrismaAnalyticsEventType,
  NotificationChannel,
  Prisma,
} from "@prisma/client";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ANALYTICS_CHANNELS,
  ANALYTICS_EVENT_TYPES,
  type AnalyticsChannel,
  type AnalyticsEventPayload,
  type AnalyticsEventType,
} from "./types";

export type RecordAnalyticsEventInput = AnalyticsEventPayload & {
  eventType: AnalyticsEventType;
  articleId?: string | null;
  businessId?: string | null;
  userId?: string | null;
  request?: NextRequest | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

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

function normalizeId(value: unknown): string | null {
  return trimTo(value, 64);
}

function normalizeUrlLike(value: unknown): string | null {
  const text = trimTo(value, 1000);
  if (!text) return null;

  if (
    text.startsWith("/") ||
    /^[a-z][a-z0-9+.-]*:/i.test(text) ||
    /^https?:\/\//i.test(text)
  ) {
    return text;
  }

  return null;
}

function normalizeChannel(value: unknown): NotificationChannel | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  if (!(ANALYTICS_CHANNELS as readonly string[]).includes(normalized)) {
    return null;
  }
  return normalized as NotificationChannel;
}

function normalizeMetadata(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== "object") return undefined;
  return value as Prisma.InputJsonValue;
}

function readClientIp(req?: NextRequest | null): string | null {
  if (!req) return null;
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return null;
}

function hashIpAddress(ipAddress: string | null): string | null {
  if (!ipAddress) return null;

  const salt =
    process.env.ANALYTICS_HASH_SALT?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    "ws-analytics";

  return createHash("sha256")
    .update(`${salt}:${ipAddress}`)
    .digest("hex");
}

async function resolveArticleId(
  articleId: string | null,
  articleSlug: string | null,
): Promise<string | null> {
  if (articleId) return articleId;
  if (!articleSlug) return null;

  const article = await prisma.article.findUnique({
    where: { slug: articleSlug },
    select: { id: true },
  });

  return article?.id ?? null;
}

async function resolveBusinessId(
  businessId: string | null,
  businessSlug: string | null,
): Promise<string | null> {
  if (businessId) return businessId;
  if (!businessSlug) return null;

  const business = await prisma.business.findUnique({
    where: { slug: businessSlug },
    select: { id: true },
  });

  return business?.id ?? null;
}

export async function recordAnalyticsEvent(
  input: RecordAnalyticsEventInput,
): Promise<void> {
  if (!(ANALYTICS_EVENT_TYPES as readonly string[]).includes(input.eventType)) {
    return;
  }

  const normalizedArticleSlug = normalizeSlug(input.articleSlug);
  const normalizedBusinessSlug = normalizeSlug(input.businessSlug);

  const [resolvedArticleId, resolvedBusinessId] = await Promise.all([
    resolveArticleId(normalizeId(input.articleId), normalizedArticleSlug),
    resolveBusinessId(normalizeId(input.businessId), normalizedBusinessSlug),
  ]);

  const userAgent =
    trimTo(input.userAgent, 600) ??
    trimTo(input.request?.headers.get("user-agent"), 600);

  const ipHash = hashIpAddress(
    trimTo(input.ipAddress, 80) ?? readClientIp(input.request),
  );

  const data: Prisma.AnalyticsEventCreateInput = {
    eventType: input.eventType as PrismaAnalyticsEventType,
    article: resolvedArticleId
      ? {
          connect: {
            id: resolvedArticleId,
          },
        }
      : undefined,
    business: resolvedBusinessId
      ? {
          connect: {
            id: resolvedBusinessId,
          },
        }
      : undefined,
    campaign: normalizeId(input.campaignId)
      ? {
          connect: {
            id: normalizeId(input.campaignId) as string,
          },
        }
      : undefined,
    offer: normalizeId(input.offerId)
      ? {
          connect: {
            id: normalizeId(input.offerId) as string,
          },
        }
      : undefined,
    inventoryItem: normalizeId(input.inventoryItemId)
      ? {
          connect: {
            id: normalizeId(input.inventoryItemId) as string,
          },
        }
      : undefined,
    user:
      normalizeId(input.userId) !== null
        ? {
            connect: {
              id: normalizeId(input.userId) as string,
            },
          }
        : undefined,
    sessionId: trimTo(input.sessionId, 96),
    sourceContext: trimTo(input.sourceContext, 120),
    adSlot: trimTo(input.adSlot, 64),
    channel: normalizeChannel(input.channel as AnalyticsChannel | null),
    destinationUrl: normalizeUrlLike(input.destinationUrl),
    referrerUrl: normalizeUrlLike(input.referrerUrl),
    ipHash,
    userAgent,
    metadata: normalizeMetadata(input.metadata),
  };

  await prisma.analyticsEvent.create({ data });
}
