import type { PrismaClient, Prisma } from "@prisma/client";
import type { NormalizedReviewProfileInput } from "@/lib/reviewProfile";

type ProductGraphPrisma = PrismaClient | Prisma.TransactionClient;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}

function toOptionalText(value: string | null | undefined, maxLength: number): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

export type ProductGraphSyncInput = {
  reviewProfile: NormalizedReviewProfileInput;
  articleExcerpt?: string | null;
  articleCoverUrl?: string | null;
};

export async function syncProductGraphFromReviewProfile(
  prisma: ProductGraphPrisma,
  input: ProductGraphSyncInput,
) {
  const brandName = toOptionalText(input.reviewProfile.brandName, 120);
  const brandSlug = brandName ? slugify(brandName) : null;

  const brand = brandSlug
    ? await prisma.brand.upsert({
        where: { slug: brandSlug },
        update: {
          name: brandName!,
        },
        create: {
          slug: brandSlug,
          name: brandName!,
        },
        select: {
          id: true,
          slug: true,
          name: true,
        },
      })
    : null;

  const productName = input.reviewProfile.productName.trim();
  const productSlug = slugify(productName) || "product";
  const category = toOptionalText(input.reviewProfile.category, 120);
  const organicStatus = toOptionalText(input.reviewProfile.organicStatus, 160);
  const summary =
    toOptionalText(input.reviewProfile.verdict, 220) ||
    toOptionalText(input.articleExcerpt, 220);
  const heroImageUrl = toOptionalText(input.articleCoverUrl, 500);

  return prisma.product.upsert({
    where: { slug: productSlug },
    update: {
      name: productName,
      brandId: brand?.id ?? null,
      category,
      organicStatus,
      summary,
      heroImageUrl,
    },
    create: {
      slug: productSlug,
      name: productName,
      brandId: brand?.id ?? null,
      category,
      organicStatus,
      summary,
      heroImageUrl,
    },
    select: {
      id: true,
      slug: true,
      name: true,
      brand: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
      },
    },
  });
}
