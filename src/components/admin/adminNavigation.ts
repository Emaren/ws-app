import {
  RBAC_ROLE_GROUPS,
  type AppRole,
  normalizeAppRole,
} from "@/lib/rbac";

export type AdminNavItem = {
  href: string;
  label: string;
  summary: string;
  roles: readonly AppRole[];
};

const ADMIN_NAV_ITEMS: readonly AdminNavItem[] = [
  {
    href: "/admin",
    label: "Dashboard",
    summary: "Operational overview",
    roles: RBAC_ROLE_GROUPS.editorial,
  },
  {
    href: "/admin/new",
    label: "New Article",
    summary: "Create fresh review content",
    roles: RBAC_ROLE_GROUPS.editorial,
  },
  {
    href: "/drafts",
    label: "Draft Queue",
    summary: "Contributor draft pipeline",
    roles: RBAC_ROLE_GROUPS.editorial,
  },
  {
    href: "/admin/business",
    label: "Business Terminal",
    summary: "Store inventory and campaigns",
    roles: RBAC_ROLE_GROUPS.staff,
  },
  {
    href: "/admin/access",
    label: "Access Control",
    summary: "Role and account governance",
    roles: RBAC_ROLE_GROUPS.ownerAdmin,
  },
  {
    href: "/admin/billing",
    label: "Billing Integrity",
    summary: "Stripe reconciliation + mismatch repair",
    roles: RBAC_ROLE_GROUPS.ownerAdmin,
  },
  {
    href: "/admin/rewards",
    label: "Rewards Ledger",
    summary: "Off-chain accrual reporting + export pipeline",
    roles: RBAC_ROLE_GROUPS.ownerAdmin,
  },
];

export function getRoleAwareAdminNavigation(
  roleInput: string | null | undefined,
): AdminNavItem[] {
  const role = normalizeAppRole(roleInput);
  if (!role) {
    return [];
  }

  return ADMIN_NAV_ITEMS.filter((item) => item.roles.includes(role));
}
