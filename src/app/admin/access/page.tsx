import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { RBAC_ROLE_GROUPS, hasAnyRole, roleDisplay } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const ACCESS_POLICIES = [
  {
    role: "Owner/Admin",
    scope: "Role governance, business administration, billing authority",
  },
  {
    role: "Editor",
    scope: "Article lifecycle, inventory publishing, campaign operations",
  },
  {
    role: "Contributor",
    scope: "Owned article drafting and review-stage editing",
  },
  {
    role: "User",
    scope: "Public browsing, account participation, rewards consumption",
  },
];

export default async function AccessControlPage() {
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
        <h2 className="text-xl font-semibold md:text-2xl">Access Control</h2>
        <p className="mt-1 text-sm opacity-75">
          Permission model reference for Small Business Admin operations.
        </p>
        <p className="mt-2 text-xs uppercase tracking-[0.14em] opacity-60">
          Current role: {roleDisplay(session.user.role)}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {ACCESS_POLICIES.map((policy) => (
          <article key={policy.role} className="admin-card p-4 md:p-5">
            <h3 className="text-base font-semibold">{policy.role}</h3>
            <p className="mt-1 text-sm opacity-80">{policy.scope}</p>
          </article>
        ))}
      </div>

      <div className="admin-card p-4 md:p-5">
        <h3 className="text-base font-semibold">Operational Notes</h3>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm opacity-85">
          <li>Role updates are enforced through ws-api user endpoints.</li>
          <li>Admin navigation is filtered by the normalized role model.</li>
          <li>Restricted routes redirect to /admin for non-authorized staff.</li>
        </ul>
      </div>
    </section>
  );
}

