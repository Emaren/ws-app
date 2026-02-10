import type {
  DeliveryLeadSource,
  DeliveryLeadStatus,
  Prisma,
} from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { getApiAuthContext } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import { hasAnyRole, RBAC_ROLE_GROUPS } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_SHORT_TEXT = 160;
const MAX_NOTES = 1200;
const MARKETPLACE_BUSINESS_SLUG = "wheat-and-stone-marketplace";

const DELIVERY_LEAD_SOURCE_VALUES: readonly DeliveryLeadSource[] = [
  "ARTICLE_CTA",
  "LOCAL_AD",
  "INVENTORY_ALERT",
  "CAMPAIGN_CLICK",
  "AFFILIATE",
];
const DELIVERY_LEAD_STATUS_VALUES: readonly DeliveryLeadStatus[] = [
  "NEW",
  "CONTACTED",
  "RESERVED",
  "FULFILLED",
  "CANCELLED",
  "EXPIRED",
];

type NormalizedLeadRequest = {
  source: DeliveryLeadSource;
  articleSlug: string | null;
  businessSlug: string | null;
  businessName: string | null;
  offerId: string | null;
  offerTitle: string | null;
  inventoryItemId: string | null;
  inventoryItemName: string | null;
  requestedQty: number;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  deliveryAddress: string;
  notes: string | null;
};

type ResolvedLeadTarget = {
  businessId: string;
  businessName: string;
  offerId: string | null;
  offerTitle: string | null;
  inventoryItemId: string | null;
  inventoryItemName: string | null;
  unitPriceCents: number | null;
};

function asTrimmedString(value: unknown, maxLength = MAX_SHORT_TEXT): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function normalizeEmail(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return null;
  }
  return normalized;
}

function normalizePhone(value: string | null): string | null {
  if (!value) return null;
  const compact = value.replace(/[\s().-]/g, "");
  if (!/^\+?\d{7,16}$/.test(compact)) {
    return null;
  }
  return compact;
}

function normalizeSlug(value: string | null): string | null {
  if (!value) return null;
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeQty(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    const intValue = Math.trunc(value);
    return intValue >= 1 && intValue <= 99 ? intValue : 1;
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 99) {
      return parsed;
    }
  }

  return 1;
}

function normalizeLeadStatus(value: string | null): DeliveryLeadStatus | null {
  if (!value) return null;

  const upper = value.trim().toUpperCase();
  if ((DELIVERY_LEAD_STATUS_VALUES as readonly string[]).includes(upper)) {
    return upper as DeliveryLeadStatus;
  }

  return null;
}

function parseLimit(value: string | null): number {
  if (!value) return 120;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 120;
  return Math.min(parsed, 250);
}

async function requireStaffLeadAccess(req: NextRequest): Promise<NextResponse | null> {
  const auth = await getApiAuthContext(req);
  const isStaff = hasAnyRole(auth.role, RBAC_ROLE_GROUPS.staff);

  if (!auth.token || !isStaff) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  return null;
}

function normalizeSource(value: unknown): DeliveryLeadSource {
  if (typeof value === "string") {
    const upper = value.trim().toUpperCase();
    if (
      (DELIVERY_LEAD_SOURCE_VALUES as readonly string[]).includes(upper)
    ) {
      return upper as DeliveryLeadSource;
    }
  }

  return "ARTICLE_CTA";
}

function buildLeadNotes(
  request: NormalizedLeadRequest,
  resolved: ResolvedLeadTarget,
): string | null {
  const sections: string[] = [];

  if (request.notes) {
    sections.push(request.notes);
  }

  const contextLines: string[] = [];
  if (request.articleSlug) contextLines.push(`article:${request.articleSlug}`);
  if (resolved.offerTitle) contextLines.push(`offer:${resolved.offerTitle}`);
  if (resolved.inventoryItemName) {
    contextLines.push(`item:${resolved.inventoryItemName}`);
  }
  if (request.source) contextLines.push(`source:${request.source}`);

  if (contextLines.length > 0) {
    sections.push(`Context\n${contextLines.join("\n")}`);
  }

  if (sections.length === 0) return null;
  return sections.join("\n\n").slice(0, MAX_NOTES);
}

function parseRequest(body: unknown): NormalizedLeadRequest | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }

  const payload = body as Record<string, unknown>;

  const source = normalizeSource(payload.source);
  const articleSlug = normalizeSlug(asTrimmedString(payload.articleSlug, 120));
  const businessSlug = normalizeSlug(asTrimmedString(payload.businessSlug, 120));
  const businessName = asTrimmedString(payload.businessName, 120);
  const offerId = asTrimmedString(payload.offerId, 64);
  const offerTitle = asTrimmedString(payload.offerTitle, 120);
  const inventoryItemId = asTrimmedString(payload.inventoryItemId, 64);
  const inventoryItemName = asTrimmedString(payload.inventoryItemName, 120);
  const requestedQty = normalizeQty(payload.requestedQty);
  const contactName = asTrimmedString(payload.contactName, 120);
  const contactEmail = normalizeEmail(asTrimmedString(payload.contactEmail, 160));
  const contactPhone = normalizePhone(asTrimmedString(payload.contactPhone, 32));
  const deliveryAddress = asTrimmedString(payload.deliveryAddress, 500);
  const notes = asTrimmedString(payload.notes, MAX_NOTES);

  if (!contactEmail && !contactPhone) {
    return null;
  }

  if (!deliveryAddress) {
    return null;
  }

  return {
    source,
    articleSlug,
    businessSlug,
    businessName,
    offerId,
    offerTitle,
    inventoryItemId,
    inventoryItemName,
    requestedQty,
    contactName,
    contactEmail,
    contactPhone,
    deliveryAddress,
    notes,
  };
}

