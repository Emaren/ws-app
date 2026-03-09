import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ExperiencePackStatus, Prisma, type ExperiencePack, type ExperiencePackPage } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  EXPERIENCE_PACK_STATUS_OPTIONS,
  EXPERIENCE_ROUTE_OPTIONS,
  buildExperiencePreviewHref,
  getExperienceRouteOption,
  normalizeExperienceRouteKey,
  slugifyExperienceValue,
  type ExperiencePackCatalogItem,
  type ExperienceRouteKey,
} from "@/lib/experienceStudio";

const EXPERIENCE_UPLOAD_SUBDIR = ["uploads", "experience-studio"];
const EXPERIENCE_UPLOAD_MAX_BYTES = 12 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const STATUS_SET = new Set<ExperiencePackStatus>(
  EXPERIENCE_PACK_STATUS_OPTIONS.map((option) => option.value),
);

type ExperiencePackWithPages = Prisma.ExperiencePackGetPayload<{
  include: {
    pages: true;
    _count: {
      select: {
        activeUsers: true;
      };
    };
  };
}>;
type ExperiencePackPageWithPack = ExperiencePackPage & {
  experiencePack: ExperiencePack;
};

function uploadsRootDir(): string {
  return path.join(process.cwd(), "public", ...EXPERIENCE_UPLOAD_SUBDIR);
}

async function ensureUploadsRootDir(): Promise<void> {
  await mkdir(uploadsRootDir(), { recursive: true });
}

function uploadUrlForFilename(filename: string): string {
  return `/${[...EXPERIENCE_UPLOAD_SUBDIR, filename].join("/")}`;
}

function statusFilterForPreview() {
  return {
    in: [ExperiencePackStatus.PREVIEWABLE, ExperiencePackStatus.SELECTABLE],
  } satisfies Prisma.EnumExperiencePackStatusFilter<"ExperiencePack">;
}

function serializeExperiencePackRow(pack: ExperiencePackWithPages): ExperiencePackCatalogItem {
  return {
    id: pack.id,
    slug: pack.slug,
    name: pack.name,
    description: pack.description,
    coverImageUrl: pack.coverImageUrl,
    status: pack.status,
    isSelectable: pack.isSelectable,
    sortOrder: pack.sortOrder,
    createdAt: pack.createdAt.toISOString(),
    updatedAt: pack.updatedAt.toISOString(),
    previewablePageCount: pack.pages.filter((page) => page.isPublished).length,
    activeUserCount: pack._count.activeUsers,
    pages: pack.pages.map((page) => {
      const route = getExperienceRouteOption(page.routeKey as ExperienceRouteKey);
      return {
        id: page.id,
        routeKey: page.routeKey as ExperienceRouteKey,
        title: page.title,
        notes: page.notes,
        viewportLabel: page.viewportLabel,
        imageUrl: page.imageUrl,
        originalFilename: page.originalFilename,
        fileSizeBytes: page.fileSizeBytes,
        sortOrder: page.sortOrder,
        isPublished: page.isPublished,
        createdAt: page.createdAt.toISOString(),
        updatedAt: page.updatedAt.toISOString(),
        previewHref: buildExperiencePreviewHref(pack.slug, page.routeKey as ExperienceRouteKey),
        routeLabel: route?.label ?? page.routeKey,
        pathname: route?.pathname ?? "/",
      };
    }),
  };
}

