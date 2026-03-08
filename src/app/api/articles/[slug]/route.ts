// src/app/api/articles/[slug]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasAnyRole, RBAC_ROLE_GROUPS } from "@/lib/rbac";
import {
  canDeleteArticle,
  canEditArticleContent,
  canTransitionArticleStatus,
  derivePublishedAtPatch,
  isPubliclyVisibleArticle,
  normalizeArticleStatus,
} from "@/lib/articleLifecycle";
import { normalizeArticleCommerceModulesInput } from "@/lib/articleCommerce";
import { syncProductGraphFromReviewProfile } from "@/lib/productGraph";
import { normalizeReviewProfileInput } from "@/lib/reviewProfile";
import { sanitizeArticleHtml } from "@/lib/sanitizeArticleHtml";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// --- helpers ---
function forbidden() {
  return new NextResponse("Forbidden", { status: 403 });
}
function notFound() {
  return new NextResponse("Not found", { status: 404 });
}
function badRequest(msg = "Bad Request") {
  return new NextResponse(msg, { status: 400 });
}

// Normalize a slug the same way the client does.
function normalizeSlug(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200); // keep it reasonable
}

// --- GET: fetch an article by slug ---
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const article = await prisma.article.findUnique({
    where: { slug },
    include: { reviewProfile: true, commerceModules: true },
  });
  if (!article) return notFound();

  const status = normalizeArticleStatus(article.status);
  if (!status) {
    return new NextResponse("Invalid article status", { status: 500 });
  }

  if (!isPubliclyVisibleArticle(status, article.publishedAt)) {
    return notFound();
  }

  // No caching in APIs by default; callers can decide.
  return NextResponse.json(article);
}

