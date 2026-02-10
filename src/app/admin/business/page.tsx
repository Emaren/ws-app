import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { isStaffRole, normalizeAppRole } from "@/lib/rbac";
import BusinessTerminalClient from "./BusinessTerminalClient";

export const dynamic = "force-dynamic";

export default async function BusinessTerminalPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  const role = normalizeAppRole(session.user.role);
  if (!isStaffRole(role)) {
    redirect("/admin");
  }

  return <BusinessTerminalClient />;
}

