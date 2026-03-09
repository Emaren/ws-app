import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { requireOwnerAdmin } from "../../_shared";
import { normalizeExperiencePackStatus, updateExperiencePack } from "@/lib/experienceStudioServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const forbidden = await requireOwnerAdmin(req);
  if (forbidden) {
    return forbidden;
  }

  const { id } = await context.params;
  const body = (await req.json().catch(() => null)) as
    | {
        name?: unknown;
        description?: unknown;
        status?: unknown;
        isSelectable?: unknown;
        coverImageUrl?: unknown;
      }
    | null;

  try {
    const pack = await updateExperiencePack({
      packId: id,
      name: typeof body?.name === "string" ? body.name : null,
      description: typeof body?.description === "string" ? body.description : undefined,
      status: normalizeExperiencePackStatus(
        typeof body?.status === "string" ? body.status : null,
      ),
      isSelectable:
        typeof body?.isSelectable === "boolean" ? body.isSelectable : null,
      coverImageUrl:
        typeof body?.coverImageUrl === "string" ? body.coverImageUrl : undefined,
    });

    revalidatePath("/admin/experience");
    revalidatePath("/account");

    return NextResponse.json({ pack });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Could not update pack" },
      { status: 400 },
    );
  }
}
