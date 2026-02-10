import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function upsertCampaign(businessId, name, data) {
  const existing = await prisma.campaign.findFirst({
    where: { businessId, name },
  });

  if (existing) {
    return prisma.campaign.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.campaign.create({
    data: {
      businessId,
      name,
      ...data,
    },
  });
}

async function upsertPricingRule(businessId, name, data) {
  const existing = await prisma.pricingRule.findFirst({
    where: { businessId, name },
  });

  if (existing) {
    return prisma.pricingRule.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.pricingRule.create({
    data: {
      businessId,
      name,
      ...data,
    },
  });
}

async function upsertDeliveryLead(businessId, offerId, data) {
  const existing = await prisma.deliveryLead.findFirst({
    where: {
      businessId,
      offerId,
      notes: data.notes,
    },
  });

  if (existing) {
    return prisma.deliveryLead.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.deliveryLead.create({
    data: {
      businessId,
      offerId,
      ...data,
    },
  });
}

async function upsertAffiliateClick(businessId, campaignId, destinationUrl) {
  const existing = await prisma.affiliateClick.findFirst({
    where: {
      businessId,
      campaignId,
      destinationUrl,
      sourceContext: "seed:featured-footer",
    },
  });

  if (existing) {
    return prisma.affiliateClick.update({
      where: { id: existing.id },
      data: {
        network: "TOKENTAP",
        sourceContext: "seed:featured-footer",
      },
    });
  }

  return prisma.affiliateClick.create({
    data: {
      businessId,
      campaignId,
      network: "TOKENTAP",
      sourceContext: "seed:featured-footer",
      destinationUrl,
    },
  });
}

async function main() {
  const owner = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });

  const business = await prisma.business.upsert({
    where: { slug: "avalon-foods" },
    update: {
      name: "Avalon Foods",
      legalName: "Avalon Dairy Foods Ltd",
      contactEmail: "orders@avalonfoods.local",
      contactPhone: "+1-780-555-0142",
      timezone: "America/Edmonton",
      status: "ACTIVE",
      isVerified: true,
      ownerUserId: owner?.id ?? null,
    },
    create: {
      slug: "avalon-foods",
      name: "Avalon Foods",
      legalName: "Avalon Dairy Foods Ltd",
      contactEmail: "orders@avalonfoods.local",
      contactPhone: "+1-780-555-0142",
      timezone: "America/Edmonton",
      status: "ACTIVE",
      isVerified: true,
      ownerUserId: owner?.id ?? null,
    },
  });

  await prisma.storeProfile.upsert({
    where: { businessId: business.id },
    update: {
      displayName: "Avalon Foods - Whyte Ave",
      description: "Local organic dairy and curated pantry staples.",
      city: "Edmonton",
      region: "AB",
      country: "CA",
      pickupEnabled: true,
      deliveryEnabled: true,
      deliveryRadiusKm: 20,
      notificationEmail: "notify@avalonfoods.local",
    },
    create: {
      businessId: business.id,
      displayName: "Avalon Foods - Whyte Ave",
      description: "Local organic dairy and curated pantry staples.",
      city: "Edmonton",
      region: "AB",
      country: "CA",
      pickupEnabled: true,
      deliveryEnabled: true,
      deliveryRadiusKm: 20,
      notificationEmail: "notify@avalonfoods.local",
    },
  });

  const inventory = await prisma.inventoryItem.upsert({
    where: {
      businessId_sku: {
        businessId: business.id,
        sku: "AVALON-CHOC-1L",
      },
    },
    update: {
      name: "Avalon Chocolate Milk 1L",
      description: "Organic chocolate milk with no refined cane sugar.",
      category: "Dairy",
      unitLabel: "1L carton",
      priceCents: 799,
      compareAtCents: 949,
      quantityOnHand: 28,
      lowStockThreshold: 6,
      isActive: true,
    },
    create: {
      businessId: business.id,
      sku: "AVALON-CHOC-1L",
      name: "Avalon Chocolate Milk 1L",
      description: "Organic chocolate milk with no refined cane sugar.",
      category: "Dairy",
      unitLabel: "1L carton",
      priceCents: 799,
      compareAtCents: 949,
      quantityOnHand: 28,
      lowStockThreshold: 6,
      isActive: true,
    },
  });

  const pricingRule = await upsertPricingRule(business.id, "Avalon Launch 10%", {
    inventoryItemId: inventory.id,
    description: "Auto discount for launch week.",
    ruleType: "PERCENT_OFF",
    percentOff: "10",
    startsAt: new Date(),
    endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    isActive: true,
  });

  const campaign = await upsertCampaign(business.id, "Avalon Launch Campaign", {
    description: "Launch campaign for premium milk + local ad CTA",
    type: "PROMOTION",
    status: "LIVE",
    startsAt: new Date(),
    endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
    budgetCents: 25000,
  });

  const offer = await prisma.offer.upsert({
    where: {
      businessId_couponCode: {
        businessId: business.id,
        couponCode: "AVALON10",
      },
    },
    update: {
      inventoryItemId: inventory.id,
      pricingRuleId: pricingRule.id,
      campaignId: campaign.id,
      title: "Avalon Launch Deal",
      description: "10% launch discount while inventory lasts.",
      status: "LIVE",
      badgeText: "Local favorite",
      discountPriceCents: 719,
      unitsTotal: 120,
      unitsClaimed: 8,
      ctaUrl: "https://wheatandstone.ca/articles/avalon-chocolate-milk",
      featured: true,
    },
    create: {
      businessId: business.id,
      inventoryItemId: inventory.id,
      pricingRuleId: pricingRule.id,
      campaignId: campaign.id,
      title: "Avalon Launch Deal",
      description: "10% launch discount while inventory lasts.",
      status: "LIVE",
      badgeText: "Local favorite",
      couponCode: "AVALON10",
      discountPriceCents: 719,
      unitsTotal: 120,
      unitsClaimed: 8,
      ctaUrl: "https://wheatandstone.ca/articles/avalon-chocolate-milk",
      featured: true,
    },
  });

  const recipient = await prisma.notificationRecipient.upsert({
    where: {
      businessId_email: {
        businessId: business.id,
        email: "tonyblum@me.com",
      },
    },
    update: {
      name: "Tony Blum",
      phone: "+1-780-555-9988",
      preferredChannel: "EMAIL",
      emailOptIn: true,
      smsOptIn: true,
      pushOptIn: false,
      tags: { segment: "founder", source: "seed" },
    },
    create: {
      businessId: business.id,
      userId: owner?.id ?? null,
      name: "Tony Blum",
      email: "tonyblum@me.com",
      phone: "+1-780-555-9988",
      preferredChannel: "EMAIL",
      emailOptIn: true,
      smsOptIn: true,
      pushOptIn: false,
      tags: { segment: "founder", source: "seed" },
    },
  });

  await upsertDeliveryLead(business.id, offer.id, {
    inventoryItemId: inventory.id,
    recipientId: recipient.id,
    userId: owner?.id ?? null,
    source: "ARTICLE_CTA",
    status: "CONTACTED",
    requestedQty: 2,
    unitPriceCents: 719,
    totalCents: 1438,
    deliveryAddress: "Edmonton, AB",
    notes: "seed:avalon-launch-lead",
  });

  await upsertAffiliateClick(business.id, campaign.id, "https://tokentap.ca");

  await prisma.rewardLedger.upsert({
    where: { externalRef: "seed-reward-avalon-launch" },
    update: {
      businessId: business.id,
      campaignId: campaign.id,
      userId: owner?.id ?? null,
      token: "WHEAT",
      direction: "CREDIT",
      amount: "25",
      reason: "Seed reward for contributor launch content",
      metadata: { source: "seed", campaign: "Avalon Launch Campaign" },
    },
    create: {
      businessId: business.id,
      campaignId: campaign.id,
      userId: owner?.id ?? null,
      token: "WHEAT",
      direction: "CREDIT",
      amount: "25",
      reason: "Seed reward for contributor launch content",
      metadata: { source: "seed", campaign: "Avalon Launch Campaign" },
      externalRef: "seed-reward-avalon-launch",
    },
  });

  const counts = {
    businesses: await prisma.business.count(),
    storeProfiles: await prisma.storeProfile.count(),
    inventoryItems: await prisma.inventoryItem.count(),
    pricingRules: await prisma.pricingRule.count(),
    offers: await prisma.offer.count(),
    campaigns: await prisma.campaign.count(),
    notificationRecipients: await prisma.notificationRecipient.count(),
    deliveryLeads: await prisma.deliveryLead.count(),
    affiliateClicks: await prisma.affiliateClick.count(),
    rewardLedger: await prisma.rewardLedger.count(),
  };

  console.log("Business-ops seed complete", counts);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
