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
  const { slug } = await params;
  const body = await req.json().catch(() => ({}));

  // ---- Public reaction endpoint (no auth) ----
  if (body?.op === "react") {
    const type = body?.type as "LIKE" | "WOW" | "HMM";
    if (!["LIKE", "WOW", "HMM"].includes(type)) {
      return new NextResponse("Invalid reaction type", { status: 400 });
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
  const session = await getServerSession(authOptions);
  // @ts-ignore
  const role = session?.user?.role as "ADMIN" | "CONTRIBUTOR" | undefined;
  if (!session?.user || !role) return forbidden();

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

  const publishPatch =
    status === "PUBLISHED"
      ? { status: "PUBLISHED" as const, publishedAt: new Date() }
      : status === "DRAFT"
      ? { status: "DRAFT" as const, publishedAt: null }
      : {};

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
