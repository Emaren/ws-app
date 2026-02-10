"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { roleDisplay, type AppRole } from "@/lib/rbac";
import { getRoleAwareAdminNavigation } from "./adminNavigation";

type AdminShellProps = {
  role: AppRole;
  email: string | null | undefined;
  children: ReactNode;
};

function isActivePath(pathname: string | null, href: string): boolean {
  if (!pathname) {
    return false;
  }

  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminShell({ role, email, children }: AdminShellProps) {
  const pathname = usePathname();
  const navItems = getRoleAwareAdminNavigation(role);
  const roleLabel = roleDisplay(role);

  return (
    <div className="ws-container py-4 md:py-6">
      <div className="admin-card p-4 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] opacity-70">
              Wheat & Stone
            </p>
            <h1 className="text-xl font-semibold md:text-2xl">
              Small Business Admin
            </h1>
            <p className="text-sm opacity-80">
              Signed in as {roleLabel}
              {email ? ` - ${email}` : ""}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs md:w-[360px]">
            <div className="admin-surface rounded-xl px-3 py-2">
              <p className="opacity-70">Priority</p>
              <p className="font-medium">Mobile-first execution</p>
            </div>
            <div className="admin-surface rounded-xl px-3 py-2">
              <p className="opacity-70">Mode</p>
              <p className="font-medium">Operational shell</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:mt-5 md:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="admin-card p-2 md:p-3">
          <div className="flex gap-2 overflow-x-auto pb-1 md:block md:space-y-2 md:overflow-visible">
            {navItems.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`min-w-[180px] rounded-xl border px-3 py-2 text-sm transition md:block md:min-w-0 ${
                    active
                      ? "border-amber-400/70 bg-amber-400/15"
                      : "border-white/10 hover:border-amber-300/40 hover:bg-white/5"
                  }`}
                >
                  <p className="font-medium">{item.label}</p>
                  <p className="mt-0.5 text-xs opacity-70">{item.summary}</p>
                </Link>
              );
            })}
          </div>
        </aside>

        <div className="space-y-4 md:space-y-5">{children}</div>
      </div>
    </div>
  );
}
