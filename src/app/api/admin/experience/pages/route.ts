import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { requireOwnerAdmin } from "../_shared";
import { prisma } from "@/lib/prisma";
import { normalizeExperienceRouteKey } from "@/lib/experienceStudio";
import {
  getExperiencePackCatalogItem,
  normalizeExperienceNotes,
  normalizeExperienceViewportLabel,
  storeExperienceMockupFile,
  upsertExperiencePackPage,
} from "@/lib/experienceStudioServer";

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

  const experiencePackId = String(formData.get("experiencePackId") ?? "").trim();
  const routeKey = normalizeExperienceRouteKey(
    String(formData.get("routeKey") ?? "").trim(),
  );
  const title = String(formData.get("title") ?? "").trim();
  const notes = normalizeExperienceNotes(String(formData.get("notes") ?? ""));
  const viewportLabel = normalizeExperienceViewportLabel(
    String(formData.get("viewportLabel") ?? ""),
  );
  const file = formData.get("file");

  if (!experiencePackId) {
    return NextResponse.json({ message: "Select an experience pack first" }, { status: 400 });
  }

  if (!routeKey) {
    return NextResponse.json({ message: "Choose a valid route target" }, { status: 400 });
  }

  if (!title) {
    return NextResponse.json({ message: "Mockup title is required" }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "Mockup PNG upload is required" }, { status: 400 });
  }

  const pack = await prisma.experiencePack.findUnique({
    where: {
      id: experiencePackId,
    },
    select: {
      id: true,
      slug: true,
      coverImageUrl: true,
    },
  });

  if (!pack) {
    return NextResponse.json({ message: "Experience pack not found" }, { status: 404 });
  }

  try {
    const stored = await storeExperienceMockupFile({
      packSlug: pack.slug,
      routeKey,
      file,
    });

    let updatedPack = await upsertExperiencePackPage({
      experiencePackId: pack.id,
      routeKey,
      title,
      notes,
      viewportLabel,
      imageUrl: stored.imageUrl,
      originalFilename: stored.originalFilename,
      fileSizeBytes: stored.fileSizeBytes,
      isPublished: true,
    });

    if (!pack.coverImageUrl) {
      await prisma.experiencePack.update({
        where: { id: pack.id },
        data: {
          coverImageUrl: stored.imageUrl,
        },
      });

      const refreshedPack = await getExperiencePackCatalogItem(pack.id);
      if (refreshedPack) {
        updatedPack = refreshedPack;
      }
    }

    const uploadedPage = updatedPack.pages.find((page) => page.routeKey === routeKey);

    revalidatePath("/admin/experience");
    revalidatePath(`/preview/${pack.slug}/${routeKey}`);
    revalidatePath("/account");

    return NextResponse.json({ pack: updatedPack, page: uploadedPage ?? null }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Could not upload mockup" },
      { status: 400 },
    );
  }
}
