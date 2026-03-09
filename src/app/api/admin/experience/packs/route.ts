import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { requireOwnerAdmin } from "../_shared";
import { createExperiencePack, normalizeExperiencePackStatus } from "@/lib/experienceStudioServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const forbidden = await requireOwnerAdmin(req);
  if (forbidden) {
    return forbidden;
  }

  const body = (await req.json().catch(() => null)) as
    | {
        name?: unknown;
        slug?: unknown;
        description?: unknown;
        status?: unknown;
        isSelectable?: unknown;
        coverImageUrl?: unknown;
      }
    | null;

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
  const description = typeof body?.description === "string" ? body.description : null;
  const status =
    normalizeExperiencePackStatus(typeof body?.status === "string" ? body.status : null) ??
    "DRAFT";
  const isSelectable = body?.isSelectable === true;
  const coverImageUrl =
    typeof body?.coverImageUrl === "string" ? body.coverImageUrl.trim() : null;

  if (!name) {
    return NextResponse.json({ message: "Pack name is required" }, { status: 400 });
  }

  try {
    const pack = await createExperiencePack({
      name,
      slug,
      description,
      status,
      isSelectable,
      coverImageUrl,
    });

    revalidatePath("/admin/experience");
    revalidatePath("/account");

    return NextResponse.json({ pack }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Could not create pack" },
      { status: 400 },
    );
  }
}
