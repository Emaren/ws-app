import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  asRecord,
  businessScopeWhere,
  errorMessage,
  normalizeOptionalString,
  parseBoolean,
  parseOptionalInt,
  parseOptionalUrl,
  requireCommerceManagerAuth,
} from "../_shared";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!businessId) {
    return NextResponse.json(
      { message: "businessId is required" },
      { status: 400 },
    );
  }
  if (!name) {
    return NextResponse.json({ message: "name is required" }, { status: 400 });
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
    const priceCents = parseOptionalInt(body.priceCents, "priceCents");
    if (priceCents === null || priceCents < 0) {
      return NextResponse.json(
        { message: "priceCents is required and must be zero or greater" },
        { status: 400 },
      );
    }

    const compareAtCents = parseOptionalInt(body.compareAtCents, "compareAtCents");
    const quantityOnHand = parseOptionalInt(body.quantityOnHand, "quantityOnHand") ?? 0;
    const lowStockThreshold = parseOptionalInt(
      body.lowStockThreshold,
      "lowStockThreshold",
    );
    const productId =
      typeof body.productId === "string" && body.productId.trim()
        ? body.productId.trim()
        : null;

    if (compareAtCents !== null && compareAtCents < 0) {
      return NextResponse.json(
        { message: "compareAtCents must be zero or greater" },
        { status: 400 },
      );
    }
    if (quantityOnHand < 0) {
      return NextResponse.json(
        { message: "quantityOnHand must be zero or greater" },
        { status: 400 },
      );
    }
    if (lowStockThreshold !== null && lowStockThreshold < 0) {
      return NextResponse.json(
        { message: "lowStockThreshold must be zero or greater" },
        { status: 400 },
      );
    }

    const product = productId
      ? await prisma.product.findUnique({
          where: { id: productId },
          select: { id: true },
        })
      : null;

    if (productId && !product) {
      return NextResponse.json(
        { message: "Selected product does not exist" },
        { status: 404 },
      );
    }

    const created = await prisma.inventoryItem.create({
      data: {
        businessId: business.id,
        productId: product?.id ?? null,
        sku: normalizeOptionalString(body.sku),
        name,
        description: normalizeOptionalString(body.description),
        category: normalizeOptionalString(body.category),
        unitLabel: normalizeOptionalString(body.unitLabel),
        imageUrl: parseOptionalUrl(body.imageUrl, "imageUrl"),
        priceCents,
        compareAtCents,
        quantityOnHand,
        lowStockThreshold,
        isActive: parseBoolean(body.isActive),
      },
      select: {
        id: true,
        businessId: true,
        productId: true,
        sku: true,
        name: true,
        description: true,
        category: true,
        unitLabel: true,
        imageUrl: true,
        priceCents: true,
        compareAtCents: true,
        quantityOnHand: true,
        lowStockThreshold: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      inventoryItem: created,
    });
  } catch (error) {
    return NextResponse.json(
      { message: errorMessage(error) },
      { status: 400 },
    );
  }
}
