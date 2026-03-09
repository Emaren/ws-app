import { NextResponse, type NextRequest } from "next/server";
import { requireOwnerAdmin } from "../_shared";
import { experienceRoutePathnameCatalog, listExperienceStudioPacks } from "@/lib/experienceStudioServer";
import { EXPERIENCE_PACK_STATUS_OPTIONS } from "@/lib/experienceStudio";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const forbidden = await requireOwnerAdmin(req);
  if (forbidden) {
    return forbidden;
  }

  const packs = await listExperienceStudioPacks();

  return NextResponse.json({
    packs,
    routeCatalog: experienceRoutePathnameCatalog(),
    statusCatalog: EXPERIENCE_PACK_STATUS_OPTIONS,
    generatedAt: new Date().toISOString(),
  });
}
