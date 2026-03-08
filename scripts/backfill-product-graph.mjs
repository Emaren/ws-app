import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: ["warn", "error"],
});

function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/['"’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}

function toOptionalText(value, maxLength) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

async function syncReviewProfile(reviewProfile, article) {
  const brandName = toOptionalText(reviewProfile.brandName, 120);
  const brandSlug = brandName ? slugify(brandName) : null;

  const brand = brandSlug
    ? await prisma.brand.upsert({
        where: { slug: brandSlug },
        update: { name: brandName },
        create: {
          slug: brandSlug,
          name: brandName,
        },
        select: { id: true },
      })
    : null;

  const productSlug = slugify(reviewProfile.productName) || "product";
  const product = await prisma.product.upsert({
    where: { slug: productSlug },
    update: {
      name: reviewProfile.productName,
      brandId: brand?.id ?? null,
      category: toOptionalText(reviewProfile.category, 120),
      organicStatus: toOptionalText(reviewProfile.organicStatus, 160),
      summary:
        toOptionalText(reviewProfile.verdict, 220) ||
        toOptionalText(article.excerpt, 220),
      heroImageUrl: toOptionalText(article.coverUrl, 500),
    },
    create: {
      slug: productSlug,
      name: reviewProfile.productName,
      brandId: brand?.id ?? null,
      category: toOptionalText(reviewProfile.category, 120),
      organicStatus: toOptionalText(reviewProfile.organicStatus, 160),
      summary:
        toOptionalText(reviewProfile.verdict, 220) ||
        toOptionalText(article.excerpt, 220),
      heroImageUrl: toOptionalText(article.coverUrl, 500),
    },
    select: { id: true, slug: true, name: true },
  });

  await prisma.reviewProfile.update({
    where: { id: reviewProfile.id },
    data: {
      productId: product.id,
    },
  });

  return product;
}

async function main() {
  const articles = await prisma.article.findMany({
    where: {
      reviewProfile: {
        isNot: null,
      },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      coverUrl: true,
      reviewProfile: {
        select: {
          id: true,
          productName: true,
          brandName: true,
          category: true,
          organicStatus: true,
          verdict: true,
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }],
  });

  let syncedCount = 0;

  for (const article of articles) {
    if (!article.reviewProfile?.productName?.trim()) {
      continue;
    }

    const product = await syncReviewProfile(article.reviewProfile, article);
    syncedCount += 1;
    console.log(
      `[product-graph] synced ${article.slug} -> ${product.slug} (${product.name})`,
    );
  }

  console.log(`[product-graph] complete: ${syncedCount} review profiles synced`);
}

main()
  .catch((error) => {
    console.error("[product-graph] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
