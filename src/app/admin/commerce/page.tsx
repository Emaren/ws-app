import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { hasAnyRole, RBAC_ROLE_GROUPS } from "@/lib/rbac";
import FulfillmentConsole from "../business/FulfillmentConsole";
import { resolveE2EAdminOverride } from "../resolveE2EAdminOverride";
import AdminCommerceConsole from "./AdminCommerceConsole";
import FulfillmentAutomationCenter from "./FulfillmentAutomationCenter";

export const dynamic = "force-dynamic";

export default async function AdminCommercePage() {
  const e2eOverride = await resolveE2EAdminOverride();
  if (e2eOverride && hasAnyRole(e2eOverride.role, RBAC_ROLE_GROUPS.staff)) {
    return (
      <div className="space-y-4">
        <AdminCommerceConsole />
        <FulfillmentConsole
          title="Commerce Fulfillment Board"
          summary="Turn store performance into action. Claim owners, set due targets, triage unassigned and overdue delivery leads, and communicate with customers from the commerce admin surface."
        />
        <FulfillmentAutomationCenter />
      </div>
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  if (!hasAnyRole(session.user.role, RBAC_ROLE_GROUPS.staff)) {
    redirect("/admin");
  }

  return (
    <div className="space-y-4">
      <AdminCommerceConsole />
      <FulfillmentConsole
        title="Commerce Fulfillment Board"
        summary="Turn store performance into action. Claim owners, set due targets, triage unassigned and overdue delivery leads, and communicate with customers from the commerce admin surface."
      />
      <FulfillmentAutomationCenter />
    </div>
  );
}
