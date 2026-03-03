import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { hasAnyRole, RBAC_ROLE_GROUPS } from "@/lib/rbac";
import AdminOffersConsole from "./AdminOffersConsole";

export const dynamic = "force-dynamic";

export default async function AdminOffersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  if (!hasAnyRole(session.user.role, RBAC_ROLE_GROUPS.staff)) {
    redirect("/admin");
  }

  return <AdminOffersConsole />;
}
