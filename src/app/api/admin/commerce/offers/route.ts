import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { runSavedProductMatchAutomation } from "@/lib/savedOfferAutomation";
import {
  asRecord,
  businessScopeWhere,
  errorMessage,
  normalizeOptionalString,
  parseBoolean,
  parseOptionalDate,
  parseOptionalInt,
  parseOptionalUrl,
  requireCommerceManagerAuth,
} from "../_shared";

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

export async function POST(req: NextRequest) {
  const auth = await requireCommerceManagerAuth(req);
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
  if (!businessId) {
    return NextResponse.json(
      { message: "businessId is required" },
      { status: 400 },
    );
  }
  if (!title) {
    return NextResponse.json({ message: "title is required" }, { status: 400 });
  }

  const business = await prisma.business.findFirst({
    where: {
      id: businessId,
      ...businessScopeWhere(auth),
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!business) {
    return NextResponse.json(
      { message: "Business not found in your commerce scope" },
      { status: 404 },
    );
  }

  try {
    const productId =
      typeof body.productId === "string" && body.productId.trim()
        ? body.productId.trim()
        : null;
    const inventoryItemId =
      typeof body.inventoryItemId === "string" && body.inventoryItemId.trim()
        ? body.inventoryItemId.trim()
        : null;
    const statusRaw =
      typeof body.status === "string" ? body.status.trim().toUpperCase() : "LIVE";
    const status: OfferStatusValue = VALID_OFFER_STATUSES.has(statusRaw)
      ? (statusRaw as OfferStatusValue)
      : "LIVE";
    const startsAt = parseOptionalDate(body.startsAt, "startsAt");
    const endsAt = parseOptionalDate(body.endsAt, "endsAt");
    const discountPriceCents = parseOptionalInt(
      body.discountPriceCents,
      "discountPriceCents",
    );
    const unitsTotal = parseOptionalInt(body.unitsTotal, "unitsTotal");

    if (startsAt && endsAt && startsAt > endsAt) {
      return NextResponse.json(
        { message: "startsAt must be before endsAt" },
        { status: 400 },
      );
    }
    if (discountPriceCents !== null && discountPriceCents < 0) {
      return NextResponse.json(
        { message: "discountPriceCents must be zero or greater" },
        { status: 400 },
      );
    }
    if (unitsTotal !== null && unitsTotal < 0) {
      return NextResponse.json(
        { message: "unitsTotal must be zero or greater" },
        { status: 400 },
      );
    }

    const [product, inventoryItem] = await Promise.all([
      productId
        ? prisma.product.findUnique({
            where: { id: productId },
            select: { id: true },
          })
        : Promise.resolve(null),
      inventoryItemId
        ? prisma.inventoryItem.findFirst({
            where: {
              id: inventoryItemId,
              businessId: business.id,
            },
            select: {
              id: true,
              productId: true,
            },
          })
        : Promise.resolve(null),
    ]);

    if (productId && !product) {
      return NextResponse.json(
        { message: "Selected product does not exist" },
        { status: 404 },
      );
    }
    if (inventoryItemId && !inventoryItem) {
      return NextResponse.json(
        { message: "Selected inventory item does not exist" },
        { status: 404 },
      );
    }
    if (productId && inventoryItem?.productId && inventoryItem.productId !== productId) {
      return NextResponse.json(
        { message: "Selected inventory item is linked to a different product" },
        { status: 400 },
      );
    }

    const created = await prisma.offer.create({
      data: {
        businessId: business.id,
        inventoryItemId: inventoryItem?.id ?? null,
        productId: product?.id ?? inventoryItem?.productId ?? null,
        title,
        description: normalizeOptionalString(body.description),
        status,
        badgeText: normalizeOptionalString(body.badgeText),
        discountPriceCents,
        startsAt,
        endsAt,
        unitsTotal,
        ctaUrl: parseOptionalUrl(body.ctaUrl, "ctaUrl"),
        featured: parseBoolean(body.featured),
      },
      select: {
        id: true,
        businessId: true,
        inventoryItemId: true,
        productId: true,
        title: true,
        description: true,
        status: true,
        badgeText: true,
        discountPriceCents: true,
        startsAt: true,
        endsAt: true,
        unitsTotal: true,
        ctaUrl: true,
        featured: true,
        updatedAt: true,
      },
    });

    const savedMatch =
      created.status === "LIVE" && created.productId
        ? await runSavedProductMatchAutomation({
            source: "OFFER_PUBLISHED",
            actorUserId: auth.actorUserId,
            actorEmail: null,
            offerId: created.id,
            now: new Date(),
          })
        : null;

    return NextResponse.json({
      ok: true,
      offer: created,
      savedMatch,
    });
  } catch (error) {
    return NextResponse.json(
      { message: errorMessage(error) },
      { status: 400 },
    );
  }
}
