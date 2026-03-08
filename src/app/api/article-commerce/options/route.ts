import { NextResponse, type NextRequest } from "next/server";
import { getApiAuthContext } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import { hasAnyRole, RBAC_ROLE_GROUPS } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext(req);
  const isEditorial = hasAnyRole(auth.role, RBAC_ROLE_GROUPS.editorial);
  if (!auth.token || !isEditorial) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const [businesses, offers, inventoryItems] = await Promise.all([
    prisma.business.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ isVerified: "desc" }, { name: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        isVerified: true,
        storeProfile: {
          select: {
            displayName: true,
            logoUrl: true,
            heroImageUrl: true,
            city: true,
            region: true,
            deliveryEnabled: true,
          },
        },
      },
    }),
    prisma.offer.findMany({
      orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        businessId: true,
        title: true,
        status: true,
        featured: true,
        discountPriceCents: true,
      },
    }),
    prisma.inventoryItem.findMany({
      where: { isActive: true },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        businessId: true,
        name: true,
        priceCents: true,
        imageUrl: true,
      },
    }),
  ]);

  return NextResponse.json({
    businesses,
    offers,
    inventoryItems,
  });
}
