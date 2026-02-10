import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { hasAnyRole, RBAC_ROLE_GROUPS, roleDisplay } from "@/lib/rbac";
import RewardsOpsClient from "./RewardsOpsClient";

export const dynamic = "force-dynamic";

export default async function RewardsOpsPage() {
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
        <h2 className="text-xl font-semibold md:text-2xl">Rewards Ledger Ops</h2>
        <p className="mt-1 text-sm opacity-80">
          Off-chain $WHEAT/$STONE accrual controls, anti-abuse visibility, and payout export workflow.
        </p>
        <p className="mt-2 text-xs uppercase tracking-[0.14em] opacity-60">
          Current role: {roleDisplay(session.user.role)}
        </p>
      </div>

      <RewardsOpsClient />
    </section>
  );
}
