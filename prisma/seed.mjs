import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const AVALON_FULL_ARTICLE_CONTENT = `
<h2>The Chocolate Milk That Ends the Search</h2>
<p>If you've ever wandered through the dairy aisle looking for something better not just sweeter, but better you've likely come up empty. Most chocolate milks today are made with industrial powders, artificial flavors, and milk that's been stripped, reconstituted, and ultrafiltered to the point of death.</p>
<p>Avalon Organic Chocolate Milk is different. It's the real thing, and once you taste it, you don't go back.</p>

<h2>Organic. Grass-Fed. Glass-Bottled.</h2>
<ul>
  <li><strong>Certified Organic:</strong> No synthetic pesticides. No shortcuts.</li>
  <li><strong>Real Cocoa:</strong> Deep, rich flavor from actual cocoa, not artificial blends.</li>
  <li><strong>Full-Fat, Non-Homogenized:</strong> You'll notice the cream rise to the top. That's how you know it's real.</li>
  <li><strong>Glass Bottle:</strong> Preserves taste. Avoids leaching. Plastic doesn't compare.</li>
</ul>
<p>And yes it's made in <strong>Canada</strong>. Avalon Dairy is the oldest organic dairy in Western Canada, operating since 1906.</p>

<h2>Why We Chose It</h2>
<p>Wheat &amp; Stone doesn't just chase trends we highlight products that stand the test of time, especially when they come from local farms and real craftsmanship.</p>
<p>Avalon&rsquo;s chocolate milk checks every box:</p>
<ul>
  <li>Ethical</li>
  <li>Sustainable</li>
  <li>Uncompromisingly delicious</li>
</ul>
<p>If you want your kids or yourself drinking something you can <strong>stand behind</strong>, this is it.</p>

<h2>Taste Notes from a Lifelong Drinker</h2>
<blockquote><p><em>It's smooth, velvety, with a kick of true cocoa that hits different from the first sip. Not overly sweet. Just honest. You feel it in the back of your throat like a good espresso or dark ale.</em><br/>Tony Blum, Founder, Wheat &amp; Stone</p></blockquote>

<h2>CleanSwap Comparison</h2>
<table>
  <thead>
    <tr>
      <th>Category</th>
      <th>Avalon Organic Chocolate Milk</th>
      <th>Mainstream Chocolate Milk (e.g. Nesquik)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Cocoa Source</td>
      <td>Organic Cocoa</td>
      <td>Cocoa Powder + Artificial Flavors</td>
    </tr>
    <tr>
      <td>Sweetener</td>
      <td>Organic Cane Sugar</td>
      <td>High Fructose Corn Syrup</td>
    </tr>
    <tr>
      <td>Milk Type</td>
      <td>Whole, Organic, Grass-Fed</td>
      <td>Conventional, Homogenized</td>
    </tr>
    <tr>
      <td>Packaging</td>
      <td>Reusable Glass</td>
      <td>Plastic or TetraPak</td>
    </tr>
    <tr>
      <td>Taste</td>
      <td>Rich, Balanced, Real</td>
      <td>Cloyingly sweet, artificial</td>
    </tr>
  </tbody>
</table>

<h2>Where to Find It</h2>
<p>Available at many health-focused stores across Western Canada, including Whole Foods and select local grocers. Expect around $7.99 to $8.99 for the 1L glass bottle and worth every penny.</p>
<p><strong>Pro tip:</strong> rinse and return the bottle for deposit, or keep it if you're building a reusable glass shelf at home.</p>

<h2>Final Verdict</h2>
<p>If you've been disappointed by every chocolate milk on the shelf, this is the one that resets your standard. The taste, quality, and ingredient integrity are unmatched.</p>
`;

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

  await prisma.article.upsert({
    where: { slug: "avalon-organic-chocolate-milk" },
    update: {
      title: "Avalon Organic Chocolate Milk: The Gold Standard in a Glass Bottle",
      excerpt:
        "Not all chocolate milk is created equal. Avalon stands out for clean ingredients, full flavor, and glass-bottled quality.",
      coverUrl: "/ECAvalon.jpg",
      content: AVALON_FULL_ARTICLE_CONTENT,
      status: "PUBLISHED",
      publishedAt: new Date("2026-03-01T18:54:00.000Z"),
      authorId: owner?.id ?? null,
    },
    create: {
      slug: "avalon-organic-chocolate-milk",
      title: "Avalon Organic Chocolate Milk: The Gold Standard in a Glass Bottle",
      excerpt:
        "Not all chocolate milk is created equal. Avalon stands out for clean ingredients, full flavor, and glass-bottled quality.",
      coverUrl: "/ECAvalon.jpg",
      content: AVALON_FULL_ARTICLE_CONTENT,
      status: "PUBLISHED",
      publishedAt: new Date("2026-03-01T18:54:00.000Z"),
      authorId: owner?.id ?? null,
    },
  });

  if (owner?.email) {
    const existingAuthEvent = await prisma.authRegistrationEvent.findFirst({
      where: {
        email: owner.email.toLowerCase(),
        status: "SUCCESS",
        method: "CREDENTIALS",
      },
    });

    if (!existingAuthEvent) {
      await prisma.authRegistrationEvent.create({
        data: {
          userId: owner.id,
          email: owner.email.toLowerCase(),
          method: "CREDENTIALS",
          status: "SUCCESS",
          metadata: { source: "seed" },
        },
      });
    }
  }

  const existingFunnelSeedCount = await prisma.authFunnelEvent.count({
    where: { sourceContext: "seed_auth_funnel" },
  });

  if (existingFunnelSeedCount === 0) {
    const now = Date.now();
    const buildAt = (offsetMinutes) =>
      new Date(now - offsetMinutes * 60 * 1000);

    await prisma.authFunnelEvent.createMany({
      data: [
        ...Array.from({ length: 12 }, (_, index) => ({
          stage: "REGISTER_VIEW_STARTED",
          sessionId: `seed-view-${index + 1}`,
          sourceContext: "seed_auth_funnel",
          createdAt: buildAt(180 - index * 5),
        })),
        ...Array.from({ length: 9 }, (_, index) => ({
          stage: "REGISTER_SUBMIT_ATTEMPTED",
          method: "CREDENTIALS",
          email: index < 7 ? `seed-user-${index + 1}@example.com` : null,
          sessionId: `seed-view-${index + 1}`,
          sourceContext: "seed_auth_funnel",
          createdAt: buildAt(150 - index * 5),
        })),
        ...Array.from({ length: 7 }, (_, index) => ({
          stage: "REGISTER_SUCCESS",
          method: "CREDENTIALS",
          userId: index === 0 ? owner?.id ?? null : null,
          email:
            index === 0
              ? owner?.email?.toLowerCase() ?? "seed-owner@example.com"
              : `seed-user-${index + 1}@example.com`,
          sessionId: `seed-view-${index + 1}`,
          sourceContext: "seed_auth_funnel",
          createdAt: buildAt(120 - index * 5),
        })),
        ...Array.from({ length: 5 }, (_, index) => ({
          stage: "FIRST_LOGIN_SUCCESS",
          method: "CREDENTIALS",
          userId: index === 0 ? owner?.id ?? null : null,
          email:
            index === 0
              ? owner?.email?.toLowerCase() ?? "seed-owner@example.com"
              : `seed-user-${index + 1}@example.com`,
          sourceContext: "seed_auth_funnel",
          createdAt: buildAt(90 - index * 5),
        })),
      ],
    });
  }

  const counts = {
    articles: await prisma.article.count(),
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
    authRegistrationEvents: await prisma.authRegistrationEvent.count(),
    authFunnelEvents: await prisma.authFunnelEvent.count(),
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
