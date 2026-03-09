import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import AdminExperienceStudio from "./AdminExperienceStudio";
import { authOptions } from "@/lib/authOptions";
import { hasAnyRole, RBAC_ROLE_GROUPS } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function AdminExperiencePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  if (!hasAnyRole(session.user.role, RBAC_ROLE_GROUPS.ownerAdmin)) {
    redirect("/admin");
  }

  return <AdminExperienceStudio />;
}
