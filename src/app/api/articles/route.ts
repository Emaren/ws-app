// src/app/api/articles/route.ts
import type { ArticleStatus, Prisma } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { getApiAuthContext } from "@/lib/apiAuth";
import {
  canSetCreateStatus,
  normalizeArticleStatus,
} from "@/lib/articleLifecycle";
import { sanitizeArticleHtml } from "@/lib/sanitizeArticleHtml";
import { prisma } from "@/lib/prisma";
import { hasAnyRole, RBAC_ROLE_GROUPS } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Utility: make a URL-safe slug from a title
function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Ensure slug is unique by appending -2, -3, ...
async function generateUniqueSlug(base: string) {
  let slug = base || "article";
  let i = 2;
  while (await prisma.article.findUnique({ where: { slug } })) {
    slug = `${base}-${i++}`;
  }
  return slug;
}

// GET /api/articles -> published for visitors, role-aware for editorial users
export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext(req);
  const isEditorial = hasAnyRole(auth.role, RBAC_ROLE_GROUPS.editorial);
  const isStaff = hasAnyRole(auth.role, RBAC_ROLE_GROUPS.staff);
  const legacyVisibleStatuses: ArticleStatus[] = ["DRAFT", "REVIEW"];
  const publicVisibilityWhere: Prisma.ArticleWhereInput = {
    OR: [
      { status: "PUBLISHED" },
      {
        AND: [
          { status: { in: legacyVisibleStatuses } },
          { publishedAt: { not: null } },
        ],
      },
    ],
  };

  const where =
    !auth.token || !isEditorial
      ? publicVisibilityWhere
      : isStaff
      ? {}
      : {
          OR: [
            publicVisibilityWhere,
            { authorId: auth.userId ?? "__no-author__" },
          ],
        };

  const articles = await prisma.article.findMany({
    where,
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      coverUrl: true,
      publishedAt: true,
      status: true,
      authorId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(articles);
}

// POST /api/articles
// Body: { title: string, content: string, excerpt?: string, coverUrl?: string, status?: "DRAFT"|"REVIEW"|"PUBLISHED"|"ARCHIVED" }
export async function POST(req: NextRequest) {
  const auth = await getApiAuthContext(req);
  const hasEditorRole = hasAnyRole(auth.role, RBAC_ROLE_GROUPS.editorial);

  if (!auth.token || !hasEditorRole || !auth.userId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as
    | {
        title?: string;
        content?: string;
        excerpt?: string;
        coverUrl?: string;
        status?: string;
      }
    | null;

  if (!body?.title?.trim() || !body?.content?.trim()) {
    return NextResponse.json(
      { message: "title and content are required" },
      { status: 400 }
    );
  }

  const base = slugify(body.title);
  const slug = await generateUniqueSlug(base);
  const status = normalizeArticleStatus(body.status) ?? "DRAFT";
  if (body.status !== undefined && !normalizeArticleStatus(body.status)) {
    return NextResponse.json({ message: "Invalid article status" }, { status: 400 });
  }
  if (!canSetCreateStatus(status, auth.role)) {
    return NextResponse.json(
      { message: "Insufficient permissions for requested article status" },
      { status: 403 },
    );
  }

  const sanitizedContent = sanitizeArticleHtml(body.content);
  if (!sanitizedContent.trim()) {
    return NextResponse.json(
      { message: "Article content is empty after sanitization" },
      { status: 400 },
    );
  }

  const article = await prisma.article.create({
    data: {
      title: body.title.trim(),
      content: sanitizedContent,
      excerpt: body.excerpt ?? null,
      coverUrl: body.coverUrl ?? null,
      status,
      slug,
      authorId: auth.userId,
      publishedAt: status === "PUBLISHED" ? new Date() : null,
    },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      publishedAt: true,
    },
  });

  return NextResponse.json(article, { status: 201 });
}
