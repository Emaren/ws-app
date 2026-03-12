import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import AdminShell from "@/components/admin/AdminShell";
import { authOptions } from "@/lib/authOptions";
import { isEditorialRole, normalizeAppRole } from "@/lib/rbac";
import { resolveE2EAdminOverride } from "./resolveE2EAdminOverride";

export const metadata: Metadata = {
  title: "Small Business Admin | Wheat & Stone",
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const e2eOverride = await resolveE2EAdminOverride();
  if (e2eOverride) {
    return (
      <AdminShell role={e2eOverride.role} email={e2eOverride.email}>
        {children}
      </AdminShell>
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  const role = normalizeAppRole(session.user.role);
  if (!role || !isEditorialRole(role)) {
    redirect("/");
  }

  return (
    <AdminShell role={role} email={session.user.email}>
      {children}
    </AdminShell>
  );
}
