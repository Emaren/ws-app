import { prisma } from "@/lib/prisma";
import { EXPERIENCE_HISTORY_LIMIT } from "@/lib/userExperience";

const RECENT_ACTIVITY_LIMIT = 18;

export async function loadLocalUsers(query: string) {
  const normalizedQuery = query.trim();
  const where = normalizedQuery
    ? {
        OR: [
          {
            email: {
              contains: normalizedQuery,
              mode: "insensitive" as const,
            },
          },
          {
            name: {
              contains: normalizedQuery,
              mode: "insensitive" as const,
            },
          },
        ],
      }
    : undefined;

  return prisma.user.findMany({
    where,
    orderBy: [{ registeredAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      registeredVia: true,
      registeredAt: true,
      lastAuthProvider: true,
      lastAuthAt: true,
      createdAt: true,
      updatedAt: true,
      experienceProfile: true,
      experienceHistory: {
        orderBy: [{ createdAt: "desc" }],
        take: EXPERIENCE_HISTORY_LIMIT,
      },
      articles: {
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        take: 6,
        select: {
          id: true,
          slug: true,
          title: true,
          status: true,
          publishedAt: true,
          createdAt: true,
        },
      },
      comments: {
        orderBy: [{ createdAt: "desc" }],
        take: 6,
        select: {
          id: true,
          body: true,
          createdAt: true,
          article: {
            select: {
              slug: true,
              title: true,
            },
          },
        },
      },
      reactions: {
        orderBy: [{ createdAt: "desc" }],
        take: 12,
        select: {
          id: true,
          type: true,
          scope: true,
          productSlug: true,
          createdAt: true,
          article: {
            select: {
              slug: true,
              title: true,
            },
          },
        },
      },
      analyticsEvents: {
        orderBy: [{ createdAt: "desc" }],
        take: RECENT_ACTIVITY_LIMIT,
        select: {
          id: true,
          eventType: true,
          sessionId: true,
          sourceContext: true,
          destinationUrl: true,
          referrerUrl: true,
          adSlot: true,
          channel: true,
          metadata: true,
          createdAt: true,
          article: {
            select: {
              slug: true,
              title: true,
            },
          },
          business: {
            select: {
              slug: true,
              name: true,
            },
          },
          offer: {
            select: {
              id: true,
              title: true,
            },
          },
          inventoryItem: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      rewardLedgerEntries: {
        orderBy: [{ createdAt: "desc" }],
        take: 12,
        select: {
          id: true,
          token: true,
          direction: true,
          amount: true,
          reason: true,
          createdAt: true,
          business: {
            select: {
              slug: true,
              name: true,
            },
          },
        },
      },
      savedProducts: {
        orderBy: [{ createdAt: "desc" }],
        take: 8,
        select: {
          id: true,
          createdAt: true,
          product: {
            select: {
              id: true,
              slug: true,
              name: true,
              category: true,
              summary: true,
            },
          },
        },
      },
      savedOffers: {
        orderBy: [{ createdAt: "desc" }],
        take: 8,
        select: {
          id: true,
          createdAt: true,
          offer: {
            select: {
              id: true,
              title: true,
              badgeText: true,
              discountPriceCents: true,
              business: {
                select: {
                  slug: true,
                  name: true,
                },
              },
              product: {
                select: {
                  slug: true,
                  name: true,
                },
              },
              inventoryItem: {
                select: {
                  product: {
                    select: {
                      slug: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      deliveryLeads: {
        orderBy: [{ updatedAt: "desc" }, { requestedAt: "desc" }],
        take: 8,
        select: {
          id: true,
          status: true,
          source: true,
          requestedQty: true,
          totalCents: true,
          requestedAt: true,
          updatedAt: true,
          business: {
            select: {
              slug: true,
              name: true,
            },
          },
          offer: {
            select: {
              title: true,
            },
          },
          inventoryItem: {
            select: {
              name: true,
            },
          },
        },
      },
      authRegistrationEvents: {
        orderBy: [{ createdAt: "desc" }],
        take: 8,
        select: {
          id: true,
          method: true,
          status: true,
          failureCode: true,
          failureMessage: true,
          createdAt: true,
        },
      },
      authFunnelEvents: {
        orderBy: [{ createdAt: "desc" }],
        take: 8,
        select: {
          id: true,
          stage: true,
          method: true,
          sourceContext: true,
          createdAt: true,
        },
      },
      businessesOwned: {
        orderBy: [{ createdAt: "desc" }],
        take: 6,
        select: {
          id: true,
          slug: true,
          name: true,
          status: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          articles: true,
          comments: true,
          reactions: true,
          analyticsEvents: true,
          rewardLedgerEntries: true,
          savedProducts: true,
          savedOffers: true,
          deliveryLeads: true,
          businessesOwned: true,
        },
      },
    },
  });
}

export type LocalUserRow = Awaited<ReturnType<typeof loadLocalUsers>>[number];
