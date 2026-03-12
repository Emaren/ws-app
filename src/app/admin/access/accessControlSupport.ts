"use client";

export type IdentityStatus = "MATCHED" | "ROLE_MISMATCH" | "LOCAL_ONLY" | "WSAPI_ONLY";
export type RoleValue = "OWNER" | "ADMIN" | "EDITOR" | "CONTRIBUTOR" | "USER";

export type IdentityRow = {
  email: string;
  status: IdentityStatus;
  offerBadgeCount: number;
  local: {
    id: string;
    email: string;
    name: string;
    role: string;
    registeredVia: string;
    registeredAt: string;
    lastAuthProvider: string | null;
    lastAuthAt: string | null;
  } | null;
  wsApi: {
    id: string;
    email: string;
    name: string;
    role: string;
    createdAt: string;
    updatedAt: string;
  } | null;
};

export type IdentityResponse = {
  generatedAt: string;
  wsApiAvailable: boolean;
  summary: {
    total: number;
    matched: number;
    roleMismatches: number;
    localOnly: number;
    wsApiOnly: number;
    zeroOfferUsers: number;
  };
  filters: {
    query: string;
    status: IdentityStatus | null;
  };
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  rows: IdentityRow[];
};

export type ManualResetResponse = {
  ok: boolean;
  action: "manual_link" | "resend";
  email: string;
  delivered?: boolean;
  provider?: string;
  reason?: string | null;
  expiresAt: string;
  resetUrl?: string;
  debugResetUrl?: string;
};

export type PasswordResetDispatchRow = {
  id: string;
  email: string;
  source: "SELF_SERVICE" | "ADMIN_MANUAL" | "ADMIN_RESEND";
  provider: string;
  delivered: boolean;
  reason: string | null;
  requestedByEmail: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    role: string;
  } | null;
  passwordResetToken: {
    id: string;
    expiresAt: string;
    usedAt: string | null;
  } | null;
};

export type AuthSupportPayload = {
  generatedAt: string;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  query: string;
  summary: {
    totalDispatches: number;
    deliveredDispatches: number;
    failedDispatches: number;
    activeTokens: number;
  };
  rows: PasswordResetDispatchRow[];
};

export type IdentityAutoHealRun = {
  id: string;
  actorUserId: string | null;
  actorEmail: string | null;
  mode: string;
  wsApiAvailable: boolean;
  scannedCount: number;
  roleMismatchBefore: number;
  roleMismatchAfter: number;
  localOnlyCount: number;
  wsApiOnlyCount: number;
  wsApiRoleUpdated: number;
  localUsersCreated: number;
  warnings: unknown;
  createdAt: string;
};

export type AutoHealHistoryPayload = {
  generatedAt: string;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  rows: IdentityAutoHealRun[];
};

export type AutoHealRunPayload = {
  ok: boolean;
  mode: "dry_run" | "apply";
  applied: boolean;
  summary: {
    before: {
      scannedCount: number;
      roleMismatchCount: number;
      localOnlyCount: number;
      wsApiOnlyCount: number;
    };
    after: {
      scannedCount: number;
      roleMismatchCount: number;
      localOnlyCount: number;
      wsApiOnlyCount: number;
    };
    wsApiRoleUpdated: number;
    localUsersCreated: number;
    warnings: string[];
  };
};

export type AccountRescueRun = {
  id: string;
  actorUserId: string | null;
  actorEmail: string | null;
  targetUserId: string | null;
  targetEmail: string;
  wsApiAvailable: boolean;
  localPasswordUpdated: boolean;
  wsApiPasswordUpdated: boolean;
  resetDispatchDelivered: boolean;
  resetDispatchProvider: string;
  resetDispatchReason: string | null;
  warnings: unknown;
  createdAt: string;
};

export type AccountRescueHistoryPayload = {
  generatedAt: string;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  rows: AccountRescueRun[];
};

export type AccountRescueActionPayload = {
  ok: boolean;
  email: string;
  userId: string;
  temporaryPassword: string;
  resetExpiresAt: string;
  manualResetUrl: string;
  delivered: boolean;
  provider: string;
  reason: string | null;
  warnings: string[];
  debugResetUrl?: string;
};

export const STATUS_OPTIONS: Array<{ value: "ALL" | IdentityStatus; label: string }> = [
  { value: "ALL", label: "All statuses" },
  { value: "ROLE_MISMATCH", label: "Role mismatch" },
  { value: "LOCAL_ONLY", label: "Local only" },
  { value: "WSAPI_ONLY", label: "ws-api only" },
  { value: "MATCHED", label: "Matched" },
];

export const ROLE_OPTIONS: RoleValue[] = ["OWNER", "ADMIN", "EDITOR", "CONTRIBUTOR", "USER"];

export function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return "-";
  return parsed.toLocaleString();
}

export function providerLabel(value: string | null | undefined): string {
  if (!value) return "-";
  if (value === "CREDENTIALS") return "Email";
  if (value === "GOOGLE") return "Google";
  if (value === "APPLE") return "Apple";
  if (value === "MICROSOFT") return "Microsoft";
  if (value === "FACEBOOK") return "Facebook";
  if (value === "INSTAGRAM") return "Instagram";
  if (value === "GITHUB") return "GitHub";
  return value;
}

export function dispatchSourceLabel(value: PasswordResetDispatchRow["source"]): string {
  if (value === "SELF_SERVICE") return "Self-service";
  if (value === "ADMIN_MANUAL") return "Admin manual link";
  if (value === "ADMIN_RESEND") return "Admin resend";
  return value;
}

export function statusBadge(status: IdentityStatus): string {
  if (status === "ROLE_MISMATCH") {
    return "border-amber-300/40 bg-amber-300/15 text-amber-100";
  }
  if (status === "LOCAL_ONLY") {
    return "border-blue-300/40 bg-blue-300/10 text-blue-100";
  }
  if (status === "WSAPI_ONLY") {
    return "border-violet-300/40 bg-violet-300/10 text-violet-100";
  }
  return "border-emerald-300/40 bg-emerald-300/10 text-emerald-100";
}

export function deliveryBadge(delivered: boolean): string {
  return delivered
    ? "rounded-full border border-emerald-400/35 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-200"
    : "rounded-full border border-amber-400/35 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-100";
}

export function buildPageSummary(
  payload: Pick<IdentityResponse, "page" | "pageSize" | "total"> | null | undefined,
): string {
  if (!payload) return "No data loaded";
  const from = payload.total === 0 ? 0 : (payload.page - 1) * payload.pageSize + 1;
  const to = Math.min(payload.page * payload.pageSize, payload.total);
  return `${from}-${to} of ${payload.total}`;
}

export function syncRoleDraftByEmail(
  previous: Record<string, RoleValue>,
  rows: IdentityRow[],
): Record<string, RoleValue> {
  const next = { ...previous };
  for (const row of rows) {
    const current = row.local?.role ?? row.wsApi?.role ?? "USER";
    if (!next[row.email] && ROLE_OPTIONS.includes(current as RoleValue)) {
      next[row.email] = current as RoleValue;
    }
  }
  return next;
}

export function countWarnings(warnings: unknown): number {
  return Array.isArray(warnings) ? warnings.length : 0;
}

export async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const payload = await response.json().catch(() => ({} as { message?: string }));
  if (!response.ok) {
    const message =
      payload && typeof payload.message === "string"
        ? payload.message
        : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}
