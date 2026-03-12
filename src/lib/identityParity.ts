export type IdentityParityStatus =
  | "MATCHED"
  | "ROLE_MISMATCH"
  | "LOCAL_ONLY"
  | "WSAPI_ONLY";

export type IdentityParityLocalUserInput = {
  id: string;
  email: string;
  name: string;
  role: string;
  registeredVia: string;
  registeredAt: Date | string;
  lastAuthProvider: string | null;
  lastAuthAt: Date | string | null;
};

export type IdentityParityWsApiUserInput = {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type IdentityParityLocalUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  registeredVia: string;
  registeredAt: string;
  lastAuthProvider: string | null;
  lastAuthAt: string | null;
};

export type IdentityParityWsApiUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  updatedAt: string;
};

export type IdentityParityRow = {
  email: string;
  status: IdentityParityStatus;
  offerBadgeCount: number;
  local: IdentityParityLocalUser | null;
  wsApi: IdentityParityWsApiUser | null;
};

export type IdentityParitySummary = {
  total: number;
  matched: number;
  roleMismatches: number;
  localOnly: number;
  wsApiOnly: number;
  zeroOfferUsers: number;
};

function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

function normalizeRole(input: string | null | undefined): string {
  const value = (input ?? "").trim().toUpperCase();
  if (["OWNER", "ADMIN", "EDITOR", "CONTRIBUTOR", "USER"].includes(value)) {
    return value;
  }
  return "USER";
}

function toIsoString(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  return value.toISOString();
}

function toLocalUser(input: IdentityParityLocalUserInput): IdentityParityLocalUser {
  return {
    id: input.id,
    email: normalizeEmail(input.email),
    name: input.name,
    role: normalizeRole(input.role),
    registeredVia: input.registeredVia,
    registeredAt: toIsoString(input.registeredAt) ?? new Date(0).toISOString(),
    lastAuthProvider: input.lastAuthProvider,
    lastAuthAt: toIsoString(input.lastAuthAt),
  };
}

function toWsApiUser(input: IdentityParityWsApiUserInput): IdentityParityWsApiUser {
  return {
    id: input.id,
    email: normalizeEmail(input.email),
    name: input.name,
    role: normalizeRole(input.role),
    createdAt: toIsoString(input.createdAt) ?? new Date(0).toISOString(),
    updatedAt: toIsoString(input.updatedAt) ?? new Date(0).toISOString(),
  };
}

function rowStatus(
  local: IdentityParityLocalUser | null,
  wsApi: IdentityParityWsApiUser | null,
): IdentityParityStatus {
  if (local && wsApi) {
    return local.role === wsApi.role ? "MATCHED" : "ROLE_MISMATCH";
  }
  if (local) {
    return "LOCAL_ONLY";
  }
  return "WSAPI_ONLY";
}

function statusPriority(status: IdentityParityStatus): number {
  if (status === "ROLE_MISMATCH") return 0;
  if (status === "LOCAL_ONLY") return 1;
  if (status === "WSAPI_ONLY") return 2;
  return 3;
}

function normalizeOfferBadgeMap(
  input?: Map<string, number> | Record<string, number>,
): Map<string, number> {
  if (!input) {
    return new Map();
  }

  if (input instanceof Map) {
    return new Map(
      [...input.entries()].map(([email, count]) => [normalizeEmail(email), count]),
    );
  }

  return new Map(
    Object.entries(input).map(([email, count]) => [normalizeEmail(email), count]),
  );
}

export function buildIdentityParitySnapshot(input: {
  localUsers: IdentityParityLocalUserInput[];
  wsUsers: IdentityParityWsApiUserInput[];
  offerBadgeCountsByEmail?: Map<string, number> | Record<string, number>;
}): {
  summary: IdentityParitySummary;
  rows: IdentityParityRow[];
} {
  const localByEmail = new Map<string, IdentityParityLocalUser>();
  const wsByEmail = new Map<string, IdentityParityWsApiUser>();
  const offerBadgeByEmail = normalizeOfferBadgeMap(input.offerBadgeCountsByEmail);

  for (const user of input.localUsers) {
    const normalized = toLocalUser(user);
    localByEmail.set(normalized.email, normalized);
  }

  for (const user of input.wsUsers) {
    const normalized = toWsApiUser(user);
    wsByEmail.set(normalized.email, normalized);
  }

  const mergedEmails = [...new Set([...localByEmail.keys(), ...wsByEmail.keys()])];
  const rows = mergedEmails
    .map((email) => {
      const local = localByEmail.get(email) ?? null;
      const wsApi = wsByEmail.get(email) ?? null;
      return {
        email,
        status: rowStatus(local, wsApi),
        offerBadgeCount: offerBadgeByEmail.get(email) ?? 0,
        local,
        wsApi,
      } satisfies IdentityParityRow;
    })
    .sort((left, right) => {
      const statusDiff = statusPriority(left.status) - statusPriority(right.status);
      if (statusDiff !== 0) {
        return statusDiff;
      }

      const badgeDiff = right.offerBadgeCount - left.offerBadgeCount;
      if (badgeDiff !== 0) {
        return badgeDiff;
      }

      return left.email.localeCompare(right.email);
    });

  const summary: IdentityParitySummary = {
    total: rows.length,
    matched: rows.filter((row) => row.status === "MATCHED").length,
    roleMismatches: rows.filter((row) => row.status === "ROLE_MISMATCH").length,
    localOnly: rows.filter((row) => row.status === "LOCAL_ONLY").length,
    wsApiOnly: rows.filter((row) => row.status === "WSAPI_ONLY").length,
    zeroOfferUsers: rows.filter((row) => row.offerBadgeCount === 0).length,
  };

  return {
    summary,
    rows,
  };
}
