import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { runSavedProductMatchAutomation } from "@/lib/savedOfferAutomation";
import { requireOffersManagerWsToken } from "../_shared";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  const auth = await requireOffersManagerWsToken(req);
  if (auth instanceof NextResponse) {
    return auth;
  }

  const body = asRecord(await req.json().catch(() => ({}))) ?? {};
  const businessId =
    typeof body.businessId === "string" && body.businessId.trim()
      ? body.businessId.trim()
      : null;
  const offerId =
    typeof body.offerId === "string" && body.offerId.trim()
      ? body.offerId.trim()
      : null;

  if (businessId && auth.managedBusinessIds && !auth.managedBusinessIds.includes(businessId)) {
    return NextResponse.json(
      { message: "Forbidden: business is outside your scope" },
      { status: 403 },
    );
  }

  if (offerId) {
    const offer = await prisma.offer.findUnique({
      where: {
        id: offerId,
      },
      select: {
        id: true,
        businessId: true,
      },
    });

    if (!offer) {
      return NextResponse.json({ message: "Offer not found" }, { status: 404 });
    }

    if (auth.managedBusinessIds && !auth.managedBusinessIds.includes(offer.businessId)) {
      return NextResponse.json(
        { message: "Forbidden: offer is outside your scope" },
        { status: 403 },
      );
    }
  }

  const result = await runSavedProductMatchAutomation({
    source: "MANUAL",
    actorUserId: auth.actorExternalId,
    actorEmail: auth.actorEmail,
    businessId,
    offerId,
    wsApiAccessToken: auth.accessToken,
    now: new Date(),
  });

  return NextResponse.json(result);
}
