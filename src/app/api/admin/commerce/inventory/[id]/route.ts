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
} from "../../_shared";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

  const existing = await prisma.inventoryItem.findFirst({
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
      { message: "Inventory item not found in your commerce scope" },
      { status: 404 },
    );
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ message: "name is required" }, { status: 400 });
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

    const updated = await prisma.inventoryItem.update({
      where: { id: existing.id },
      data: {
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
      inventoryItem: updated,
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
  const existing = await prisma.inventoryItem.findFirst({
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
      { message: "Inventory item not found in your commerce scope" },
      { status: 404 },
    );
  }

  await prisma.inventoryItem.delete({
    where: {
      id: existing.id,
    },
  });

  return NextResponse.json({ ok: true });
}
