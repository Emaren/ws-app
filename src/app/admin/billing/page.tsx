import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { hasAnyRole, RBAC_ROLE_GROUPS, roleDisplay } from "@/lib/rbac";
import BillingReconciliationClient from "./BillingReconciliationClient";

export const dynamic = "force-dynamic";

export default async function BillingReconciliationPage() {
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
        <h2 className="text-xl font-semibold md:text-2xl">Billing Reconciliation</h2>
        <p className="mt-1 text-sm opacity-80">
          Compare local entitlement state with Stripe and resolve mismatches.
        </p>
        <p className="mt-2 text-xs uppercase tracking-[0.14em] opacity-60">
          Current role: {roleDisplay(session.user.role)}
        </p>
      </div>

      <BillingReconciliationClient />
    </section>
  );
}
