import NextAuth, { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    error?: string;
    wsApi?: {
      sessionId: string | null;
      expiresAt: string | null;
      syncedAt: string;
    };
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    role: string;
    wsApiAccessToken?: string;
    wsApiSessionId?: string;
    wsApiSessionExpiresAt?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    wsApiAccessToken?: string;
    wsApiSessionId?: string;
    wsApiSessionExpiresAt?: string;
    wsApiNextCheckAt?: number;
    wsApiError?: string;
  }
}
