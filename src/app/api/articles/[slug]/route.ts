// src/app/api/articles/[slug]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

function forbidden() {
  return new NextResponse("Forbidden", { status: 403 });
}
function notFound() {
  return new NextResponse("Not found", { status: 404 });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const article = await prisma.article.findUnique({ where: { slug } });
  if (!article) return notFound();
  return NextResponse.json(article);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  const role = session?.user?.role as "ADMIN" | "CONTRIBUTOR" | undefined;
  if (!session?.user || !role) return forbidden();

  const { slug } = await params;
  const body = await req.json();

  // Pull fields we allow updating
  const {
    title,
    slug: nextSlug,
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

  // If setting PUBLISHED, set publishedAt now; if DRAFT, clear it.
  const publishPatch =
    status === "PUBLISHED"
      ? { status: "PUBLISHED" as const, publishedAt: new Date() }
      : status === "DRAFT"
      ? { status: "DRAFT" as const, publishedAt: null }
      : {};

  // If slug changes, ensure it’s unique
  if (nextSlug && nextSlug !== slug) {
    const exists = await prisma.article.findUnique({ where: { slug: nextSlug } });
    if (exists) return new NextResponse("Slug already in use", { status: 409 });
  }

  const updated = await prisma.article.update({
    where: { slug },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(excerpt !== undefined ? { excerpt } : {}),
      ...(coverUrl !== undefined ? { coverUrl } : {}),
      ...(content !== undefined ? { content } : {}),
      ...(nextSlug ? { slug: nextSlug } : {}),
      ...publishPatch,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  const role = session?.user?.role as "ADMIN" | "CONTRIBUTOR" | undefined;
  if (!session?.user || !role) return forbidden();

  const { slug } = await params;

  try {
    await prisma.article.delete({ where: { slug } });
  } catch {
    return notFound();
  }

  return new NextResponse(null, { status: 204 });
}
