// src/lib/getLatestArticle.ts
import { prisma } from "@/lib/prisma";

export async function getLatestArticle() {
  return prisma.article.findFirst({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
  });
}
