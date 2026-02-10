import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import type { JWT } from "next-auth/jwt";
import type { AppRole } from "@/lib/rbac";
import { normalizeAppRole } from "@/lib/rbac";

export interface ApiAuthContext {
  token: JWT | null;
  role: AppRole | undefined;
  userId: string | undefined;
  email: string | undefined;
}

export async function getApiAuthContext(req: NextRequest): Promise<ApiAuthContext> {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const rawRole = token && typeof token.role === "string" ? token.role : undefined;
  const role = normalizeAppRole(rawRole);
  const userId = token && typeof token.id === "string" ? token.id : undefined;
  const email = token && typeof token.email === "string" ? token.email : undefined;

  return {
    token,
    role,
    userId,
    email,
  };
}
