import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { hasAnyRole, RBAC_ROLE_GROUPS, roleDisplay } from "@/lib/rbac";
import DataExplorerClient from "./DataExplorerClient";

export const dynamic = "force-dynamic";

export default async function AdminDataPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  if (!hasAnyRole(session.user.role, RBAC_ROLE_GROUPS.ownerAdmin)) {
    redirect("/admin");
  }

  return (
    <section className="space-y-4">
      <div className="admin-card p-4 md:p-6">
        <h2 className="text-xl font-semibold md:text-2xl">Data Explorer</h2>
        <p className="mt-1 text-sm opacity-80">
          Browse production data with filters and pagination without opening Prisma Studio.
        </p>
        <p className="mt-2 text-xs uppercase tracking-[0.14em] opacity-60">
          Current role: {roleDisplay(session.user.role)}
        </p>
      </div>

      <DataExplorerClient />
    </section>
  );
}

