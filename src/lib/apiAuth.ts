import type { NextRequest } from "next/server";
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
  const authHeader = req.headers.get("authorization");
  const cookieHeader = req.headers.get("cookie") ?? "";
  const hasSessionCookie =
    /(?:^|;\s*)(?:__Secure-)?next-auth\.session-token=/.test(cookieHeader) ||
    /(?:^|;\s*)(?:__Secure-)?authjs\.session-token=/.test(cookieHeader);

  let token: JWT | null = null;
  if (authHeader || hasSessionCookie) {
    try {
      const { getToken } = await import("next-auth/jwt");
      token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
      });
    } catch {
      token = null;
    }
  }

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
