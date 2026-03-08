import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiAuthContext } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function parseBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }

  return null;
}

export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext(req);
  if (!auth.token || !auth.userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: {
      id: auth.userId,
    },
    select: {
      savedOfferAlertsEnabled: true,
      savedOfferEmailAlertsEnabled: true,
    },
  });

  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const auth = await getApiAuthContext(req);
  if (!auth.token || !auth.userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | {
        savedOfferAlertsEnabled?: unknown;
        savedOfferEmailAlertsEnabled?: unknown;
      }
    | null;

  const savedOfferAlertsEnabled = parseBoolean(body?.savedOfferAlertsEnabled);
  const savedOfferEmailAlertsEnabled = parseBoolean(body?.savedOfferEmailAlertsEnabled);

  if (savedOfferAlertsEnabled === null && savedOfferEmailAlertsEnabled === null) {
    return NextResponse.json(
      { message: "At least one alert preference is required" },
      { status: 400 },
    );
  }

  const updated = await prisma.user.update({
    where: {
      id: auth.userId,
    },
    data: {
      ...(savedOfferAlertsEnabled === null ? {} : { savedOfferAlertsEnabled }),
      ...(savedOfferEmailAlertsEnabled === null ? {} : { savedOfferEmailAlertsEnabled }),
    },
    select: {
      savedOfferAlertsEnabled: true,
      savedOfferEmailAlertsEnabled: true,
    },
  });

  return NextResponse.json({
    ok: true,
    preferences: updated,
  });
}
