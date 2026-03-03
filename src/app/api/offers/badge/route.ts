import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getApiAuthContext } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext(req);
  if (!auth.token) {
    return NextResponse.json({ count: 0 });
  }

  const identityClauses: Array<Record<string, unknown>> = [];
  if (auth.userId) {
    identityClauses.push({ userExternalId: auth.userId });
  }
  if (auth.email) {
    identityClauses.push({ userEmail: { equals: auth.email, mode: "insensitive" } });
  }

  if (identityClauses.length === 0) {
    return NextResponse.json({ count: 0 });
  }

  const now = new Date();
  const count = await prisma.userOfferInbox.count({
    where: {
      AND: [
        { OR: identityClauses },
        { status: { in: ["ACTIVE", "SEEN"] } },
        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        {
          offer: {
            status: "LIVE",
            AND: [
              { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
              { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
            ],
          },
        },
      ],
    },
  });

  return NextResponse.json({ count, asOf: now.toISOString() });
}
