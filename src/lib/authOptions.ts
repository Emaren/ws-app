import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import FacebookProvider from "next-auth/providers/facebook";
import AzureADProvider from "next-auth/providers/azure-ad";
import GitHubProvider from "next-auth/providers/github";
import bcrypt from "bcrypt";
import { createHash, randomUUID } from "node:crypto";
import { AuthProvider, AuthRegistrationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeAuthProvider, recordAuthRegistrationEvent } from "@/lib/authTelemetry";
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
const LOCAL_AUTH_PASSWORD_SALT_ROUNDS = 10;

type LocalAuthSyncResult = {
  id: string;
  email: string;
  name: string;
  role: string;
  created: boolean;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function userNameFromEmail(email: string): string {
  return email.split("@")[0] || "user";
}

function bridgePasswordForOAuth(email: string): string {
  const secretSeed =
    process.env.NEXTAUTH_SECRET?.trim() || "wheatandstone-oauth-bridge";
  const digest = createHash("sha256")
    .update(`${secretSeed}:${normalizeEmail(email)}`)
    .digest("hex");
  return `oauth:${digest}`;
}

function oauthProviderFromId(providerId: string | undefined): AuthProvider {
  return normalizeAuthProvider(providerId);
}

function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

async function syncLocalUserRecord(input: {
  email: string;
  name?: string | null;
  role?: string | null;
  password?: string;
  method: AuthProvider;
}): Promise<LocalAuthSyncResult> {
  const email = normalizeEmail(input.email);
  const derivedName = input.name?.trim() || userNameFromEmail(email);
  const normalizedRole = normalizeAppRole(input.role) ?? "USER";
  const now = new Date();

  const passwordHash = input.password
    ? await bcrypt.hash(input.password, LOCAL_AUTH_PASSWORD_SALT_ROUNDS)
    : null;
  const shouldPersistPasswordOnUpdate =
    Boolean(passwordHash) && input.method === AuthProvider.CREDENTIALS;
  const createPasswordHash =
    passwordHash ??
    (await bcrypt.hash(randomUUID(), LOCAL_AUTH_PASSWORD_SALT_ROUNDS));

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: derivedName,
        role: normalizedRole,
        lastAuthProvider: input.method,
        lastAuthAt: now,
        ...(shouldPersistPasswordOnUpdate && passwordHash
          ? { password: passwordHash }
          : null),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    return {
      ...updated,
      created: false,
    };
  }

  const created = await prisma.user.create({
    data: {
      email,
      name: derivedName,
      role: normalizedRole,
      password: createPasswordHash,
      registeredVia: input.method,
      lastAuthProvider: input.method,
      lastAuthAt: now,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  return {
    ...created,
    created: true,
  };
}

async function tryLocalPrismaFallback(
  emailInput: string,
  passwordInput: string,
): Promise<{
  id: string;
  email: string;
  name: string;
  role: string;
  wsApiUserId?: string;
  wsApiAccessToken?: string;
  wsApiSessionId?: string;
  wsApiSessionExpiresAt?: string;
} | null> {
  const email = normalizeEmail(emailInput);
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
    const upgradedHash = await bcrypt.hash(password, LOCAL_AUTH_PASSWORD_SALT_ROUNDS);
    await prisma.user.update({
      where: { id: localUser.id },
      data: { password: upgradedHash },
    });
  }

  await prisma.user.update({
    where: { id: localUser.id },
    data: {
      lastAuthProvider: AuthProvider.CREDENTIALS,
      lastAuthAt: new Date(),
    },
  });

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
    const localSyncedUser = await syncLocalUserRecord({
      email: wsApiLoginResult.user.email,
      name: wsApiLoginResult.user.name,
      role: wsApiLoginResult.user.role,
      password,
      method: AuthProvider.CREDENTIALS,
    });

    return {
      id: localSyncedUser.id,
      email: localSyncedUser.email,
      name: localSyncedUser.name,
      role: normalizeAppRole(localSyncedUser.role) ?? normalizedRole,
      wsApiUserId: wsApiLoginResult.user.id,
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
  delete token.wsApiUserId;
  delete token.wsApiSessionId;
  delete token.wsApiSessionExpiresAt;
}

function buildAuthProviders(): NextAuthOptions["providers"] {
  const providers: NextAuthOptions["providers"] = [
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
          const localSyncedUser = await syncLocalUserRecord({
            email: login.user.email,
            name: login.user.name,
            role: login.user.role,
            password: credentials.password,
            method: AuthProvider.CREDENTIALS,
          });

          return {
            id: localSyncedUser.id,
            email: localSyncedUser.email,
            name: localSyncedUser.name,
            role: normalizeAppRole(localSyncedUser.role) ?? "USER",
            wsApiUserId: login.user.id,
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
  ];

  const googleClientId = optionalEnv("GOOGLE_CLIENT_ID");
  const googleClientSecret = optionalEnv("GOOGLE_CLIENT_SECRET");
  if (googleClientId && googleClientSecret) {
    providers.push(
      GoogleProvider({
        clientId: googleClientId,
        clientSecret: googleClientSecret,
      }),
    );
  }

  const appleClientId = optionalEnv("APPLE_CLIENT_ID") ?? optionalEnv("APPLE_ID");
  const appleClientSecret = optionalEnv("APPLE_CLIENT_SECRET");
  if (appleClientId && appleClientSecret) {
    providers.push(
      AppleProvider({
        clientId: appleClientId,
        clientSecret: appleClientSecret.replace(/\\n/g, "\n"),
      }),
    );
  }

  const facebookClientId = optionalEnv("FACEBOOK_CLIENT_ID");
  const facebookClientSecret = optionalEnv("FACEBOOK_CLIENT_SECRET");
  if (facebookClientId && facebookClientSecret) {
    providers.push(
      FacebookProvider({
        clientId: facebookClientId,
        clientSecret: facebookClientSecret,
      }),
    );
  }

  const microsoftClientId = optionalEnv("MICROSOFT_CLIENT_ID");
  const microsoftClientSecret = optionalEnv("MICROSOFT_CLIENT_SECRET");
  const microsoftTenantId = optionalEnv("MICROSOFT_TENANT_ID");
  if (microsoftClientId && microsoftClientSecret && microsoftTenantId) {
    providers.push(
      AzureADProvider({
        clientId: microsoftClientId,
        clientSecret: microsoftClientSecret,
        tenantId: microsoftTenantId,
      }),
    );
  }

  const githubClientId = optionalEnv("GITHUB_CLIENT_ID");
  const githubClientSecret = optionalEnv("GITHUB_CLIENT_SECRET");
  if (githubClientId && githubClientSecret) {
    providers.push(
      GitHubProvider({
        clientId: githubClientId,
        clientSecret: githubClientSecret,
      }),
    );
  }

  return providers;
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },

  providers: buildAuthProviders(),

  pages: {
    signIn: "/login",
  },

  callbacks: {
    async signIn({ user, account }) {
      const providerId = account?.provider || "credentials";
      if (providerId === "credentials") {
        return true;
      }

      const method = oauthProviderFromId(providerId);
      const email =
        typeof user.email === "string" ? normalizeEmail(user.email) : "";

      if (!email) {
        await recordAuthRegistrationEvent({
          status: AuthRegistrationStatus.FAILURE,
          provider: method,
          failureCode: "MISSING_EMAIL",
          failureMessage: "OAuth provider did not return an email address.",
          metadata: {
            providerId,
            stage: "oauth_sign_in",
          },
        });
        return false;
      }

      const bridgePassword = bridgePasswordForOAuth(email);
      let wsApiResult:
        | {
            user: { id: string; name: string; role: string };
            accessToken: string;
            session: { id: string; expiresAt: string };
          }
        | null = null;

      try {
        try {
          await wsApiRegister(email, bridgePassword, user.name ?? undefined);
        } catch (error) {
          if (!(error instanceof WsApiHttpError && error.statusCode === 409)) {
            throw error;
          }
        }

        wsApiResult = await wsApiLogin(email, bridgePassword);
      } catch (error) {
        console.warn("oauth ws-api bridge sync failed", error);
      }

      try {
        const localSyncedUser = await syncLocalUserRecord({
          email,
          name: wsApiResult?.user.name ?? user.name,
          role: wsApiResult?.user.role ?? "USER",
          password: bridgePassword,
          method,
        });

        user.id = localSyncedUser.id;
        user.email = localSyncedUser.email;
        user.name = localSyncedUser.name;
        user.role = normalizeAppRole(localSyncedUser.role) ?? "USER";
        if (wsApiResult) {
          user.wsApiUserId = wsApiResult.user.id;
          user.wsApiAccessToken = wsApiResult.accessToken;
          user.wsApiSessionId = wsApiResult.session.id;
          user.wsApiSessionExpiresAt = wsApiResult.session.expiresAt;
        }

        if (localSyncedUser.created) {
          await recordAuthRegistrationEvent({
            status: AuthRegistrationStatus.SUCCESS,
            provider: method,
            email: localSyncedUser.email,
            userId: localSyncedUser.id,
            metadata: {
              providerId,
              stage: "oauth_sign_in",
            },
          });
        }

        return true;
      } catch (error) {
        await recordAuthRegistrationEvent({
          status: AuthRegistrationStatus.FAILURE,
          provider: method,
          email,
          failureCode: "LOCAL_SYNC_FAILED",
          failureMessage: error instanceof Error ? error.message : String(error),
          metadata: {
            providerId,
            stage: "oauth_sign_in",
          },
        });
        return false;
      }
    },

    async jwt({ token, user }) {
      const now = Date.now();

      if (user) {
        const normalizedRole = normalizeAppRole(user.role) ?? "USER";
        token.id = user.id;
        token.role = normalizedRole;
        token.email = user.email;
        token.name = user.name;
        token.wsApiUserId = user.wsApiUserId;
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

        const localSyncedUser = await syncLocalUserRecord({
          email: remoteSession.user.email,
          name: remoteSession.user.name,
          role: remoteSession.user.role,
          method: AuthProvider.OTHER,
        });

        token.id = localSyncedUser.id;
        token.role = normalizeAppRole(localSyncedUser.role) ?? "USER";
        token.email = localSyncedUser.email;
        token.name = localSyncedUser.name;
        token.wsApiUserId = remoteSession.user.id;
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
        session.user.wsApiUserId =
          typeof token.wsApiUserId === "string" ? token.wsApiUserId : null;
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
