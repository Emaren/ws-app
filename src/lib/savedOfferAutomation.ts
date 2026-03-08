import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getWsApiBaseUrl } from "@/lib/wsApiBaseUrl";

const REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_SITE_ORIGIN = "https://wheatandstone.ca";

export const SAVED_PRODUCT_MATCH_SOURCE = "saved-product-match";
export const SAVED_PRODUCT_MATCH_EMAIL_SOURCE = "saved-product-match-email";

export type SavedProductMatchRunSource =
  | "SAVE_EVENT"
  | "OFFER_PUBLISHED"
  | "MANUAL"
  | "SCHEDULED";

type WsApiProcessSummary = {
  processed: number;
  sent: number;
  retried: number;
  failed: number;
};

type OfferCandidate = {
  id: string;
  businessId: string;
  title: string;
  badgeText: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  businessName: string;
  productId: string | null;
  productName: string | null;
  productSlug: string | null;
};

type SavedProductPreferenceRow = {
  userId: string;
  productId: string;
  createdAt: Date;
  user: {
    email: string;
    name: string;
    savedOfferEmailAlertsEnabled: boolean;
  };
};

type MatchNotificationDraft = {
  businessId: string;
  recipientEmail: string;
  subject: string;
  lines: string[];
  metadata: Record<string, unknown>;
};

export type SavedProductMatchResult = {
  ok: true;
  generatedAt: string;
  source: SavedProductMatchRunSource;
  scannedOfferCount: number;
  savedSignalCount: number;
  targetPairCount: number;
  created: number;
  reactivated: number;
  existingActive: number;
  existingCovered: number;
  skippedDisabledAlerts: number;
  notificationQueuedCount: number;
  notificationSkippedReason: string | null;
  processSummary: WsApiProcessSummary | null;
  matchedOfferIds: string[];
  matchedUserIds: string[];
};

function siteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_ORIGIN?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    DEFAULT_SITE_ORIGIN
  ).replace(/\/$/, "");
}

function isOfferLiveNow(offer: {
  startsAt: Date | null;
  endsAt: Date | null;
}): boolean {
  const nowMs = Date.now();
  const startMs = offer.startsAt?.getTime() ?? null;
  const endMs = offer.endsAt?.getTime() ?? null;

  if (startMs !== null && nowMs < startMs) {
    return false;
  }
  if (endMs !== null && nowMs > endMs) {
    return false;
  }

  return true;
}

async function wsApiJson<T>(input: {
  path: string;
  method: "POST";
  accessToken: string;
  body: unknown;
}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${getWsApiBaseUrl()}${input.path}`, {
      method: input.method,
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${input.accessToken}`,
      },
      body: JSON.stringify(input.body),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message =
        payload && typeof payload === "object" && "message" in payload
          ? String(payload.message)
          : `ws-api request failed (${response.status})`;
      throw new Error(message);
    }

    return payload as T;
  } finally {
    clearTimeout(timer);
  }
}

function metadataRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function isSavedProductMatchMetadata(value: unknown): boolean {
  return metadataRecord(value)?.source === SAVED_PRODUCT_MATCH_SOURCE;
}

export function readSavedProductMatchMetadata(value: unknown): {
  matchedProductId: string | null;
  matchedProductName: string | null;
  automationSource: SavedProductMatchRunSource | null;
} {
  const record = metadataRecord(value);
  const source = record?.source;
  if (source !== SAVED_PRODUCT_MATCH_SOURCE) {
    return {
      matchedProductId: null,
      matchedProductName: null,
      automationSource: null,
    };
  }

  const automationSource =
    record?.automationSource === "SAVE_EVENT" ||
    record?.automationSource === "OFFER_PUBLISHED" ||
    record?.automationSource === "MANUAL" ||
    record?.automationSource === "SCHEDULED"
      ? record.automationSource
      : null;

  return {
    matchedProductId:
      typeof record?.matchedProductId === "string" ? record.matchedProductId : null,
    matchedProductName:
      typeof record?.matchedProductName === "string" ? record.matchedProductName : null,
    automationSource,
  };
}

function offerProduct(input: {
  product: { id: string; name: string; slug: string } | null;
  inventoryItem: {
    product: { id: string; name: string; slug: string } | null;
  } | null;
}): { id: string; name: string; slug: string } | null {
  return input.product ?? input.inventoryItem?.product ?? null;
}

