// src/app/admin/edit/[slug]/page.tsx
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { isEditorialRole, normalizeAppRole } from "@/lib/rbac";
import { canEditArticleContent, normalizeArticleStatus } from "@/lib/articleLifecycle";
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
      authorId: true,
      reviewProfile: {
        select: {
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
        orderBy: [{ placement: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          placement: true,
          sortOrder: true,
          businessId: true,
          businessSlug: true,
          businessName: true,
          offerId: true,
          offerTitle: true,
          inventoryItemId: true,
          inventoryItemName: true,
          title: true,
          badgeText: true,
          body: true,
          imageSrc: true,
          imageAlt: true,
          caption: true,
          side: true,
          sizePreset: true,
          isEnabled: true,
        },
      },
    },
  });

  if (!article) notFound();

  const lifecycleStatus = normalizeArticleStatus(article.status) ?? "DRAFT";
  const isOwner = article.authorId === session.user.id;
  if (!canEditArticleContent(lifecycleStatus, role, isOwner)) {
    notFound();
  }

  // Convert Date -> string for client component
  const uiArticle = {
    ...article,
    publishedAt: article.publishedAt ? article.publishedAt.toISOString() : null,
  };

  return (
    <section className="space-y-4">
      <div className="admin-card p-4 md:p-6">
        <h2 className="text-xl font-semibold md:text-2xl">Edit Article</h2>
        <p className="mt-1 text-sm opacity-75">
          Update content, lifecycle status, publishing metadata, and structured review data.
        </p>
      </div>
      <Editor initialArticle={uiArticle} />
    </section>
  );
}
