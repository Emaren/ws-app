// src/app/admin/edit/[slug]/page.tsx
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { isEditorialRole, normalizeAppRole } from "@/lib/rbac";
import { notFound, redirect } from "next/navigation";
import Editor from "./Editor";

// Avoid prerendering this admin page at build time
export const dynamic = "force-dynamic";

export default async function EditArticlePage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = normalizeAppRole(session.user.role);
  if (!isEditorialRole(role)) redirect("/");

  const article = await prisma.article.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      coverUrl: true,
      content: true,
      status: true,
      publishedAt: true, // Date | null
    },
  });

  if (!article) notFound();

  // Convert Date -> string for client component
  const uiArticle = {
    ...article,
    publishedAt: article.publishedAt ? article.publishedAt.toISOString() : null,
  };

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-semibold mb-4">Edit Article</h1>
        <Editor initialArticle={uiArticle} />
      </div>
    </main>
  );
}