async function loadLiveOfferCandidates(input: {
  businessId?: string | null;
  offerId?: string | null;
  productId?: string | null;
  now: Date;
}): Promise<OfferCandidate[]> {
  const offers = await prisma.offer.findMany({
    where: {
      status: "LIVE",
      ...(input.offerId ? { id: input.offerId } : {}),
      ...(input.businessId ? { businessId: input.businessId } : {}),
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: input.now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: input.now } }] },
      ],
      ...(input.productId
        ? {
            OR: [
              { productId: input.productId },
              { inventoryItem: { is: { productId: input.productId } } },
            ],
          }
        : {
            OR: [
              { productId: { not: null } },
              { inventoryItem: { is: { productId: { not: null } } } },
            ],
          }),
    },
    select: {
      id: true,
      businessId: true,
      title: true,
      badgeText: true,
      startsAt: true,
      endsAt: true,
      business: {
        select: {
          name: true,
        },
      },
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      inventoryItem: {
        select: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
    },
    orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
  });

  return offers
    .filter((offer) => isOfferLiveNow(offer))
    .map((offer) => {
      const product = offerProduct(offer);
      return {
        id: offer.id,
        businessId: offer.businessId,
        title: offer.title,
        badgeText: offer.badgeText,
        startsAt: offer.startsAt,
        endsAt: offer.endsAt,
        businessName: offer.business.name,
        productId: product?.id ?? null,
        productName: product?.name ?? null,
        productSlug: product?.slug ?? null,
      };
    })
    .filter((offer): offer is OfferCandidate => Boolean(offer.productId && offer.productName));
}

function buildMatchMetadata(input: {
  now: Date;
  source: SavedProductMatchRunSource;
  productId: string;
  productName: string;
  productSlug: string | null;
  savedAt: Date;
  businessName: string;
}): Prisma.InputJsonValue {
  return {
    source: SAVED_PRODUCT_MATCH_SOURCE,
    automationSource: input.source,
    matchedAtIso: input.now.toISOString(),
    matchedProductId: input.productId,
    matchedProductName: input.productName,
    matchedProductSlug: input.productSlug,
    matchedProductSavedAtIso: input.savedAt.toISOString(),
    matchedBusinessName: input.businessName,
  };
}

function existingKey(offerId: string, userKey: string) {
  return `${offerId}:${userKey.toLowerCase()}`;
}

