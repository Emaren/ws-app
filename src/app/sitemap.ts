import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { isPubliclyVisibleArticle, normalizeArticleStatus } from "@/lib/articleLifecycle";

const BASE_URL = "https://wheatandstone.ca";

const STATIC_ROUTES = [
  "/",
  "/discover",
  "/offers",
  "/map",
  "/community",
  "/articles",
  "/about",
  "/get-stone",
  "/get-wheat",
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "hourly" : "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));

  const articles = await prisma.article.findMany({
    select: {
      slug: true,
      status: true,
      publishedAt: true,
      updatedAt: true,
      createdAt: true,
    },
  });

  const articleEntries: MetadataRoute.Sitemap = articles
    .filter((article) => {
      const status = normalizeArticleStatus(article.status);
      return status ? isPubliclyVisibleArticle(status, article.publishedAt) : false;
    })
    .map((article) => ({
      url: `${BASE_URL}/articles/${article.slug}`,
      lastModified: article.updatedAt ?? article.publishedAt ?? article.createdAt,
      changeFrequency: "weekly",
      priority: 0.8,
    }));

  return [...staticEntries, ...articleEntries];
}
