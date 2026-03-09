import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { requireOwnerAdmin } from "../_shared";
import { storeExperienceCoverFile } from "@/lib/experienceStudioServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const forbidden = await requireOwnerAdmin(req);
  if (forbidden) {
    return forbidden;
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ message: "Multipart form data is required" }, { status: 400 });
  }

  const packSlug = String(formData.get("packSlug") ?? "").trim();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "Cover image upload is required" }, { status: 400 });
  }

  try {
    const stored = await storeExperienceCoverFile({
      packSlugHint: packSlug,
      file,
    });

    revalidatePath("/admin/experience");

    return NextResponse.json(stored, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Could not upload cover image" },
      { status: 400 },
    );
  }
}
