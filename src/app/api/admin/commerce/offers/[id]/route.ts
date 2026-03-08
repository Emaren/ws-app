import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
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
} from "../../_shared";

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireCommerceManagerAuth(req);
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id } = await params;
  const body = asRecord(await req.json().catch(() => null));
  if (!body) {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const existing = await prisma.offer.findFirst({
    where: {
      id,
      business: businessScopeWhere(auth),
    },
    select: {
      id: true,
      businessId: true,
    },
  });

  if (!existing) {
    return NextResponse.json(
      { message: "Offer not found in your commerce scope" },
      { status: 404 },
    );
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ message: "title is required" }, { status: 400 });
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
              businessId: existing.businessId,
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

    const updated = await prisma.offer.update({
      where: { id: existing.id },
      data: {
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

    return NextResponse.json({
      ok: true,
      offer: updated,
    });
  } catch (error) {
    return NextResponse.json(
      { message: errorMessage(error) },
      { status: 400 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireCommerceManagerAuth(req);
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id } = await params;
  const existing = await prisma.offer.findFirst({
    where: {
      id,
      business: businessScopeWhere(auth),
    },
    select: {
      id: true,
    },
  });

  if (!existing) {
    return NextResponse.json(
      { message: "Offer not found in your commerce scope" },
      { status: 404 },
    );
  }

  await prisma.offer.delete({
    where: {
      id: existing.id,
    },
  });

  return NextResponse.json({ ok: true });
}
