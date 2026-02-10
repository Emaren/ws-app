// src/app/api/articles/[slug]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

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
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const article = await prisma.article.findUnique({ where: { slug } });
  if (!article) return notFound();

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
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const role = token?.role as "ADMIN" | "CONTRIBUTOR" | undefined;
  if (!token || !role) return forbidden();

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
    status?: "DRAFT" | "PUBLISHED";
  } = body || {};

  // Normalize slug if provided
  const nextSlug =
    typeof nextSlugRaw === "string" && nextSlugRaw.length
      ? normalizeSlug(nextSlugRaw)
      : undefined;

  // If changing slug, ensure uniqueness
  if (nextSlug && nextSlug !== slug) {
    const exists = await prisma.article.findUnique({ where: { slug: nextSlug } });
    if (exists) return new NextResponse("Slug already in use", { status: 409 });
  }

  // Build patch object
  const patch: Record<string, any> = {};
  if (title !== undefined) patch.title = title;
  if (excerpt !== undefined) patch.excerpt = excerpt;
  if (coverUrl !== undefined) patch.coverUrl = coverUrl;
  if (content !== undefined) patch.content = content;
  if (nextSlug) patch.slug = nextSlug;

  // Publish/unpublish controls publishedAt
  if (status === "PUBLISHED") {
    patch.status = "PUBLISHED";
    patch.publishedAt = new Date();
  } else if (status === "DRAFT") {
    patch.status = "DRAFT";
    patch.publishedAt = null;
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
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const role = token?.role as "ADMIN" | "CONTRIBUTOR" | undefined;
  if (!token || !role) return forbidden();

  const { slug } = await params;

  try {
    await prisma.article.delete({ where: { slug } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return notFound();
  }
}
