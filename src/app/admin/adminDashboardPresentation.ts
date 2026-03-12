export const WS_API_STORAGE_MODULES: Array<{
  key:
    | "users"
    | "authSessions"
    | "articles"
    | "businesses"
    | "inventoryItems"
    | "notifications"
    | "notificationAuditLogs"
    | "billingCustomers"
    | "rewardEntries"
    | "walletLinks"
    | "walletChallenges"
    | "businessOps";
  label: string;
}> = [
  { key: "users", label: "Users" },
  { key: "authSessions", label: "Sessions" },
  { key: "articles", label: "Articles" },
  { key: "businesses", label: "Businesses" },
  { key: "inventoryItems", label: "Inventory" },
  { key: "notifications", label: "Notifications" },
  { key: "notificationAuditLogs", label: "Notif audit" },
  { key: "billingCustomers", label: "Billing" },
  { key: "rewardEntries", label: "Rewards" },
  { key: "walletLinks", label: "Wallet links" },
  { key: "walletChallenges", label: "Wallet auth" },
  { key: "businessOps", label: "Business ops" },
];

export function probeBadgeClass(ok: boolean): string {
  return ok
    ? "rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300"
    : "rounded-full bg-rose-500/20 px-2 py-0.5 text-xs text-rose-200";
}

export function formatMethodLabel(method: string): string {
  if (method === "CREDENTIALS") return "Email + Password";
  if (method === "GOOGLE") return "Google";
  if (method === "APPLE") return "Apple";
  if (method === "MICROSOFT") return "Microsoft";
  if (method === "FACEBOOK") return "Facebook";
  if (method === "INSTAGRAM") return "Instagram";
  if (method === "GITHUB") return "GitHub";
  return method;
}

export function feedBadgeClass(status: "good" | "info" | "warn"): string {
  if (status === "good") {
    return "rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300";
  }
  if (status === "warn") {
    return "rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-200";
  }
  return "rounded-full bg-sky-500/20 px-2 py-0.5 text-xs text-sky-200";
}

export function wsApiStorageTone(
  backend: "postgres" | "file-journal" | "memory" | null | undefined,
): "good" | "info" | "warn" {
  if (backend === "postgres") {
    return "good";
  }
  if (backend === "file-journal") {
    return "info";
  }
  return "warn";
}

export function formatWsApiStorageBackend(
  backend: "postgres" | "file-journal" | "memory" | null | undefined,
): string {
  if (backend === "file-journal") {
    return "file journal";
  }
  return backend ?? "unknown";
}

export function wsApiContractParityTone(
  status: "aligned" | "drift" | "unknown",
): "good" | "warn" | "info" {
  if (status === "aligned") {
    return "good";
  }
  if (status === "drift") {
    return "warn";
  }
  return "info";
}

export function wsApiContractParityLabel(status: "aligned" | "drift" | "unknown"): string {
  if (status === "aligned") {
    return "contract aligned";
  }
  if (status === "drift") {
    return "contract drift";
  }
  return "contract unknown";
}

export function identityStatusTone(
  status: "MATCHED" | "ROLE_MISMATCH" | "LOCAL_ONLY" | "WSAPI_ONLY",
): "good" | "info" | "warn" {
  if (status === "MATCHED") {
    return "good";
  }
  if (status === "ROLE_MISMATCH") {
    return "warn";
  }
  return "info";
}

export function identityStatusLabel(
  status: "MATCHED" | "ROLE_MISMATCH" | "LOCAL_ONLY" | "WSAPI_ONLY",
): string {
  if (status === "ROLE_MISMATCH") {
    return "Role mismatch";
  }
  if (status === "LOCAL_ONLY") {
    return "Local only";
  }
  if (status === "WSAPI_ONLY") {
    return "WS-API only";
  }
  return "Matched";
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return value;
  }

  return new Date(timestamp).toLocaleString();
}

export function formatTokenAmount(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }

  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

export function formatCurrencyCents(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }

  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 2,
  }).format(value / 100);
}

export function operationalStatus(status: string | null | undefined): "good" | "info" | "warn" {
  const normalized = (status ?? "").trim().toLowerCase();
  if (["healthy", "ok", "pass", "sent", "connected"].includes(normalized)) {
    return "good";
  }
  if (["attention", "warning", "fail", "failed", "error", "needs review"].includes(normalized)) {
    return "warn";
  }
  return "info";
}

export function formatOpsLabel(value: string): string {
  return value
    .split("-")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}
