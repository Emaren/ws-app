import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { normalizeAppRole } from "@/lib/rbac";
import {
  WsApiHttpError,
  wsApiGetSession,
  wsApiLogin,
  wsApiLogout,
  wsApiRegister,
} from "@/lib/wsApiAuth";

const SESSION_SYNC_INTERVAL_MS = 60_000;
const SESSION_RETRY_INTERVAL_MS = 15_000;
const BCRYPT_HASH_PREFIX = /^\$2[aby]\$/;

async function tryLocalPrismaFallback(
  emailInput: string,
  passwordInput: string,
): Promise<{
  id: string;
  email: string;
  name: string;
  role: string;
  wsApiAccessToken?: string;
  wsApiSessionId?: string;
  wsApiSessionExpiresAt?: string;
} | null> {
  const email = emailInput.trim().toLowerCase();
  const password = passwordInput;
  if (!email || !password) {
    return null;
  }

  const localUser = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      password: true,
    },
  });

  if (!localUser) {
    return null;
  }

  const storedPassword = localUser.password ?? "";
  let valid = false;
  let shouldUpgradeHash = false;

  if (BCRYPT_HASH_PREFIX.test(storedPassword)) {
    valid = await bcrypt.compare(password, storedPassword);
  } else if (storedPassword.length > 0) {
    valid = storedPassword === password;
    shouldUpgradeHash = valid;
  }

  if (!valid) {
    return null;
  }

  if (shouldUpgradeHash) {
    const upgradedHash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: localUser.id },
      data: { password: upgradedHash },
    });
  }

  const normalizedRole = normalizeAppRole(localUser.role) ?? "USER";

  try {
    try {
      await wsApiRegister(email, password, localUser.name);
    } catch (error) {
      if (!(error instanceof WsApiHttpError && error.statusCode === 409)) {
        throw error;
      }
    }

    const wsApiLoginResult = await wsApiLogin(email, password);
    return {
      id: wsApiLoginResult.user.id,
      email: wsApiLoginResult.user.email,
      name: wsApiLoginResult.user.name,
      role: normalizeAppRole(wsApiLoginResult.user.role) ?? normalizedRole,
      wsApiAccessToken: wsApiLoginResult.accessToken,
      wsApiSessionId: wsApiLoginResult.session.id,
      wsApiSessionExpiresAt: wsApiLoginResult.session.expiresAt,
    };
  } catch (error) {
    console.warn("auth prisma fallback using local-only session", error);
    return {
      id: localUser.id,
      email: localUser.email,
      name: localUser.name,
      role: normalizedRole,
    };
  }
}

function clearJwtAuthState(token: Record<string, unknown>): void {
  delete token.id;
  delete token.role;
  delete token.email;
  delete token.name;
  delete token.wsApiAccessToken;
  delete token.wsApiSessionId;
  delete token.wsApiSessionExpiresAt;
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const login = await wsApiLogin(credentials.email, credentials.password);
          const normalizedRole = normalizeAppRole(login.user.role) ?? "USER";
          return {
            id: login.user.id,
            email: login.user.email,
            name: login.user.name,
            role: normalizedRole,
            wsApiAccessToken: login.accessToken,
            wsApiSessionId: login.session.id,
            wsApiSessionExpiresAt: login.session.expiresAt,
          };
        } catch (error) {
          const fallback = await tryLocalPrismaFallback(
            credentials.email,
            credentials.password,
          );
          if (fallback) {
            return fallback;
          }

          if (error instanceof WsApiHttpError && error.statusCode === 401) {
            return null;
          }

          console.error("auth authorize failed", error);
          return null;
        }
      },
    }),
  ],

  pages: {
    signIn: "/login",
  },

  callbacks: {
    async jwt({ token, user }) {
      const now = Date.now();

      if (user) {
        const normalizedRole = normalizeAppRole(user.role) ?? "USER";
        token.id = user.id;
        token.role = normalizedRole;
        token.email = user.email;
        token.name = user.name;
        token.wsApiAccessToken = user.wsApiAccessToken;
        token.wsApiSessionId = user.wsApiSessionId;
        token.wsApiSessionExpiresAt = user.wsApiSessionExpiresAt;
        token.wsApiNextCheckAt = now + SESSION_SYNC_INTERVAL_MS;
        delete token.wsApiError;
        return token;
      }

      const accessToken =
        typeof token.wsApiAccessToken === "string" ? token.wsApiAccessToken : "";
      if (!accessToken) {
        return token;
      }

      const nextCheckAt =
        typeof token.wsApiNextCheckAt === "number" ? token.wsApiNextCheckAt : 0;
      if (now < nextCheckAt) {
        return token;
      }

      try {
        const remoteSession = await wsApiGetSession(accessToken);
        if (!remoteSession) {
          clearJwtAuthState(token);
          token.wsApiError = "session_expired";
          token.wsApiNextCheckAt = now + SESSION_RETRY_INTERVAL_MS;
          return token;
        }

        token.id = remoteSession.user.id;
        token.role = normalizeAppRole(remoteSession.user.role) ?? "USER";
        token.email = remoteSession.user.email;
        token.name = remoteSession.user.name;
        token.wsApiSessionId = remoteSession.session.id;
        token.wsApiSessionExpiresAt = remoteSession.session.expiresAt;
        token.wsApiNextCheckAt = now + SESSION_SYNC_INTERVAL_MS;
        delete token.wsApiError;
      } catch (error) {
        console.error("auth session sync failed", error);
        token.wsApiError = "sync_failed";
        token.wsApiNextCheckAt = now + SESSION_RETRY_INTERVAL_MS;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.id === "string" ? token.id : "";
        session.user.role = typeof token.role === "string" ? token.role : "";
        session.user.email = typeof token.email === "string" ? token.email : null;
        session.user.name = typeof token.name === "string" ? token.name : null;
        session.wsApi = {
          sessionId:
            typeof token.wsApiSessionId === "string" ? token.wsApiSessionId : null,
          expiresAt:
            typeof token.wsApiSessionExpiresAt === "string"
              ? token.wsApiSessionExpiresAt
              : null,
          syncedAt: new Date().toISOString(),
        };
      }

      if (typeof token.wsApiError === "string") {
        session.error = token.wsApiError;
      }

      return session;
    },
  },

  events: {
    async signOut({ token }) {
      const accessToken =
        token && typeof token.wsApiAccessToken === "string"
          ? token.wsApiAccessToken
          : "";

      if (!accessToken) {
        return;
      }

      try {
        await wsApiLogout(accessToken);
      } catch (error) {
        console.warn("auth signOut sync failed", error);
      }
    },
  },
};
