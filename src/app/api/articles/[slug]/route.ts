// src/app/api/articles/[slug]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiAuthContext } from "@/lib/apiAuth";
import { hasAnyRole, RBAC_ROLE_GROUPS } from "@/lib/rbac";
import {
  canDeleteArticle,
  canEditArticleContent,
  canReadArticle,
  canTransitionArticleStatus,
  derivePublishedAtPatch,
  normalizeArticleStatus,
} from "@/lib/articleLifecycle";

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

  const article = await prisma.article.findUnique({ where: { slug } });
  if (!article) return notFound();

  const status = normalizeArticleStatus(article.status);
  if (!status) {
    return new NextResponse("Invalid article status", { status: 500 });
  }

  if (status !== "PUBLISHED") {
    const auth = await getApiAuthContext(req);
    const isOwner = Boolean(auth.userId && article.authorId === auth.userId);
    const canRead = canReadArticle(status, auth.role, isOwner);
    if (!canRead) {
      return auth.token ? forbidden() : notFound();
    }
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

  // ---- Public reaction endpoint (no auth) ----
  if (body?.op === "react") {
    const existing = await prisma.article.findUnique({
      where: { slug },
      select: { status: true },
    });
    if (!existing) {
      return notFound();
    }
    if (existing.status !== "PUBLISHED") {
      return forbidden();
    }

    const type = String(body?.type || "").toUpperCase();
    if (!["LIKE", "WOW", "HMM"].includes(type)) {
      return badRequest("Invalid reaction type");
    }

    const data =
      type === "LIKE"
        ? { likeCount: { increment: 1 } }
        : type === "WOW"
        ? { wowCount: { increment: 1 } }
        : { hmmCount: { increment: 1 } };

    try {
      const updated = await prisma.article.update({
        where: { slug },
        data,
        select: { likeCount: true, wowCount: true, hmmCount: true },
      });
      return NextResponse.json(updated);
    } catch {
      return notFound();
    }
  }

  // ---- Auth-required editorial updates ----
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
  }: {
    title?: string;
    slug?: string;
    excerpt?: string | null;
    coverUrl?: string | null;
    content?: string;
    status?: string;
  } = body || {};

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
    patch.content = content;
  }
  if (nextSlug) patch.slug = nextSlug;

  // Publish/unpublish controls publishedAt
  if (nextStatus) {
    patch.status = nextStatus;
    patch.publishedAt = derivePublishedAtPatch(existing.publishedAt, nextStatus);
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
