// src/app/drafts/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { isEditorialRole, normalizeAppRole } from "@/lib/rbac";

export default async function DraftsPage() {
  const session = await getServerSession(authOptions);

  const role = normalizeAppRole(session?.user?.role);
  if (!session || !isEditorialRole(role)) {
    return <div className="text-center mt-20 text-xl">Access Denied</div>;
  }

  const drafts = await prisma.article.findMany({
    where: {
      author: { email: session.user?.email || undefined },
      publishedAt: { equals: null as any }, // ✅ null must be explicitly cast
    },
    orderBy: {
      publishedAt: "desc",
    },
  });

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-semibold mb-6">Your Drafts</h1>

      {drafts.length === 0 ? (
        <p className="text-gray-500">No drafts yet.</p>
      ) : (
        <ul className="space-y-4">
          {drafts.map((draft) => (
            <li
              key={draft.id}
              className="border rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <div className="font-bold">{draft.title || "Untitled"}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Created:{" "}
                {draft.publishedAt
                  ? new Date(draft.publishedAt).toLocaleDateString()
                  : "Draft"}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
