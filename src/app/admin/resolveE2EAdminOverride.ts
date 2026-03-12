import { cookies } from "next/headers";
import { isEditorialRole, normalizeAppRole, type AppRole } from "@/lib/rbac";

export async function resolveE2EAdminOverride(): Promise<{
  role: AppRole;
  email: string;
} | null> {
  if (process.env.WS_E2E_SMOKE_AUTH !== "enabled") {
    return null;
  }

  const cookieStore = await cookies();
  const role = normalizeAppRole(cookieStore.get("ws-e2e-role")?.value);
  const email = cookieStore.get("ws-e2e-email")?.value?.trim();

  if (!role || !email || !isEditorialRole(role)) {
    return null;
  }

  return {
    role,
    email,
  };
}
