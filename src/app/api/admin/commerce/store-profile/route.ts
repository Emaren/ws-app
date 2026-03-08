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
  if (!businessId) {
    return NextResponse.json(
      { message: "businessId is required" },
      { status: 400 },
    );
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
    const deliveryRadiusKm = parseOptionalInt(body.deliveryRadiusKm, "deliveryRadiusKm");
    if (deliveryRadiusKm !== null && deliveryRadiusKm < 0) {
      return NextResponse.json(
        { message: "deliveryRadiusKm must be zero or greater" },
        { status: 400 },
      );
    }

    const profile = await prisma.storeProfile.upsert({
      where: {
        businessId: business.id,
      },
      create: {
        businessId: business.id,
        displayName: normalizeOptionalString(body.displayName),
        description: normalizeOptionalString(body.description),
        logoUrl: parseOptionalUrl(body.logoUrl, "logoUrl"),
        heroImageUrl: parseOptionalUrl(body.heroImageUrl, "heroImageUrl"),
        websiteUrl: parseOptionalUrl(body.websiteUrl, "websiteUrl"),
        city: normalizeOptionalString(body.city),
        region: normalizeOptionalString(body.region),
        country: normalizeOptionalString(body.country),
        deliveryRadiusKm,
        deliveryEnabled: parseBoolean(body.deliveryEnabled),
        pickupEnabled: parseBoolean(body.pickupEnabled),
        notificationEmail: normalizeOptionalString(body.notificationEmail),
      },
      update: {
        displayName: normalizeOptionalString(body.displayName),
        description: normalizeOptionalString(body.description),
        logoUrl: parseOptionalUrl(body.logoUrl, "logoUrl"),
        heroImageUrl: parseOptionalUrl(body.heroImageUrl, "heroImageUrl"),
        websiteUrl: parseOptionalUrl(body.websiteUrl, "websiteUrl"),
        city: normalizeOptionalString(body.city),
        region: normalizeOptionalString(body.region),
        country: normalizeOptionalString(body.country),
        deliveryRadiusKm,
        deliveryEnabled: parseBoolean(body.deliveryEnabled),
        pickupEnabled: parseBoolean(body.pickupEnabled),
        notificationEmail: normalizeOptionalString(body.notificationEmail),
      },
      select: {
        id: true,
        businessId: true,
        displayName: true,
        description: true,
        logoUrl: true,
        heroImageUrl: true,
        websiteUrl: true,
        city: true,
        region: true,
        country: true,
        deliveryRadiusKm: true,
        deliveryEnabled: true,
        pickupEnabled: true,
        notificationEmail: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      profile,
    });
  } catch (error) {
    return NextResponse.json(
      { message: errorMessage(error) },
      { status: 400 },
    );
  }
}
