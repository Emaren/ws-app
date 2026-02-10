// src/app/drafts/page.tsx
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { isEditorialRole, normalizeAppRole } from "@/lib/rbac";
import { statusBadgeLabel } from "@/lib/articleLifecycle";

export default async function DraftsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const role = normalizeAppRole(session?.user?.role);
  if (!role || !isEditorialRole(role)) {
    redirect("/");
  }

  const drafts = await prisma.article.findMany({
    where: {
      authorId: session.user.id || "__no-user__",
      status: { in: ["DRAFT", "REVIEW"] },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return (
    <AdminShell role={role} email={session.user.email}>
      <section className="space-y-4">
        <div className="admin-card p-4 md:p-6">
          <h2 className="text-xl font-semibold md:text-2xl">Draft Queue</h2>
          <p className="mt-1 text-sm opacity-75">
            Track and continue your drafts and review submissions.
          </p>
        </div>

        <div className="admin-card p-4 md:p-6">
          {drafts.length === 0 ? (
            <p className="text-sm opacity-70">No drafts yet.</p>
          ) : (
            <ul className="space-y-3">
              {drafts.map((draft) => (
                <li key={draft.id}>
                  <Link
                    href={`/admin/edit/${draft.slug}`}
                    className="admin-surface block rounded-xl p-4 transition hover:border-amber-300/40 hover:bg-white/5"
                  >
                    <p className="font-semibold">{draft.title || "Untitled"}</p>
                    <div className="mt-1 flex items-center gap-2 text-sm opacity-75">
                      <span>{statusBadgeLabel(draft.status)}</span>
                      <span>·</span>
                      <span>
                        Updated {new Date(draft.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </AdminShell>
  );
}
