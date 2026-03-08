import { Prisma, type RewardDirection, type RewardToken, type Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildContributorPublicSlug,
  PUBLIC_TEAM_CONTRIBUTOR_NAME,
  PUBLIC_TEAM_CONTRIBUTOR_SLUG,
  resolveContributorDisplayName,
} from "@/lib/contributorIdentity";
import { describeRewardReason } from "@/lib/rewardPresentation";

const LEGACY_VISIBLE_STATUSES = ["DRAFT", "REVIEW"] as const;
const PUBLIC_ARTICLE_WHERE: Prisma.ArticleWhereInput = {
  OR: [
    { status: "PUBLISHED" },
    {
      AND: [
        { status: { in: [...LEGACY_VISIBLE_STATUSES] } },
        { publishedAt: { not: null } },
      ],
    },
  ],
};

type ContributorQueryRow = Prisma.UserGetPayload<{
  select: {
    id: true;
    name: true;
    role: true;
    createdAt: true;
    updatedAt: true;
    articles: {
      where: typeof PUBLIC_ARTICLE_WHERE;
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }];
      select: {
        id: true;
        slug: true;
        title: true;
        excerpt: true;
        coverUrl: true;
        publishedAt: true;
        updatedAt: true;
        createdAt: true;
        likeCount: true;
        wowCount: true;
        hmmCount: true;
        reviewProfile: {
          select: {
            reviewScore: true;
            verdict: true;
            category: true;
            productName: true;
            product: {
              select: {
                slug: true;
                name: true;
                _count: {
                  select: {
                    savedProducts: true;
                  };
                };
              };
            };
          };
        };
        _count: {
          select: {
            affiliateClicks: true;
            commerceModules: true;
          };
        };
      };
    };
    rewardLedgerEntries: {
      orderBy: [{ createdAt: "desc" }];
      select: {
        id: true;
        token: true;
        direction: true;
        amount: true;
        reason: true;
        createdAt: true;
      };
    };
  };
}>;

type ContributorArticleRow = ContributorQueryRow["articles"][number];
type ContributorRewardRow = ContributorQueryRow["rewardLedgerEntries"][number];

type ContributorRewardEntry = {
  id: string;
  token: RewardToken;
  direction: RewardDirection;
  amount: number;
  reason: string;
  reasonLabel: string;
  createdAt: Date;
};

type ContributorReview = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverUrl: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
  score: number | null;
  verdict: string | null;
  category: string | null;
  productName: string | null;
  productSlug: string | null;
  productSavedCount: number;
  reactionCount: number;
  affiliateClicks: number;
  commerceModuleCount: number;
};

type ContributorBadgeTone = "amber" | "emerald" | "sky" | "neutral";

export type PublicContributorBadge = {
  label: string;
  tone: ContributorBadgeTone;
};

export type PublicContributor = {
  id: string;
  slug: string;
  name: string;
  role: Role;
  summary: string;
  publishedReviewCount: number;
  averageScore: number | null;
  productCount: number;
  categoryCount: number;
  reactionCount: number;
  affiliateClickCount: number;
  localRouteCount: number;
  memberSaveCount: number;
  wheatBalance: number;
  stoneBalance: number;
  communityRank: number;
  latestPublishedAt: Date | null;
  categories: Array<{ name: string; count: number }>;
  products: Array<{ slug: string | null; name: string; count: number; savedCount: number }>;
  badges: PublicContributorBadge[];
  latestReview: ContributorReview | null;
  reviews: ContributorReview[];
  recentRewards: ContributorRewardEntry[];
};

export type PublicCommunityActivity = {
  id: string;
  kind: "ARTICLE_PUBLISHED" | "TOKEN_GRANTED";
  title: string;
  description: string;
  occurredAt: Date;
  href: string;
  token: RewardToken | null;
  contributor: {
    name: string;
    slug: string;
  };
};

export type PublicCommunityOverview = {
  contributorCount: number;
  publishedReviewCount: number;
  productCoverageCount: number;
  categoryCoverageCount: number;
  reactionCount: number;
  localRouteCount: number;
  affiliateClickCount: number;
  deliveryLeadCount: number;
  completedDeliveryCount: number;
  engagedMemberCount: number;
  savedProductCount: number;
  savedOfferCount: number;
  memberSaveCount: number;
  wheatGranted: number;
  stoneGranted: number;
  topCategories: Array<{ name: string; count: number }>;
  featuredContributors: PublicContributor[];
  contributors: PublicContributor[];
  recentActivity: PublicCommunityActivity[];
};

function decimalToNumber(value: Prisma.Decimal | null | undefined): number {
  if (!value) {
    return 0;
  }

  return Number(value.toString());
}

