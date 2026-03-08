import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: ["warn", "error"],
});

const DEFAULT_PRODUCT_SLUG = "avalon-organic-chocolate-milk";
const DEFAULT_MARKETPLACE_SLUG = "wheat-and-stone-marketplace";

async function main() {
  const productSlug = (process.argv[2] || DEFAULT_PRODUCT_SLUG).trim();
  const businessSlug = (process.argv[3] || DEFAULT_MARKETPLACE_SLUG).trim();

  const product = await prisma.product.findUnique({
    where: { slug: productSlug },
    select: {
      id: true,
      slug: true,
      name: true,
      category: true,
      summary: true,
      heroImageUrl: true,
    },
  });

  if (!product) {
    throw new Error(`Product not found: ${productSlug}`);
  }

  const business = await prisma.business.upsert({
    where: { slug: businessSlug },
    update: {
      name: "Wheat & Stone Marketplace",
      status: "ACTIVE",
      isVerified: true,
    },
    create: {
      slug: businessSlug,
      name: "Wheat & Stone Marketplace",
      status: "ACTIVE",
      isVerified: true,
    },
    select: {
      id: true,
      slug: true,
      name: true,
    },
  });

  await prisma.storeProfile.upsert({
    where: { businessId: business.id },
    update: {
      displayName: "Wheat & Stone Marketplace",
      description:
        "Local-first delivery pilot curated by Wheat & Stone for premium organic products.",
      city: "Edmonton",
      region: "Alberta",
      country: "Canada",
      pickupEnabled: true,
      deliveryEnabled: true,
      deliveryRadiusKm: 25,
      notificationEmail: "delivery@wheatandstone.ca",
      heroImageUrl: product.heroImageUrl ?? "/AV.png",
      logoUrl: "/favicon.ico",
    },
    create: {
      businessId: business.id,
      displayName: "Wheat & Stone Marketplace",
      description:
        "Local-first delivery pilot curated by Wheat & Stone for premium organic products.",
      city: "Edmonton",
      region: "Alberta",
      country: "Canada",
      pickupEnabled: true,
      deliveryEnabled: true,
      deliveryRadiusKm: 25,
      notificationEmail: "delivery@wheatandstone.ca",
      heroImageUrl: product.heroImageUrl ?? "/AV.png",
      logoUrl: "/favicon.ico",
    },
  });

  const inventoryName = `${product.name} Marketplace Delivery`;
  const inventory = await prisma.inventoryItem.upsert({
    where: {
      businessId_sku: {
        businessId: business.id,
        sku: `${product.slug.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}-PILOT`,
      },
    },
    update: {
      productId: product.id,
      name: inventoryName,
      description:
        product.summary ||
        `Premium local delivery pilot for ${product.name}.`,
      category: product.category,
      unitLabel: "delivery slot",
      imageUrl: product.heroImageUrl ?? "/AV.png",
      priceCents: 799,
      compareAtCents: 899,
      quantityOnHand: 24,
      reservedQuantity: 0,
      lowStockThreshold: 4,
      isActive: true,
    },
    create: {
      businessId: business.id,
      productId: product.id,
      sku: `${product.slug.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}-PILOT`,
      name: inventoryName,
      description:
        product.summary ||
        `Premium local delivery pilot for ${product.name}.`,
      category: product.category,
      unitLabel: "delivery slot",
      imageUrl: product.heroImageUrl ?? "/AV.png",
      priceCents: 799,
      compareAtCents: 899,
      quantityOnHand: 24,
      reservedQuantity: 0,
      lowStockThreshold: 4,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      priceCents: true,
    },
  });

  const now = new Date();
  const startsAt = new Date(now.getTime() - 60 * 60 * 1000);
  const existingOffer = await prisma.offer.findFirst({
    where: {
      businessId: business.id,
      productId: product.id,
      title: `${product.name} Delivery Pilot`,
    },
    select: { id: true },
  });

  const offerData = {
    businessId: business.id,
    inventoryItemId: inventory.id,
    productId: product.id,
    title: `${product.name} Delivery Pilot`,
    description:
      "Local delivery pilot through Wheat & Stone Marketplace. Reserve a premium bottle through the product page.",
    status: "LIVE",
    badgeText: "Marketplace pilot",
    discountPriceCents: 799,
    startsAt,
    endsAt: null,
    unitsTotal: 24,
    unitsClaimed: 0,
    ctaUrl: `/products/${product.slug}`,
    featured: true,
  };

  const offer = existingOffer
    ? await prisma.offer.update({
        where: { id: existingOffer.id },
        data: offerData,
        select: {
          id: true,
          title: true,
          discountPriceCents: true,
        },
      })
    : await prisma.offer.create({
        data: offerData,
        select: {
          id: true,
          title: true,
          discountPriceCents: true,
        },
      });

  console.log(
    JSON.stringify(
      {
        ok: true,
        businessSlug: business.slug,
        productSlug: product.slug,
        inventoryId: inventory.id,
        offerId: offer.id,
        offerTitle: offer.title,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error("[commerce-seed] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
