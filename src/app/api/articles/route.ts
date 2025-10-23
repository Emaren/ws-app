// src/app/api/articles/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

// GET /api/articles -> latest published articles
export async function GET() {
  const articles = await prisma.article.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      coverUrl: true,
      publishedAt: true,
      status: true,
    },
  });

  return NextResponse.json(articles);
}

// POST /api/articles
// Body: { title: string, content: string, excerpt?: string, coverUrl?: string, status?: "DRAFT"|"PUBLISHED" }
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | {
        title?: string;
        content?: string;
        excerpt?: string;
        coverUrl?: string;
        status?: "DRAFT" | "PUBLISHED";
      }
    | null;

  if (!body?.title || !body?.content) {
    return NextResponse.json(
      { message: "title and content are required" },
      { status: 400 }
    );
  }

  const base = slugify(body.title);
  const slug = await generateUniqueSlug(base);
  const status = body.status ?? "DRAFT";

  const article = await prisma.article.create({
    data: {
      title: body.title,
      content: body.content,
      excerpt: body.excerpt ?? null,
      coverUrl: body.coverUrl ?? null,
      status,
      slug,
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