// --- PATCH: reactions (public) OR editorial updates (auth) ---
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  let body: any;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  // ---- Deprecated legacy reaction endpoint ----
  if (body?.op === "react") {
    return NextResponse.json(
      { message: "Deprecated reaction endpoint. Use /api/articles/[slug]/reactions." },
      { status: 410 },
    );
  }

  // ---- Auth-required editorial updates ----
  const { getApiAuthContext } = await import("@/lib/apiAuth");
  const auth = await getApiAuthContext(req);
  const hasEditorRole = hasAnyRole(auth.role, RBAC_ROLE_GROUPS.editorial);
  if (!auth.token || !hasEditorRole || !auth.userId) return forbidden();

  const existing = await prisma.article.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      status: true,
      authorId: true,
      publishedAt: true,
      excerpt: true,
      coverUrl: true,
      reviewProfile: {
        select: {
          id: true,
          productId: true,
          productName: true,
          brandName: true,
          category: true,
          reviewScore: true,
          verdict: true,
          organicStatus: true,
          recommendedFor: true,
          avoidFor: true,
          localAvailability: true,
          conventionalTitle: true,
          conventionalHref: true,
          conventionalImageSrc: true,
          conventionalBadge: true,
          conventionalPriceHint: true,
          organicTitle: true,
          organicHref: true,
          organicImageSrc: true,
          organicBadge: true,
          organicPriceHint: true,
        },
      },
      commerceModules: {
        select: {
          id: true,
        },
      },
    },
  });
  if (!existing) {
    return notFound();
  }

  const currentStatus = normalizeArticleStatus(existing.status);
  if (!currentStatus) {
    return new NextResponse("Invalid article status", { status: 500 });
  }

  const isOwner = existing.authorId === auth.userId;

  // Accept partials; all fields optional
  const {
    title,
    slug: nextSlugRaw,
    excerpt,
    coverUrl,
    content,
    status,
    reviewProfile,
    commerceModules,
  }: {
    title?: string;
    slug?: string;
    excerpt?: string | null;
    coverUrl?: string | null;
    content?: string;
    status?: string;
    reviewProfile?: unknown;
    commerceModules?: unknown;
  } = body || {};

  const hasReviewProfilePatch = Object.prototype.hasOwnProperty.call(body ?? {}, "reviewProfile");
  const hasCommerceModulesPatch = Object.prototype.hasOwnProperty.call(body ?? {}, "commerceModules");
  const normalizedReviewProfile = normalizeReviewProfileInput(reviewProfile);
  if (hasReviewProfilePatch && normalizedReviewProfile.error) {
    return badRequest(normalizedReviewProfile.error);
  }
  const normalizedCommerceModules = normalizeArticleCommerceModulesInput(commerceModules);
  if (hasCommerceModulesPatch && normalizedCommerceModules.error) {
    return badRequest(normalizedCommerceModules.error);
  }

  const shouldRefreshExistingProductGraph =
    !hasReviewProfilePatch &&
    !!existing.reviewProfile &&
    (excerpt !== undefined || coverUrl !== undefined);

  const syncedProduct = normalizedReviewProfile.data
    ? await syncProductGraphFromReviewProfile(prisma, {
        reviewProfile: normalizedReviewProfile.data,
        articleExcerpt: excerpt !== undefined ? excerpt ?? null : existing.excerpt ?? null,
        articleCoverUrl: coverUrl !== undefined ? coverUrl ?? null : existing.coverUrl ?? null,
      })
    : shouldRefreshExistingProductGraph && existing.reviewProfile
      ? await syncProductGraphFromReviewProfile(prisma, {
          reviewProfile: existing.reviewProfile,
          articleExcerpt: excerpt !== undefined ? excerpt ?? null : existing.excerpt ?? null,
          articleCoverUrl: coverUrl !== undefined ? coverUrl ?? null : existing.coverUrl ?? null,
        })
      : null;

  const nextStatus = status === undefined ? undefined : normalizeArticleStatus(status);
  if (status !== undefined && !nextStatus) {
    return badRequest("Invalid article status");
  }

  // Normalize slug if provided
  const nextSlug =
    typeof nextSlugRaw === "string" && nextSlugRaw.length
      ? normalizeSlug(nextSlugRaw)
      : undefined;
  if (nextSlugRaw !== undefined && !nextSlug) {
    return badRequest("Invalid slug");
  }

  // If changing slug, ensure uniqueness
  if (nextSlug && nextSlug !== slug) {
    const exists = await prisma.article.findUnique({ where: { slug: nextSlug } });
    if (exists) return new NextResponse("Slug already in use", { status: 409 });
  }

  const hasContentPatch =
    title !== undefined ||
    excerpt !== undefined ||
    coverUrl !== undefined ||
    content !== undefined ||
    nextSlug !== undefined;
  if (hasContentPatch && !canEditArticleContent(currentStatus, auth.role, isOwner)) {
    return forbidden();
  }

  if (
    nextStatus &&
    !canTransitionArticleStatus(currentStatus, nextStatus, auth.role, isOwner)
  ) {
    return forbidden();
  }

  // Build patch object
  const patch: Record<string, any> = {};
  if (title !== undefined) {
    if (!title.trim()) {
      return badRequest("Title cannot be empty");
    }
    patch.title = title.trim();
  }
  if (excerpt !== undefined) patch.excerpt = excerpt;
  if (coverUrl !== undefined) patch.coverUrl = coverUrl;
  if (content !== undefined) {
    if (!content.trim()) {
      return badRequest("Content cannot be empty");
    }
    const sanitizedContent = sanitizeArticleHtml(content);
    if (!sanitizedContent.trim()) {
      return badRequest("Content is empty after sanitization");
    }
    patch.content = sanitizedContent;
  }
  if (nextSlug) patch.slug = nextSlug;

  // Publish/unpublish controls publishedAt
  if (nextStatus) {
    patch.status = nextStatus;
    patch.publishedAt = derivePublishedAtPatch(existing.publishedAt, nextStatus);
  }

  if (hasReviewProfilePatch) {
    if (normalizedReviewProfile.data) {
      patch.reviewProfile = existing.reviewProfile
        ? {
            update: {
              ...normalizedReviewProfile.data,
              ...(syncedProduct
                ? {
                    product: {
                      connect: { id: syncedProduct.id },
                    },
                  }
                : {}),
            },
          }
        : {
            create: {
              ...normalizedReviewProfile.data,
              ...(syncedProduct
                ? {
                    product: {
                      connect: { id: syncedProduct.id },
                    },
                  }
                : {}),
            },
          };
    } else if (existing.reviewProfile) {
      patch.reviewProfile = { delete: true };
    }
  } else if (syncedProduct && existing.reviewProfile) {
    patch.reviewProfile = {
      update: {
        product: {
          connect: { id: syncedProduct.id },
        },
      },
    };
  }

  if (hasCommerceModulesPatch) {
    patch.commerceModules = {
      deleteMany: {},
      ...(normalizedCommerceModules.data.length
        ? {
            create: normalizedCommerceModules.data,
          }
        : {}),
    };
  }

  if (Object.keys(patch).length === 0) {
    return badRequest("No changes supplied");
  }

  try {
    const updated = await prisma.article.update({
      where: { slug },
      data: patch,
    });
    return NextResponse.json(updated);
  } catch {
    return notFound();
  }
}

// --- DELETE: remove an article (auth) ---
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { getApiAuthContext } = await import("@/lib/apiAuth");
  const auth = await getApiAuthContext(req);
  const hasEditorRole = hasAnyRole(auth.role, RBAC_ROLE_GROUPS.editorial);
  if (!auth.token || !hasEditorRole || !auth.userId) return forbidden();

  const { slug } = await params;

  try {
    const article = await prisma.article.findUnique({
      where: { slug },
      select: { status: true, authorId: true },
    });
    if (!article) {
      return notFound();
    }

    const status = normalizeArticleStatus(article.status);
    if (!status) {
      return new NextResponse("Invalid article status", { status: 500 });
    }

    const isOwner = article.authorId === auth.userId;
    if (!canDeleteArticle(status, auth.role, isOwner)) {
      return forbidden();
    }

    await prisma.article.delete({ where: { slug } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return notFound();
  }
}
