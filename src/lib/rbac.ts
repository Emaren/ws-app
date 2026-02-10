export type AppRole = "OWNER" | "ADMIN" | "EDITOR" | "CONTRIBUTOR" | "USER";

const LEGACY_ROLE_ALIASES: Record<string, AppRole> = {
  STONEHOLDER: "USER",
};

export const RBAC_ROLE_ORDER = [
  "USER",
  "CONTRIBUTOR",
  "EDITOR",
  "ADMIN",
  "OWNER",
] as const satisfies ReadonlyArray<AppRole>;

export const RBAC_ROLE_GROUPS = {
  authenticated: ["OWNER", "ADMIN", "EDITOR", "CONTRIBUTOR", "USER"] as const,
  editorial: ["OWNER", "ADMIN", "EDITOR", "CONTRIBUTOR"] as const,
  staff: ["OWNER", "ADMIN", "EDITOR"] as const,
  ownerAdmin: ["OWNER", "ADMIN"] as const,
} as const;

export function normalizeAppRole(input: string | null | undefined): AppRole | undefined {
  if (!input) {
    return undefined;
  }

  const upper = input.trim().toUpperCase();
  if (!upper) {
    return undefined;
  }

  const mapped = LEGACY_ROLE_ALIASES[upper] ?? upper;
  if (RBAC_ROLE_ORDER.includes(mapped as AppRole)) {
    return mapped as AppRole;
  }

  return undefined;
}

export function hasAnyRole(
  roleInput: string | null | undefined,
  allowedRoles: readonly AppRole[],
): boolean {
  const normalized = normalizeAppRole(roleInput);
  if (!normalized) {
    return false;
  }

  return allowedRoles.includes(normalized);
}

export function isEditorialRole(roleInput: string | null | undefined): boolean {
  return hasAnyRole(roleInput, RBAC_ROLE_GROUPS.editorial);
}

export function isStaffRole(roleInput: string | null | undefined): boolean {
  return hasAnyRole(roleInput, RBAC_ROLE_GROUPS.staff);
}

export function roleDisplay(roleInput: string | null | undefined): string {
  const role = normalizeAppRole(roleInput);
  if (!role) {
    return "Visitor";
  }

  if (role === "OWNER") return "Owner";
  if (role === "ADMIN") return "Admin";
  if (role === "EDITOR") return "Editor";
  if (role === "CONTRIBUTOR") return "Contributor";
  return "User";
}

export function roleBadgePrefix(roleInput: string | null | undefined): string {
  const role = normalizeAppRole(roleInput);
  if (!role) {
    return "";
  }

  if (role === "OWNER") return "👑 Owner";
  if (role === "ADMIN") return "🛡️ Admin";
  if (role === "EDITOR") return "📝 Editor";
  if (role === "CONTRIBUTOR") return "✍️ Contributor";
  return "👤 User";
}