function signedRewardAmount(entry: { amount: Prisma.Decimal; direction: RewardDirection }): number {
  const amount = decimalToNumber(entry.amount);
  return entry.direction === "DEBIT" ? -amount : amount;
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round((total / values.length) * 10) / 10;
}

function badgeSet(input: {
  publishedReviewCount: number;
  averageScore: number | null;
  localRouteCount: number;
  memberSaveCount: number;
  wheatBalance: number;
  reactionCount: number;
}): PublicContributorBadge[] {
  const badges: PublicContributorBadge[] = [];

  if (input.publishedReviewCount > 0) {
    badges.push({ label: "Published Voice", tone: "amber" });
  }
  if ((input.averageScore ?? 0) >= 85) {
    badges.push({ label: "High-Trust Reviewer", tone: "emerald" });
  }
  if (input.localRouteCount > 0) {
    badges.push({ label: "Local Route Activator", tone: "sky" });
  }
  if (input.memberSaveCount >= 5) {
    badges.push({ label: "Member Demand", tone: "sky" });
  }
  if (input.wheatBalance > 0) {
    badges.push({ label: "WHEAT Earner", tone: "amber" });
  }
  if (input.reactionCount >= 10) {
    badges.push({ label: "Audience Momentum", tone: "neutral" });
  }

  return badges.slice(0, 4);
}

function roleLabel(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "Admin";
    case "EDITOR":
      return "Editor";
    case "CONTRIBUTOR":
      return "Contributor";
    case "OWNER":
      return "Owner";
    case "STONEHOLDER":
      return "Stoneholder";
    default:
      return "Member";
  }
}

function buildContributorFromData(input: {
  id: string;
  name: string | null;
  role: Role;
  articles: ContributorArticleRow[];
  rewardLedgerEntries: ContributorRewardRow[];
  publicSlug?: string;
}): PublicContributor | null {
  const name = resolveContributorDisplayName(input.name);
  const slug = input.publicSlug || buildContributorPublicSlug(input.name, input.id);

  const reviews: ContributorReview[] = input.articles.map((article) => ({
    id: article.id,
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt,
    coverUrl: article.coverUrl,
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
    score: article.reviewProfile?.reviewScore ?? null,
    verdict: article.reviewProfile?.verdict ?? null,
    category: article.reviewProfile?.category ?? null,
    productName: article.reviewProfile?.productName ?? null,
    productSlug: article.reviewProfile?.product?.slug ?? null,
    productSavedCount: article.reviewProfile?.product?._count.savedProducts ?? 0,
    reactionCount: article.likeCount + article.wowCount + article.hmmCount,
    affiliateClicks: article._count.affiliateClicks,
    commerceModuleCount: article._count.commerceModules,
  }));

  if (reviews.length === 0) {
    return null;
  }

  const categoryMap = new Map<string, number>();
  const productMap = new Map<
    string,
    { slug: string | null; name: string; count: number; savedCount: number }
  >();
  const scoreValues: number[] = [];
  let reactionCount = 0;
  let affiliateClickCount = 0;
  let localRouteCount = 0;

  for (const review of reviews) {
    reactionCount += review.reactionCount;
    affiliateClickCount += review.affiliateClicks;
    localRouteCount += review.commerceModuleCount;

    if (typeof review.score === "number") {
      scoreValues.push(review.score);
    }

    if (review.category) {
      categoryMap.set(review.category, (categoryMap.get(review.category) ?? 0) + 1);
    }

    if (review.productName) {
      const key = review.productSlug || review.productName;
      const existing = productMap.get(key) ?? {
        slug: review.productSlug,
        name: review.productName,
        count: 0,
        savedCount: 0,
      };
      existing.count += 1;
      existing.savedCount = Math.max(existing.savedCount, review.productSavedCount);
      productMap.set(key, existing);
    }
  }

  const recentRewards = input.rewardLedgerEntries.slice(0, 8).map((entry) => ({
    id: entry.id,
    token: entry.token,
    direction: entry.direction,
    amount: signedRewardAmount(entry),
    reason: entry.reason,
    reasonLabel: describeRewardReason(entry.reason),
    createdAt: entry.createdAt,
  }));

  const wheatBalance = Math.round(
    input.rewardLedgerEntries
      .filter((entry) => entry.token === "WHEAT")
      .reduce((sum, entry) => sum + signedRewardAmount(entry), 0) * 100,
  ) / 100;
  const stoneBalance = Math.round(
    input.rewardLedgerEntries
      .filter((entry) => entry.token === "STONE")
      .reduce((sum, entry) => sum + signedRewardAmount(entry), 0) * 100,
  ) / 100;
  const averageScore = average(scoreValues);

  const categories = [...categoryMap.entries()]
    .map(([categoryName, count]) => ({ name: categoryName, count }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }
      return left.name.localeCompare(right.name);
    });
  const products = [...productMap.values()].sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }
    if (right.savedCount !== left.savedCount) {
      return right.savedCount - left.savedCount;
    }
    return left.name.localeCompare(right.name);
  });
  const memberSaveCount = products.reduce((sum, product) => sum + product.savedCount, 0);

  const communityRank =
    reviews.length * 40 +
    products.length * 18 +
    Math.round((averageScore ?? 0) * 2) +
    localRouteCount * 9 +
    affiliateClickCount * 2 +
    Math.min(reactionCount, 200) +
    Math.min(memberSaveCount, 150) * 3 +
    Math.round(wheatBalance * 6);

  const latestReview = reviews[0] ?? null;
  const summary =
    latestReview?.verdict ||
    latestReview?.excerpt ||
    `${name} is building trusted organic review coverage inside the Wheat & Stone network.`;

  return {
    id: input.id,
    slug,
    name,
    role: input.role,
    summary,
    publishedReviewCount: reviews.length,
    averageScore,
    productCount: products.length,
    categoryCount: categories.length,
    reactionCount,
    affiliateClickCount,
    localRouteCount,
    memberSaveCount,
    wheatBalance,
    stoneBalance,
    communityRank,
    latestPublishedAt: latestReview?.publishedAt ?? null,
    categories,
    products,
    badges: badgeSet({
      publishedReviewCount: reviews.length,
      averageScore,
      localRouteCount,
      memberSaveCount,
      wheatBalance,
      reactionCount,
    }),
    latestReview,
    reviews,
    recentRewards,
  };
}

