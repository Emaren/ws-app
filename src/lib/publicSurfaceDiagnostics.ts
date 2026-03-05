import "server-only";
import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export type UrlProbe = {
  url: string;
  ok: boolean;
  status: number | null;
  redirectedTo: string | null;
  contentType: string | null;
  contentLength: string | null;
  error: string | null;
  bodyPreview?: string;
};

type HomeMetaProbe = {
  hasOgImage: boolean;
  hasTwitterCard: boolean;
  hasSummaryLargeImage: boolean;
  ogImageValues: string[];
  twitterImageValues: string[];
};

export type PublicSurfaceSnapshot = {
  origin: string;
  homeUrl: string;
  apexUrl: string;
  xCardBypassUrl: string;
  socialImageUrl: string;
  socialImageVersion: string;
  homeProbe: UrlProbe;
  twitterBotProbe: UrlProbe;
  apexProbe: UrlProbe;
  socialImageProbe: UrlProbe;
  homeMeta: HomeMetaProbe;
  twitterBotMeta: HomeMetaProbe;
  facebookComments: {
    targetArticleUrl: string | null;
    embedUrl: string | null;
    note: string;
  };
};

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function resolveSiteOrigin(req: NextRequest): URL {
  const fallback = "https://wheatandstone.ca";
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_ORIGIN?.trim(),
    process.env.NEXTAUTH_URL?.trim(),
    (() => {
      const host =
        req.headers.get("x-forwarded-host") ??
        req.headers.get("host") ??
        "wheatandstone.ca";
      const proto = req.headers.get("x-forwarded-proto") ?? "https";
      return `${proto}://${host}`;
    })(),
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const normalized = /^https?:\/\//i.test(candidate)
      ? candidate
      : `https://${candidate}`;
    try {
      return new URL(normalized);
    } catch {
      // continue
    }
  }

  return new URL(fallback);
}

async function probeUrl(
  url: string,
  options?: { includeBodyPreview?: boolean; userAgent?: string },
): Promise<UrlProbe> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "user-agent": options?.userAgent || "WheatAndStone-Diagnostics/1.0",
      },
    });
    const contentType = response.headers.get("content-type");
    const includeBodyPreview = Boolean(options?.includeBodyPreview);
    const bodyPreview =
      includeBodyPreview && contentType?.toLowerCase().includes("text/html")
        ? (await response.text()).slice(0, 160_000)
        : undefined;
    return {
      url,
      ok: response.ok,
      status: response.status,
      redirectedTo: response.headers.get("location"),
      contentType,
      contentLength: response.headers.get("content-length"),
      error: null,
      bodyPreview,
    };
  } catch (error) {
    return {
      url,
      ok: false,
      status: null,
      redirectedTo: null,
      contentType: null,
      contentLength: null,
      error: safeErrorMessage(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function extractHomeMeta(html: string): HomeMetaProbe {
  return {
    hasOgImage: /<meta[^>]+property=["']og:image["']/i.test(html),
    hasTwitterCard: /<meta[^>]+name=["']twitter:card["']/i.test(html),
    hasSummaryLargeImage:
      /<meta[^>]+name=["']twitter:card["'][^>]+content=["']summary_large_image["']/i.test(
        html,
      ) ||
      /<meta[^>]+content=["']summary_large_image["'][^>]+name=["']twitter:card["']/i.test(
        html,
      ),
    ogImageValues: extractMetaValues(html, "og:image"),
    twitterImageValues: extractMetaValues(html, "twitter:image"),
  };
}

function extractMetaValues(html: string, property: string): string[] {
  const values = new Set<string>();
  const escapedProperty = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(
      `<meta\\s+[^>]*property=["']${escapedProperty}["'][^>]*content=["']([^"']+)["'][^>]*>`,
      "gi",
    ),
    new RegExp(
      `<meta\\s+[^>]*content=["']([^"']+)["'][^>]*property=["']${escapedProperty}["'][^>]*>`,
      "gi",
    ),
    new RegExp(
      `<meta\\s+[^>]*name=["']${escapedProperty}["'][^>]*content=["']([^"']+)["'][^>]*>`,
      "gi",
    ),
    new RegExp(
      `<meta\\s+[^>]*content=["']([^"']+)["'][^>]*name=["']${escapedProperty}["'][^>]*>`,
      "gi",
    ),
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const value = match[1]?.trim();
      if (value) {
        values.add(value);
      }
    }
  }

  return Array.from(values);
}

export async function buildPublicSurfaceSnapshot(
  req: NextRequest,
): Promise<PublicSurfaceSnapshot> {
  const now = new Date();
  const siteOrigin = resolveSiteOrigin(req);
  const homeUrl = new URL("/", siteOrigin).toString();
  const apexHost = siteOrigin.hostname.replace(/^www\./i, "");
  const apexUrl = new URL(siteOrigin.toString());
  apexUrl.hostname = apexHost;
  const socialImageVersion =
    process.env.NEXT_PUBLIC_X_CARD_VERSION?.trim().replace(/\s+/g, "") || "20260304-1";
  const socialImageUrl = new URL(
    `/og-x-card.jpg?v=${encodeURIComponent(socialImageVersion)}`,
    siteOrigin,
  ).toString();
  const xCardBypassUrl = new URL(
    `/?xcard=${encodeURIComponent(socialImageVersion)}`,
    siteOrigin,
  ).toString();

  const latestPublicArticle = await prisma.article.findFirst({
    where: {
      status: "PUBLISHED",
      publishedAt: {
        lte: now,
      },
    },
    orderBy: {
      publishedAt: "desc",
    },
    select: {
      slug: true,
    },
  });

  const targetArticleUrl = latestPublicArticle
    ? new URL(`/articles/${encodeURIComponent(latestPublicArticle.slug)}`, siteOrigin).toString()
    : null;
  const facebookEmbedUrl = targetArticleUrl
    ? `https://www.facebook.com/plugins/comments.php?href=${encodeURIComponent(targetArticleUrl)}`
    : null;

  const [homeProbeRaw, twitterBotProbeRaw, apexProbe, socialImageProbe] = await Promise.all([
    probeUrl(homeUrl, { includeBodyPreview: true }),
    probeUrl(homeUrl, {
      includeBodyPreview: true,
      userAgent: "Twitterbot/1.0",
    }),
    probeUrl(apexUrl.toString()),
    probeUrl(socialImageUrl),
  ]);

  const homeHtml = homeProbeRaw.bodyPreview ?? "";
  const twitterBotHtml = twitterBotProbeRaw.bodyPreview ?? "";
  const homeMeta = extractHomeMeta(homeHtml);
  const twitterBotMeta = extractHomeMeta(twitterBotHtml);

  const { bodyPreview: _bodyPreviewIgnored, ...homeProbe } = homeProbeRaw;
  const { bodyPreview: _twitterBodyPreviewIgnored, ...twitterBotProbe } =
    twitterBotProbeRaw;

  return {
    origin: siteOrigin.toString().replace(/\/+$/, ""),
    homeUrl,
    apexUrl: apexUrl.toString(),
    xCardBypassUrl,
    socialImageUrl,
    socialImageVersion,
    homeProbe,
    twitterBotProbe,
    apexProbe,
    socialImageProbe,
    homeMeta,
    twitterBotMeta,
    facebookComments: {
      targetArticleUrl,
      embedUrl: facebookEmbedUrl,
      note: "Blank Facebook iframe is usually privacy shielding or zero comments. Use Open Comments In Facebook to confirm and post first.",
    },
  };
}
