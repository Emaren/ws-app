import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { isStaffRole, normalizeAppRole, roleDisplay } from "@/lib/rbac";

const TERMINAL_MODULES = [
  {
    title: "Inventory",
    summary: "Track stock, expiry pressure, and dynamic markdown windows.",
    endpoint: "GET /ops/inventory-items",
  },
  {
    title: "Pricing Rules",
    summary: "Configure fixed, amount, and percentage rule stacks.",
    endpoint: "GET /ops/pricing-rules",
  },
  {
    title: "Offers and Campaigns",
    summary: "Coordinate local ad pushes, featured deals, and geofenced drops.",
    endpoint: "GET /ops/offers + /ops/campaigns",
  },
  {
    title: "Delivery and Notifications",
    summary: "Manage delivery leads and recipient outreach channels.",
    endpoint: "GET /ops/delivery-leads + /ops/notification-recipients",
  },
  {
    title: "Affiliate and Rewards",
    summary: "Measure monetization clicks and WHEAT/STONE ledger activity.",
    endpoint: "GET /ops/affiliate-clicks + /ops/reward-ledger",
  },
];

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

  return (
    <section className="space-y-4">
      <div className="admin-card p-4 md:p-6">
        <h2 className="text-xl font-semibold md:text-2xl">Business Terminal</h2>
        <p className="mt-1 text-sm opacity-75">
          Staff workspace for store operations and monetization systems.
        </p>
        <p className="mt-2 text-xs uppercase tracking-[0.14em] opacity-60">
          Access level: {roleDisplay(role)}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {TERMINAL_MODULES.map((module) => (
          <article key={module.title} className="admin-card p-4 md:p-5">
            <h3 className="text-base font-semibold">{module.title}</h3>
            <p className="mt-1 text-sm opacity-80">{module.summary}</p>
            <p className="mt-3 text-xs opacity-65">{module.endpoint}</p>
          </article>
        ))}
      </div>

      <div className="admin-card p-4 md:p-5">
        <h3 className="text-base font-semibold">Execution Links</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/admin"
            className="rounded-xl border px-3 py-2 text-sm transition hover:bg-white/5"
          >
            Open Dashboard
          </Link>
          <Link
            href="/admin/new"
            className="rounded-xl border px-3 py-2 text-sm transition hover:bg-white/5"
          >
            Create Campaign Article
          </Link>
        </div>
      </div>
    </section>
  );
}

