import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import AdminUsersControlTower from "./AdminUsersControlTower";
import { authOptions } from "@/lib/authOptions";
import { hasAnyRole, RBAC_ROLE_GROUPS } from "@/lib/rbac";
import { resolveE2EAdminOverride } from "../resolveE2EAdminOverride";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const e2eOverride = await resolveE2EAdminOverride();
  if (e2eOverride && hasAnyRole(e2eOverride.role, RBAC_ROLE_GROUPS.ownerAdmin)) {
    return <AdminUsersControlTower />;
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  if (!hasAnyRole(session.user.role, RBAC_ROLE_GROUPS.ownerAdmin)) {
    redirect("/admin");
  }

  return <AdminUsersControlTower />;
}