function buildContributor(row: ContributorQueryRow): PublicContributor | null {
  return buildContributorFromData({
    id: row.id,
    name: row.name,
    role: row.role,
    articles: row.articles,
    rewardLedgerEntries: row.rewardLedgerEntries,
  });
}

export async function listPublicContributors(limit?: number): Promise<PublicContributor[]> {
  const [rows, unattributedArticles] = await Promise.all([
    prisma.user.findMany({
      where: {
        articles: {
          some: PUBLIC_ARTICLE_WHERE,
        },
      },
      select: {
        id: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        articles: {
          where: PUBLIC_ARTICLE_WHERE,
          orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
          select: {
            id: true,
            slug: true,
            title: true,
            excerpt: true,
            coverUrl: true,
            publishedAt: true,
            updatedAt: true,
            createdAt: true,
            likeCount: true,
            wowCount: true,
            hmmCount: true,
            reviewProfile: {
              select: {
                reviewScore: true,
                verdict: true,
                category: true,
                productName: true,
                product: {
                  select: {
                    slug: true,
                    name: true,
                    _count: {
                      select: {
                        savedProducts: true,
                      },
                    },
                  },
                },
              },
            },
            _count: {
              select: {
                affiliateClicks: true,
                commerceModules: true,
              },
            },
          },
        },
        rewardLedgerEntries: {
          orderBy: [{ createdAt: "desc" }],
          select: {
            id: true,
            token: true,
            direction: true,
            amount: true,
            reason: true,
            createdAt: true,
          },
        },
      },
    }),
    prisma.article.findMany({
      where: {
        AND: [
          PUBLIC_ARTICLE_WHERE,
          {
            OR: [{ authorId: null }, { author: { is: null } }],
          },
        ],
      },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        coverUrl: true,
        publishedAt: true,
        updatedAt: true,
        createdAt: true,
        likeCount: true,
        wowCount: true,
        hmmCount: true,
        reviewProfile: {
          select: {
            reviewScore: true,
            verdict: true,
            category: true,
            productName: true,
            product: {
              select: {
                slug: true,
                name: true,
                _count: {
                  select: {
                    savedProducts: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            affiliateClicks: true,
            commerceModules: true,
          },
        },
      },
    }),
  ]);

  const contributors = rows
    .map(buildContributor)
    .filter((value): value is PublicContributor => Boolean(value))

  const teamContributor =
    unattributedArticles.length > 0
      ? buildContributorFromData({
          id: "team",
          name: PUBLIC_TEAM_CONTRIBUTOR_NAME,
          role: "EDITOR",
          articles: unattributedArticles,
          rewardLedgerEntries: [],
          publicSlug: PUBLIC_TEAM_CONTRIBUTOR_SLUG,
        })
      : null;

  const rankedContributors = [...contributors, ...(teamContributor ? [teamContributor] : [])].sort(
    (left, right) => {
      if (right.communityRank !== left.communityRank) {
        return right.communityRank - left.communityRank;
      }

      const rightTime = right.latestPublishedAt?.getTime() ?? 0;
      const leftTime = left.latestPublishedAt?.getTime() ?? 0;
      return rightTime - leftTime;
    },
  );

  return typeof limit === "number" ? rankedContributors.slice(0, limit) : rankedContributors;
}

export async function getPublicContributorBySlug(
  slug: string,
): Promise<PublicContributor | null> {
  const contributors = await listPublicContributors();
  return contributors.find((contributor) => contributor.slug === slug) ?? null;
}

export async function getPublicCommunityOverview(): Promise<PublicCommunityOverview> {
  const [
    contributors,
    deliveryLeadCount,
    completedDeliveryCount,
    rewardTotals,
    savedProductCount,
    savedOfferCount,
    savedProductMembers,
    savedOfferMembers,
  ] = await Promise.all([
    listPublicContributors(),
    prisma.deliveryLead.count(),
    prisma.deliveryLead.count({
      where: {
        status: {
          in: ["RESERVED", "FULFILLED"],
        },
      },
    }),
    prisma.rewardLedger.groupBy({
      by: ["token", "direction"],
      _sum: {
        amount: true,
      },
    }),
    prisma.savedProduct.count(),
    prisma.savedOffer.count(),
    prisma.savedProduct.findMany({
      distinct: ["userId"],
      select: {
        userId: true,
      },
    }),
    prisma.savedOffer.findMany({
      distinct: ["userId"],
      select: {
        userId: true,
      },
    }),
  ]);

  const publishedReviewCount = contributors.reduce(
    (sum, contributor) => sum + contributor.publishedReviewCount,
    0,
  );
  const reactionCount = contributors.reduce(
    (sum, contributor) => sum + contributor.reactionCount,
    0,
  );
  const localRouteCount = contributors.reduce(
    (sum, contributor) => sum + contributor.localRouteCount,
    0,
  );
  const affiliateClickCount = contributors.reduce(
    (sum, contributor) => sum + contributor.affiliateClickCount,
    0,
  );
  const engagedMemberCount = new Set([
    ...savedProductMembers.map((row) => row.userId),
    ...savedOfferMembers.map((row) => row.userId),
  ]).size;
  const memberSaveCount = savedProductCount + savedOfferCount;

  const productKeys = new Set<string>();
  const categoryCounts = new Map<string, number>();
  for (const contributor of contributors) {
    for (const product of contributor.products) {
      productKeys.add(product.slug || product.name);
    }
    for (const category of contributor.categories) {
      categoryCounts.set(category.name, (categoryCounts.get(category.name) ?? 0) + category.count);
    }
  }

  let wheatGranted = 0;
  let stoneGranted = 0;
  for (const row of rewardTotals) {
    const signedAmount =
      (row.direction === "DEBIT" ? -1 : 1) * decimalToNumber(row._sum.amount);

    if (row.token === "WHEAT") {
      wheatGranted += signedAmount;
    } else if (row.token === "STONE") {
      stoneGranted += signedAmount;
    }
  }

  const topCategories = [...categoryCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }
      return left.name.localeCompare(right.name);
    })
    .slice(0, 6);

  const recentActivity = [
    ...contributors.flatMap((contributor) =>
      contributor.reviews.slice(0, 2).map((review) => ({
        id: `article:${review.id}`,
        kind: "ARTICLE_PUBLISHED" as const,
        title: `${contributor.name} published a review`,
        description: review.title,
        occurredAt: review.publishedAt ?? review.updatedAt,
        href: `/articles/${review.slug}`,
        token: null,
        contributor: {
          name: contributor.name,
          slug: contributor.slug,
        },
      })),
    ),
    ...contributors.flatMap((contributor) =>
      contributor.recentRewards
        .filter((reward) => reward.amount > 0)
        .slice(0, 2)
        .map((reward) => ({
          id: `reward:${reward.id}`,
          kind: "TOKEN_GRANTED" as const,
          title: `${contributor.name} earned ${reward.amount} ${reward.token}`,
          description: reward.reasonLabel,
          occurredAt: reward.createdAt,
          href: `/community/contributors/${contributor.slug}`,
          token: reward.token,
          contributor: {
            name: contributor.name,
            slug: contributor.slug,
          },
        })),
    ),
  ]
    .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())
    .slice(0, 10);

  return {
    contributorCount: contributors.length,
    publishedReviewCount,
    productCoverageCount: productKeys.size,
    categoryCoverageCount: categoryCounts.size,
    reactionCount,
    localRouteCount,
    affiliateClickCount,
    deliveryLeadCount,
    completedDeliveryCount,
    engagedMemberCount,
    savedProductCount,
    savedOfferCount,
    memberSaveCount,
    wheatGranted: Math.round(wheatGranted * 100) / 100,
    stoneGranted: Math.round(stoneGranted * 100) / 100,
    topCategories,
    featuredContributors: contributors.slice(0, 4),
    contributors,
    recentActivity,
  };
}

export function contributorRoleLabel(role: Role): string {
  return roleLabel(role);
}
