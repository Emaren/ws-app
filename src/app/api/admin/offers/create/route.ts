import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOffersManagerWsToken } from "../_shared";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const VALID_OFFER_STATUSES = new Set([
  "DRAFT",
  "LIVE",
  "PAUSED",
  "EXPIRED",
  "ARCHIVED",
]);
type OfferStatusValue = "DRAFT" | "LIVE" | "PAUSED" | "EXPIRED" | "ARCHIVED";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function parseOptionalDate(value: unknown, fieldName: string): Date | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    throw new Error(`${fieldName} must be a valid date`);
  }

  return parsed;
}

function parseOptionalInt(value: unknown, fieldName: string): number | null {
  if (typeof value !== "number" && typeof value !== "string") {
    return null;
  }

  const parsed =
    typeof value === "number"
      ? Math.trunc(value)
      : Number.parseInt(value.trim(), 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} must be an integer`);
  }

  return parsed;
}

export async function POST(req: NextRequest) {
  const auth = await requireOffersManagerWsToken(req);
  if (auth instanceof NextResponse) {
    return auth;
  }

  const body = asRecord(await req.json().catch(() => null));
  if (!body) {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const businessId =
    typeof body.businessId === "string" ? body.businessId.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : null;
  const badgeText =
    typeof body.badgeText === "string" && body.badgeText.trim()
      ? body.badgeText.trim()
      : null;
  const ctaUrl =
    typeof body.ctaUrl === "string" && body.ctaUrl.trim()
      ? body.ctaUrl.trim()
      : null;
  const statusRaw =
    typeof body.status === "string" ? body.status.trim().toUpperCase() : "LIVE";
  const status: OfferStatusValue = VALID_OFFER_STATUSES.has(statusRaw)
    ? (statusRaw as OfferStatusValue)
    : "LIVE";
  const featured = Boolean(body.featured);

  if (!businessId) {
    return NextResponse.json(
      { message: "businessId is required" },
      { status: 400 },
    );
  }
  if (!title) {
    return NextResponse.json({ message: "title is required" }, { status: 400 });
  }

  if (auth.managedBusinessIds && !auth.managedBusinessIds.includes(businessId)) {
    return NextResponse.json(
      { message: "Forbidden: business is outside your scope" },
      { status: 403 },
    );
  }

  let startsAt: Date | null = null;
  let endsAt: Date | null = null;
  let discountPriceCents: number | null = null;
  let unitsTotal: number | null = null;

  try {
    startsAt = parseOptionalDate(body.startsAt, "startsAt");
    endsAt = parseOptionalDate(body.endsAt, "endsAt");
    discountPriceCents = parseOptionalInt(
      body.discountPriceCents,
      "discountPriceCents",
    );
    unitsTotal = parseOptionalInt(body.unitsTotal, "unitsTotal");
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Invalid payload" },
      { status: 400 },
    );
  }

  if (startsAt && endsAt && startsAt > endsAt) {
    return NextResponse.json(
      { message: "startsAt must be before endsAt" },
      { status: 400 },
    );
  }

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, name: true },
  });

  if (!business) {
    return NextResponse.json(
      {
        message:
          "Business not found in Offers Engine. Sync company dashboards first, then create offers.",
      },
      { status: 404 },
    );
  }

  const created = await prisma.offer.create({
    data: {
      businessId: business.id,
      title,
      description,
      status,
      badgeText,
      discountPriceCents,
      startsAt,
      endsAt,
      unitsTotal,
      unitsClaimed: 0,
      ctaUrl,
      featured,
    },
    select: {
      id: true,
      businessId: true,
      title: true,
      status: true,
      badgeText: true,
      discountPriceCents: true,
      startsAt: true,
      endsAt: true,
      featured: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    ok: true,
    offer: created,
  });
}
