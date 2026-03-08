import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiAuthContext } from "@/lib/apiAuth";
import {
  archiveSavedProductMatchAssignmentsForProduct,
  runSavedProductMatchAutomation,
} from "@/lib/savedOfferAutomation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SaveKind = "product" | "offer";

function isSaveKind(value: unknown): value is SaveKind {
  return value === "product" || value === "offer";
}

async function savedCount(kind: SaveKind, itemId: string): Promise<number> {
  if (kind === "product") {
    return prisma.savedProduct.count({
      where: {
        productId: itemId,
      },
    });
  }

  return prisma.savedOffer.count({
    where: {
      offerId: itemId,
    },
  });
}

async function ensureTargetExists(kind: SaveKind, itemId: string): Promise<boolean> {
  if (kind === "product") {
    const record = await prisma.product.findUnique({
      where: { id: itemId },
      select: { id: true },
    });
    return Boolean(record);
  }

  const record = await prisma.offer.findUnique({
    where: { id: itemId },
    select: { id: true },
  });
  return Boolean(record);
}

export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext(req);
  if (!auth.token || !auth.userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const [savedProducts, savedOffers] = await Promise.all([
    prisma.savedProduct.findMany({
      where: { userId: auth.userId },
      select: { productId: true },
    }),
    prisma.savedOffer.findMany({
      where: { userId: auth.userId },
      select: { offerId: true },
    }),
  ]);

  return NextResponse.json({
    products: savedProducts.map((row) => row.productId),
    offers: savedOffers.map((row) => row.offerId),
  });
}

export async function POST(req: NextRequest) {
  const auth = await getApiAuthContext(req);
  if (!auth.token || !auth.userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | {
        kind?: unknown;
        itemId?: unknown;
      }
    | null;

  const kind = body?.kind;
  const itemId = typeof body?.itemId === "string" ? body.itemId.trim() : "";

  if (!isSaveKind(kind) || !itemId) {
    return NextResponse.json({ message: "kind and itemId are required" }, { status: 400 });
  }

  if (!(await ensureTargetExists(kind, itemId))) {
    return NextResponse.json({ message: "Target not found" }, { status: 404 });
  }

  if (kind === "product") {
    await prisma.savedProduct.upsert({
      where: {
        userId_productId: {
          userId: auth.userId,
          productId: itemId,
        },
      },
      update: {},
      create: {
        userId: auth.userId,
        productId: itemId,
      },
    });

    const matchResult = await runSavedProductMatchAutomation({
      source: "SAVE_EVENT",
      actorUserId: auth.userId,
      actorEmail: auth.email ?? null,
      productId: itemId,
      userId: auth.userId,
      wsApiAccessToken:
        typeof auth.token.wsApiAccessToken === "string"
          ? auth.token.wsApiAccessToken.trim()
          : null,
      now: new Date(),
    });

    return NextResponse.json({
      saved: true,
      savedCount: await savedCount(kind, itemId),
      matchedOffersCreated: matchResult.created,
      matchedOffersReactivated: matchResult.reactivated,
    });
  } else {
    await prisma.savedOffer.upsert({
      where: {
        userId_offerId: {
          userId: auth.userId,
          offerId: itemId,
        },
      },
      update: {},
      create: {
        userId: auth.userId,
        offerId: itemId,
      },
    });
  }

  return NextResponse.json({
    saved: true,
    savedCount: await savedCount(kind, itemId),
  });
}

export async function DELETE(req: NextRequest) {
  const auth = await getApiAuthContext(req);
  if (!auth.token || !auth.userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | {
        kind?: unknown;
        itemId?: unknown;
      }
    | null;

  const kind = body?.kind;
  const itemId = typeof body?.itemId === "string" ? body.itemId.trim() : "";

  if (!isSaveKind(kind) || !itemId) {
    return NextResponse.json({ message: "kind and itemId are required" }, { status: 400 });
  }

  if (kind === "product") {
    await prisma.savedProduct.deleteMany({
      where: {
        userId: auth.userId,
        productId: itemId,
      },
    });
    await archiveSavedProductMatchAssignmentsForProduct({
      userId: auth.userId,
      productId: itemId,
    });
  } else {
    await prisma.savedOffer.deleteMany({
      where: {
        userId: auth.userId,
        offerId: itemId,
      },
    });
  }

  return NextResponse.json({
    saved: false,
    savedCount: await savedCount(kind, itemId),
  });
}