async function loadExperiencePackRows(where?: Record<string, unknown>) {
  return prisma.experiencePack.findMany({
    where: where as Prisma.ExperiencePackWhereInput | undefined,
    include: {
      pages: {
        orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      },
      _count: {
        select: {
          activeUsers: true,
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
  });
}

export function normalizeExperiencePackStatus(
  input: string | null | undefined,
): ExperiencePackStatus | null {
  if (!input) {
    return null;
  }

  const normalized = input.trim().toUpperCase() as ExperiencePackStatus;
  return STATUS_SET.has(normalized) ? normalized : null;
}

export function normalizeExperienceViewportLabel(
  input: string | null | undefined,
): string | null {
  if (!input) {
    return null;
  }

  const trimmed = input.trim();
  return trimmed ? trimmed.slice(0, 40) : null;
}

export function normalizeExperienceNotes(input: string | null | undefined): string | null {
  if (!input) {
    return null;
  }

  const trimmed = input.trim();
  return trimmed ? trimmed.slice(0, 1200) : null;
}

export async function listExperienceStudioPacks(): Promise<ExperiencePackCatalogItem[]> {
  const packs = await loadExperiencePackRows();
  return packs.map(serializeExperiencePackRow);
}

export async function listSelectableExperiencePacks(): Promise<ExperiencePackCatalogItem[]> {
  const packs = await loadExperiencePackRows({
    status: statusFilterForPreview(),
    isSelectable: true,
  });
  return packs.map(serializeExperiencePackRow);
}

export async function getExperiencePackCatalogItem(
  experiencePackId: string,
): Promise<ExperiencePackCatalogItem | null> {
  const pack = await prisma.experiencePack.findUnique({
    where: { id: experiencePackId },
    include: {
      pages: {
        orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      },
      _count: {
        select: {
          activeUsers: true,
        },
      },
    },
  });

  return pack ? serializeExperiencePackRow(pack) : null;
}

export async function createExperiencePack(input: {
  name: string;
  slug?: string | null;
  description?: string | null;
  status: ExperiencePackStatus;
  isSelectable: boolean;
  coverImageUrl?: string | null;
}): Promise<ExperiencePackCatalogItem> {
  const baseSlug = slugifyExperienceValue(input.slug?.trim() || input.name);
  if (!baseSlug) {
    throw new Error("A pack slug is required");
  }

  const existing = await prisma.experiencePack.findUnique({
    where: { slug: baseSlug },
    select: { id: true },
  });
  if (existing) {
    throw new Error("That pack slug already exists");
  }

  const created = await prisma.experiencePack.create({
    data: {
      slug: baseSlug,
      name: input.name.trim().slice(0, 120),
      description: normalizeExperienceNotes(input.description),
      status: input.status,
      isSelectable: input.isSelectable,
      coverImageUrl: input.coverImageUrl?.trim() || null,
    },
    include: {
      pages: true,
      _count: {
        select: {
          activeUsers: true,
        },
      },
    },
  });

  return serializeExperiencePackRow(created);
}

export async function updateExperiencePack(input: {
  packId: string;
  name?: string | null;
  description?: string | null;
  status?: ExperiencePackStatus | null;
  isSelectable?: boolean | null;
  coverImageUrl?: string | null;
}): Promise<ExperiencePackCatalogItem> {
  const updated = await prisma.experiencePack.update({
    where: { id: input.packId },
    data: {
      ...(input.name ? { name: input.name.trim().slice(0, 120) } : {}),
      ...(input.description !== undefined
        ? { description: normalizeExperienceNotes(input.description) }
        : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(typeof input.isSelectable === "boolean"
        ? { isSelectable: input.isSelectable }
        : {}),
      ...(input.coverImageUrl !== undefined
        ? { coverImageUrl: input.coverImageUrl?.trim() || null }
        : {}),
    },
    include: {
      pages: {
        orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      },
      _count: {
        select: {
          activeUsers: true,
        },
      },
    },
  });

  return serializeExperiencePackRow(updated);
}

export async function storeExperienceMockupFile(input: {
  packSlug: string;
  routeKey: ExperienceRouteKey;
  file: File;
}): Promise<{
  imageUrl: string;
  originalFilename: string | null;
  fileSizeBytes: number;
}> {
  if (!SUPPORTED_IMAGE_TYPES.has(input.file.type)) {
    throw new Error("Upload must be PNG, JPG, or WEBP");
  }

  if (input.file.size <= 0 || input.file.size > EXPERIENCE_UPLOAD_MAX_BYTES) {
    throw new Error("Upload must be between 1 byte and 12 MB");
  }

  await ensureUploadsRootDir();

  const extension =
    input.file.type === "image/png"
      ? "png"
      : input.file.type === "image/webp"
        ? "webp"
        : "jpg";
  const safePackSlug = slugifyExperienceValue(input.packSlug) || "experience-pack";
  const filename = `${safePackSlug}-${input.routeKey}-${Date.now()}-${randomUUID().slice(0, 8)}.${extension}`;
  const filePath = path.join(uploadsRootDir(), filename);
  const bytes = Buffer.from(await input.file.arrayBuffer());

  await writeFile(filePath, bytes);

  return {
    imageUrl: uploadUrlForFilename(filename),
    originalFilename: input.file.name?.trim() || null,
    fileSizeBytes: bytes.byteLength,
  };
}

export async function upsertExperiencePackPage(input: {
  experiencePackId: string;
  routeKey: ExperienceRouteKey;
  title: string;
  notes?: string | null;
  viewportLabel?: string | null;
  imageUrl: string;
  originalFilename?: string | null;
  fileSizeBytes?: number | null;
  isPublished?: boolean;
}): Promise<ExperiencePackCatalogItem> {
  const existingCount = await prisma.experiencePackPage.count({
    where: {
      experiencePackId: input.experiencePackId,
    },
  });

  await prisma.experiencePackPage.upsert({
    where: {
      experiencePackId_routeKey: {
        experiencePackId: input.experiencePackId,
        routeKey: input.routeKey,
      },
    },
    update: {
      title: input.title.trim().slice(0, 160),
      notes: normalizeExperienceNotes(input.notes),
      viewportLabel: normalizeExperienceViewportLabel(input.viewportLabel),
      imageUrl: input.imageUrl,
      originalFilename: input.originalFilename?.trim() || null,
      fileSizeBytes: input.fileSizeBytes ?? null,
      isPublished: input.isPublished ?? true,
    },
    create: {
      experiencePackId: input.experiencePackId,
      routeKey: input.routeKey,
      title: input.title.trim().slice(0, 160),
      notes: normalizeExperienceNotes(input.notes),
      viewportLabel: normalizeExperienceViewportLabel(input.viewportLabel),
      imageUrl: input.imageUrl,
      originalFilename: input.originalFilename?.trim() || null,
      fileSizeBytes: input.fileSizeBytes ?? null,
      sortOrder: existingCount,
      isPublished: input.isPublished ?? true,
    },
  });

  const pack = await getExperiencePackCatalogItem(input.experiencePackId);
  if (!pack) {
    throw new Error("Experience pack could not be loaded");
  }
  return pack;
}

export async function findExperiencePreviewByPackAndRoute(input: {
  packSlug: string;
  routeKey: string;
}) {
  const routeKey = normalizeExperienceRouteKey(input.routeKey);
  if (!routeKey) {
    return null;
  }

  const page = await prisma.experiencePackPage.findFirst({
    where: {
      routeKey,
      isPublished: true,
      experiencePack: {
        slug: input.packSlug,
        status: statusFilterForPreview(),
      },
    },
    include: {
      experiencePack: true,
    },
  }) as ExperiencePackPageWithPack | null;

  if (!page) {
    return null;
  }

  const route = getExperienceRouteOption(routeKey);
  return {
    page,
    routeKey,
    route,
    previewHref: buildExperiencePreviewHref(page.experiencePack.slug, routeKey),
  };
}

export async function findSelectableExperiencePackById(packId: string | null | undefined) {
  if (!packId) {
    return null;
  }

  const pack = await prisma.experiencePack.findFirst({
    where: {
      id: packId,
      status: statusFilterForPreview(),
      isSelectable: true,
    },
    include: {
      pages: {
        where: {
          isPublished: true,
        },
        orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      },
      _count: {
        select: {
          activeUsers: true,
        },
      },
    },
  });

  return pack ? serializeExperiencePackRow(pack) : null;
}

export function experienceRoutePathnameCatalog() {
  return EXPERIENCE_ROUTE_OPTIONS.map((option) => ({
    ...option,
    previewHrefExample: buildExperiencePreviewHref("pack-slug", option.key),
  }));
}
