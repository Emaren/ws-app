import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";
import { normalizeAppRole, roleBadgePrefix } from "@/lib/rbac";
import SignOutButton from "./SignOutButton";

function roleLandingPath(roleInput: string | null | undefined): string {
  const role = normalizeAppRole(roleInput);
  if (role === "CONTRIBUTOR") {
    return "/admin/new";
  }

  if (role === "OWNER" || role === "ADMIN" || role === "EDITOR") {
    return "/admin";
  }

  return "/";
}

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login?callbackUrl=/account");
  }

  const roleLabel = roleBadgePrefix(session.user.role) || "👤 User";
  const primaryPath = roleLandingPath(session.user.role);
  const primaryLabel = primaryPath === "/admin/new" ? "New Article" : primaryPath === "/admin" ? "Admin" : "Home";

  return (
    <main className="ws-container py-8 md:py-10">
      <section className="ws-article rounded-2xl border border-black/10 dark:border-white/15 bg-black/[0.03] dark:bg-white/[0.04] p-5 md:p-6 space-y-4">
        <header>
          <p className="text-xs uppercase tracking-[0.24em] opacity-65">Account</p>
          <h1 className="text-2xl md:text-3xl font-semibold mt-1">Settings & Profile</h1>
        </header>

        <dl className="space-y-2 text-sm md:text-base">
          <div className="flex items-center justify-between gap-4">
            <dt className="opacity-70">Role</dt>
            <dd className="font-medium text-right">{roleLabel}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="opacity-70">Email</dt>
            <dd className="font-medium text-right">{session.user.email ?? "-"}</dd>
          </div>
        </dl>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link
            href={primaryPath}
            className="inline-flex items-center rounded-lg border border-black/15 dark:border-white/20 px-3 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"
          >
            Open {primaryLabel}
          </Link>
          <SignOutButton />
        </div>
      </section>
    </main>
  );
}
