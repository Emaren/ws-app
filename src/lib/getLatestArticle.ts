// src/lib/getLatestArticle.ts
import { prisma } from "@/lib/prisma";

export async function getLatestArticle() {
  return prisma.article.findFirst({
    where: {
      OR: [
        { status: "PUBLISHED" },
        {
          AND: [
            { status: { in: ["DRAFT", "REVIEW"] } },
            { publishedAt: { not: null } },
          ],
        },
      ],
    },
    orderBy: [
      { publishedAt: "desc" }, // prefer newest by published date
      { createdAt: "desc" },   // fallback if publishedAt is null/missing
    ],
    include: {
      reviewProfile: true,
      commerceModules: {
        where: { isEnabled: true },
        orderBy: [{ placement: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          business: {
            include: {
              storeProfile: true,
            },
          },
          offer: true,
          inventoryItem: true,
        },
      },
    },
  });
}