async function ensureMarketplaceBusiness() {
  return prisma.business.upsert({
    where: { slug: MARKETPLACE_BUSINESS_SLUG },
    update: {
      name: "Wheat & Stone Marketplace",
      status: "ACTIVE",
      isVerified: true,
    },
    create: {
      slug: MARKETPLACE_BUSINESS_SLUG,
      name: "Wheat & Stone Marketplace",
      status: "ACTIVE",
      isVerified: true,
    },
    select: {
      id: true,
      name: true,
    },
  });
}

async function resolveLeadTarget(
  request: NormalizedLeadRequest,
): Promise<ResolvedLeadTarget> {
  const now = new Date();

  const offerById = request.offerId
    ? await prisma.offer.findUnique({
        where: { id: request.offerId },
        select: {
          id: true,
          title: true,
          discountPriceCents: true,
          business: {
            select: {
              id: true,
              name: true,
            },
          },
          inventoryItem: {
            select: {
              id: true,
              name: true,
              priceCents: true,
            },
          },
        },
      })
    : null;

  const offerByArticleSlug = !offerById && request.articleSlug
    ? await prisma.offer.findFirst({
        where: {
          status: "LIVE",
          ctaUrl: {
            contains: `/articles/${request.articleSlug}`,
            mode: "insensitive",
          },
          AND: [
            {
              OR: [{ startsAt: null }, { startsAt: { lte: now } }],
            },
            {
              OR: [{ endsAt: null }, { endsAt: { gt: now } }],
            },
          ],
        },
        orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
        select: {
          id: true,
          title: true,
          discountPriceCents: true,
          business: {
            select: {
              id: true,
              name: true,
            },
          },
          inventoryItem: {
            select: {
              id: true,
              name: true,
              priceCents: true,
            },
          },
        },
      })
    : null;

  const selectedOffer = offerById ?? offerByArticleSlug;

  const inventoryById = request.inventoryItemId
    ? await prisma.inventoryItem.findUnique({
        where: { id: request.inventoryItemId },
        select: {
          id: true,
          name: true,
          priceCents: true,
          business: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })
    : null;

  const inventoryByName = !inventoryById && request.inventoryItemName
    ? await prisma.inventoryItem.findFirst({
        where: {
          isActive: true,
          name: {
            contains: request.inventoryItemName,
            mode: "insensitive",
          },
        },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          priceCents: true,
          business: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })
    : null;

  const selectedInventory = inventoryById ?? inventoryByName;

  const businessBySlug = request.businessSlug
    ? await prisma.business.findUnique({
        where: { slug: request.businessSlug },
        select: {
          id: true,
          name: true,
        },
      })
    : null;

  const businessByName = !businessBySlug && request.businessName
    ? await prisma.business.findFirst({
        where: {
          OR: [
            { name: { equals: request.businessName, mode: "insensitive" } },
            { legalName: { equals: request.businessName, mode: "insensitive" } },
            { name: { contains: request.businessName, mode: "insensitive" } },
          ],
        },
        orderBy: [{ isVerified: "desc" }, { updatedAt: "desc" }],
        select: {
          id: true,
          name: true,
        },
      })
    : null;

  const business =
    businessBySlug ??
    businessByName ??
    selectedOffer?.business ??
    selectedInventory?.business ??
    (await ensureMarketplaceBusiness());

  const resolvedInventory =
    selectedInventory ?? selectedOffer?.inventoryItem ?? null;

  const unitPriceCents =
    selectedOffer?.discountPriceCents ?? resolvedInventory?.priceCents ?? null;

  return {
    businessId: business.id,
    businessName: business.name,
    offerId: selectedOffer?.id ?? null,
    offerTitle: selectedOffer?.title ?? request.offerTitle,
    inventoryItemId: resolvedInventory?.id ?? null,
    inventoryItemName: resolvedInventory?.name ?? request.inventoryItemName,
    unitPriceCents,
  };
}

async function upsertRecipientId(
  businessId: string,
  request: NormalizedLeadRequest,
): Promise<string | null> {
  if (!request.contactEmail && !request.contactPhone) {
    return null;
  }

  const recipientConditions: Prisma.NotificationRecipientWhereInput[] = [];
  if (request.contactEmail) {
    recipientConditions.push({ email: request.contactEmail });
  }
  if (request.contactPhone) {
    recipientConditions.push({ phone: request.contactPhone });
  }

  const existing = await prisma.notificationRecipient.findFirst({
    where: {
      businessId,
      OR: recipientConditions,
    },
    select: { id: true },
  });

  if (existing) {
    const updated = await prisma.notificationRecipient.update({
      where: { id: existing.id },
      data: {
        name: request.contactName,
        email: request.contactEmail,
        phone: request.contactPhone,
        preferredChannel: request.contactPhone ? "SMS" : "EMAIL",
        emailOptIn: !!request.contactEmail,
        smsOptIn: !!request.contactPhone,
      },
      select: { id: true },
    });
    return updated.id;
  }

  const created = await prisma.notificationRecipient.create({
    data: {
      businessId,
      name: request.contactName,
      email: request.contactEmail,
      phone: request.contactPhone,
      preferredChannel: request.contactPhone ? "SMS" : "EMAIL",
      emailOptIn: !!request.contactEmail,
      smsOptIn: !!request.contactPhone,
    },
    select: { id: true },
  });

  return created.id;
}

export async function GET(req: NextRequest) {
  const forbiddenResponse = await requireStaffLeadAccess(req);
  if (forbiddenResponse) {
    return forbiddenResponse;
  }

  const businessId = asTrimmedString(req.nextUrl.searchParams.get("businessId"), 64);
  const statusRaw = req.nextUrl.searchParams.get("status");
  const status = normalizeLeadStatus(statusRaw);
  const query = asTrimmedString(req.nextUrl.searchParams.get("q"), 160);
  const limit = parseLimit(req.nextUrl.searchParams.get("limit"));

  if (statusRaw && !status) {
    return NextResponse.json({ message: "Invalid lead status" }, { status: 400 });
  }

  const where: Prisma.DeliveryLeadWhereInput = {};

  if (businessId) {
    where.businessId = businessId;
  }
  if (status) {
    where.status = status;
  }
  if (query) {
    where.OR = [
      { deliveryAddress: { contains: query, mode: "insensitive" } },
      { notes: { contains: query, mode: "insensitive" } },
      { recipient: { is: { name: { contains: query, mode: "insensitive" } } } },
      { recipient: { is: { email: { contains: query, mode: "insensitive" } } } },
      { recipient: { is: { phone: { contains: query, mode: "insensitive" } } } },
      { inventoryItem: { is: { name: { contains: query, mode: "insensitive" } } } },
      { offer: { is: { title: { contains: query, mode: "insensitive" } } } },
      { business: { is: { name: { contains: query, mode: "insensitive" } } } },
      { business: { is: { slug: { contains: query, mode: "insensitive" } } } },
    ];
  }

  const [leads, businesses] = await Promise.all([
    prisma.deliveryLead.findMany({
      where,
      orderBy: [{ requestedAt: "desc" }, { createdAt: "desc" }],
      take: limit,
      select: {
        id: true,
        businessId: true,
        status: true,
        source: true,
        requestedQty: true,
        unitPriceCents: true,
        totalCents: true,
        requestedAt: true,
        fulfillBy: true,
        contactedAt: true,
        fulfilledAt: true,
        cancelledAt: true,
        deliveryAddress: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        business: {
          select: {
            id: true,
            slug: true,
            name: true,
            status: true,
          },
        },
        recipient: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            preferredChannel: true,
          },
        },
        inventoryItem: {
          select: {
            id: true,
            name: true,
            priceCents: true,
          },
        },
        offer: {
          select: {
            id: true,
            title: true,
            discountPriceCents: true,
          },
        },
      },
    }),
    prisma.business.findMany({
      orderBy: [{ isVerified: "desc" }, { name: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
      },
    }),
  ]);

  return NextResponse.json({ leads, businesses });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = parseRequest(body);

  if (!parsed) {
    return NextResponse.json(
      {
        message:
          "Invalid payload. Contact (email or phone) and delivery address are required.",
      },
      { status: 400 },
    );
  }

  try {
    const auth = await getApiAuthContext(req);
    const resolvedTarget = await resolveLeadTarget(parsed);
    const recipientId = await upsertRecipientId(resolvedTarget.businessId, parsed);

    const notes = buildLeadNotes(parsed, resolvedTarget);
    const unitPriceCents = resolvedTarget.unitPriceCents;
    const totalCents =
      unitPriceCents === null ? null : unitPriceCents * parsed.requestedQty;

    const lead = await prisma.deliveryLead.create({
      data: {
        businessId: resolvedTarget.businessId,
        inventoryItemId: resolvedTarget.inventoryItemId,
        offerId: resolvedTarget.offerId,
        recipientId,
        userId: auth.userId ?? null,
        source: parsed.source,
        requestedQty: parsed.requestedQty,
        unitPriceCents,
        totalCents,
        deliveryAddress: parsed.deliveryAddress,
        notes,
      },
      select: {
        id: true,
        status: true,
        requestedAt: true,
      },
    });

    return NextResponse.json(
      {
        id: lead.id,
        status: lead.status,
        requestedAt: lead.requestedAt,
        businessName: resolvedTarget.businessName,
        offerTitle: resolvedTarget.offerTitle,
        inventoryItemName: resolvedTarget.inventoryItemName,
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        message: "Unable to create delivery lead",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