export async function runSavedProductMatchAutomation(input: {
  source: SavedProductMatchRunSource;
  actorUserId?: string | null;
  actorEmail?: string | null;
  businessId?: string | null;
  offerId?: string | null;
  productId?: string | null;
  userId?: string | null;
  wsApiAccessToken?: string | null;
  now?: Date;
}): Promise<SavedProductMatchResult> {
  const now = input.now ?? new Date();
  const offers = await loadLiveOfferCandidates({
    businessId: input.businessId ?? null,
    offerId: input.offerId ?? null,
    productId: input.productId ?? null,
    now,
  });

  if (offers.length === 0) {
    return {
      ok: true,
      generatedAt: now.toISOString(),
      source: input.source,
      scannedOfferCount: 0,
      savedSignalCount: 0,
      targetPairCount: 0,
      created: 0,
      reactivated: 0,
      existingActive: 0,
      existingCovered: 0,
      skippedDisabledAlerts: 0,
      notificationQueuedCount: 0,
      notificationSkippedReason: null,
      processSummary: null,
      matchedOfferIds: [],
      matchedUserIds: [],
    };
  }

  const productIds = Array.from(
    new Set(offers.map((offer) => offer.productId).filter((value): value is string => Boolean(value))),
  );

  const savedRows = await prisma.savedProduct.findMany({
    where: {
      productId: { in: productIds },
      ...(input.userId ? { userId: input.userId } : {}),
      user: {
        savedOfferAlertsEnabled: true,
      },
    },
    select: {
      userId: true,
      productId: true,
      createdAt: true,
      user: {
        select: {
          email: true,
          name: true,
          savedOfferEmailAlertsEnabled: true,
        },
      },
    },
  });

  if (savedRows.length === 0) {
    return {
      ok: true,
      generatedAt: now.toISOString(),
      source: input.source,
      scannedOfferCount: offers.length,
      savedSignalCount: 0,
      targetPairCount: 0,
      created: 0,
      reactivated: 0,
      existingActive: 0,
      existingCovered: 0,
      skippedDisabledAlerts: 0,
      notificationQueuedCount: 0,
      notificationSkippedReason: null,
      processSummary: null,
      matchedOfferIds: [],
      matchedUserIds: [],
    };
  }

  const savedByProductId = new Map<string, SavedProductPreferenceRow[]>();
  const userIds = new Set<string>();
  const userEmails = new Set<string>();

  for (const row of savedRows) {
    const existing = savedByProductId.get(row.productId) ?? [];
    existing.push(row);
    savedByProductId.set(row.productId, existing);
    userIds.add(row.userId);
    userEmails.add(row.user.email.toLowerCase());
  }

  const existingRows = await prisma.userOfferInbox.findMany({
    where: {
      offerId: { in: offers.map((offer) => offer.id) },
      OR: [
        { userExternalId: { in: [...userIds] } },
        { userEmail: { in: [...userEmails] } },
      ],
    },
    select: {
      id: true,
      offerId: true,
      userExternalId: true,
      userEmail: true,
      status: true,
      expiresAt: true,
      metadata: true,
    },
  });

  const existingByUserId = new Map<string, (typeof existingRows)[number]>();
  const existingByEmail = new Map<string, (typeof existingRows)[number]>();
  for (const row of existingRows) {
    existingByUserId.set(existingKey(row.offerId, row.userExternalId), row);
    existingByEmail.set(existingKey(row.offerId, row.userEmail), row);
  }

  const createOps: Prisma.PrismaPromise<unknown>[] = [];
  const notificationGroups = new Map<string, MatchNotificationDraft>();
  const matchedOfferIds = new Set<string>();
  const matchedUserIds = new Set<string>();

  let created = 0;
  let reactivated = 0;
  let existingActive = 0;
  let existingCovered = 0;
  let skippedDisabledAlerts = 0;
  let targetPairCount = 0;

  for (const offer of offers) {
    const interestedUsers = offer.productId ? savedByProductId.get(offer.productId) ?? [] : [];
    for (const saved of interestedUsers) {
      targetPairCount += 1;
      const matchedById = existingByUserId.get(existingKey(offer.id, saved.userId));
      const matchedByEmail = existingByEmail.get(existingKey(offer.id, saved.user.email));
      const existing = matchedById ?? matchedByEmail ?? null;
      const isManagedByAutomation = isSavedProductMatchMetadata(existing?.metadata);

      if (existing) {
        if (isManagedByAutomation) {
          const stillActive =
            (existing.status === "ACTIVE" || existing.status === "SEEN") &&
            (!existing.expiresAt || existing.expiresAt > now);

          if (stillActive) {
            existingActive += 1;
            continue;
          }

          reactivated += 1;
          matchedOfferIds.add(offer.id);
          matchedUserIds.add(saved.userId);
          createOps.push(
            prisma.userOfferInbox.update({
              where: { id: existing.id },
              data: {
                userExternalId: saved.userId,
                userEmail: saved.user.email,
                userName: saved.user.name,
                status: "ACTIVE",
                assignmentMode: "SEGMENT",
                assignedAt: now,
                expiresAt: offer.endsAt ?? null,
                assignedByExternal: input.actorUserId ?? null,
                assignedByEmail: input.actorEmail ?? `system:${input.source.toLowerCase()}`,
                metadata: buildMatchMetadata({
                  now,
                  source: input.source,
                  productId: offer.productId!,
                  productName: offer.productName!,
                  productSlug: offer.productSlug,
                  savedAt: saved.createdAt,
                  businessName: offer.businessName,
                }),
              },
            }),
          );
        } else {
          existingCovered += 1;
          continue;
        }
      } else {
        created += 1;
        matchedOfferIds.add(offer.id);
        matchedUserIds.add(saved.userId);
        createOps.push(
          prisma.userOfferInbox.create({
            data: {
              userExternalId: saved.userId,
              userEmail: saved.user.email,
              userName: saved.user.name,
              offerId: offer.id,
              businessId: offer.businessId,
              status: "ACTIVE",
              assignmentMode: "SEGMENT",
              assignedAt: now,
              expiresAt: offer.endsAt ?? null,
              assignedByExternal: input.actorUserId ?? null,
              assignedByEmail: input.actorEmail ?? `system:${input.source.toLowerCase()}`,
              metadata: buildMatchMetadata({
                now,
                source: input.source,
                productId: offer.productId!,
                productName: offer.productName!,
                productSlug: offer.productSlug,
                savedAt: saved.createdAt,
                businessName: offer.businessName,
              }),
            },
          }),
        );
      }

      if (!saved.user.savedOfferEmailAlertsEnabled) {
        skippedDisabledAlerts += 1;
        continue;
      }

      const groupKey = `${offer.businessId}:${saved.user.email.toLowerCase()}`;
      const existingNotification = notificationGroups.get(groupKey);
      const line = `${offer.productName}: ${offer.title}`;

      if (existingNotification) {
        existingNotification.lines.push(line);
        existingNotification.metadata.offerIds = Array.from(
          new Set([...(existingNotification.metadata.offerIds as string[]), offer.id]),
        );
        existingNotification.metadata.matchCount =
          Number(existingNotification.metadata.matchCount ?? 0) + 1;
      } else {
        notificationGroups.set(groupKey, {
          businessId: offer.businessId,
          recipientEmail: saved.user.email,
          subject: `New matches for your saved products at ${offer.businessName}`,
          lines: [line],
          metadata: {
            source: SAVED_PRODUCT_MATCH_EMAIL_SOURCE,
            automationSource: input.source,
            userExternalId: saved.userId,
            businessName: offer.businessName,
            offerIds: [offer.id],
            matchedProductId: offer.productId,
            matchedProductName: offer.productName,
            matchCount: 1,
          },
        });
      }
    }
  }

  if (createOps.length > 0) {
    await prisma.$transaction(createOps);
  }

  let notificationQueuedCount = 0;
  let notificationSkippedReason: string | null = null;
  let processSummary: WsApiProcessSummary | null = null;
  const wsApiAccessToken = input.wsApiAccessToken?.trim() || "";

  if (notificationGroups.size > 0) {
    if (!wsApiAccessToken) {
      notificationSkippedReason = "ws-api notification access token unavailable.";
    } else {
      const drafts = [...notificationGroups.values()];
      for (const draft of drafts) {
        try {
          await wsApiJson({
            path: "/notifications/jobs",
            method: "POST",
            accessToken: wsApiAccessToken,
            body: {
              businessId: draft.businessId,
              channel: "email",
              audience: draft.recipientEmail,
              subject: draft.subject,
              message:
                "New live offers matched products you saved on Wheat & Stone.\n\n" +
                draft.lines.map((line) => `- ${line}`).join("\n") +
                `\n\nOpen your offers box: ${siteOrigin()}/offers`,
              maxAttempts: 3,
              metadata: draft.metadata,
            },
          });
          notificationQueuedCount += 1;
        } catch (error) {
          notificationSkippedReason = error instanceof Error ? error.message : String(error);
        }
      }

      if (notificationQueuedCount > 0) {
        processSummary = await wsApiJson<WsApiProcessSummary>({
          path: "/notifications/jobs/process",
          method: "POST",
          accessToken: wsApiAccessToken,
          body: {
            limit: Math.max(25, notificationQueuedCount),
          },
        });
      }
    }
  }

  return {
    ok: true,
    generatedAt: now.toISOString(),
    source: input.source,
    scannedOfferCount: offers.length,
    savedSignalCount: savedRows.length,
    targetPairCount,
    created,
    reactivated,
    existingActive,
    existingCovered,
    skippedDisabledAlerts,
    notificationQueuedCount,
    notificationSkippedReason,
    processSummary,
    matchedOfferIds: [...matchedOfferIds],
    matchedUserIds: [...matchedUserIds],
  };
}

export async function archiveSavedProductMatchAssignmentsForProduct(input: {
  userId: string;
  productId: string;
}): Promise<number> {
  const result = await prisma.userOfferInbox.updateMany({
    where: {
      userExternalId: input.userId,
      status: {
        in: ["ACTIVE", "SEEN"],
      },
      metadata: {
        path: ["source"],
        equals: SAVED_PRODUCT_MATCH_SOURCE,
      },
      AND: [
        {
          metadata: {
            path: ["matchedProductId"],
            equals: input.productId,
          },
        },
      ],
    },
    data: {
      status: "ARCHIVED",
    },
  });

  return result.count;
}
