export type BusinessRecord = {
  id: string;
  slug: string;
  name: string;
  status: string;
};

export type NotificationChannel = "email" | "sms" | "push";
export type NotificationStatus = "queued" | "processing" | "retrying" | "sent" | "failed";
export type SendMode = "send_now" | "scheduled";
export type AudienceMode = "all" | "segment" | "direct";

export type NotificationJobRecord = {
  id: string;
  businessId: string;
  channel: NotificationChannel;
  audience: string;
  subject: string | null;
  message: string;
  metadata: Record<string, unknown> | null;
  status: NotificationStatus;
  provider: string | null;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: string;
  lastAttemptAt: string | null;
  sentAt: string | null;
  failedAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NotificationAuditLogRecord = {
  id: string;
  jobId: string;
  event: string;
  channel: NotificationChannel;
  provider: string | null;
  attempt: number | null;
  message: string;
  detail: Record<string, unknown> | null;
  createdAt: string;
};

export type ProcessQueueResult = {
  processed: number;
  sent: number;
  retried: number;
  failed: number;
  jobIds: string[];
};

export type HistoryFilterState = {
  status: "" | NotificationStatus;
  channel: "" | NotificationChannel;
};

export type CampaignFormState = {
  businessId: string;
  campaignName: string;
  channel: NotificationChannel;
  audienceMode: AudienceMode;
  audienceValue: string;
  subject: string;
  message: string;
  sendMode: SendMode;
  scheduledFor: string;
  maxAttempts: string;
  fallbackEmailAudience: string;
  fallbackSmsAudience: string;
};

export type PushPermissionState = NotificationPermission | "unsupported";

export interface PushSubscriptionJsonShape {
  endpoint?: string;
  expirationTime?: number | null;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
}

export type NotificationJobStats = {
  queued: number;
  processing: number;
  retrying: number;
  sent: number;
  failed: number;
};

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

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      (payload && typeof payload.message === "string" && payload.message) ||
      (payload && typeof payload?.error?.message === "string" && payload.error.message) ||
      `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}

export function toLocalDateTimeInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function toIsoDate(localValue: string): string | null {
  const trimmed = localValue.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (!Number.isFinite(parsed.getTime())) return null;
  return parsed.toISOString();
}

export function statusBadgeClasses(status: NotificationStatus): string {
  if (status === "sent") {
    return "border border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
  }
  if (status === "failed") {
    return "border border-red-500/50 bg-red-500/10 text-red-200";
  }
  if (status === "processing") {
    return "border border-blue-400/40 bg-blue-500/10 text-blue-100";
  }
  if (status === "retrying") {
    return "border border-amber-500/40 bg-amber-500/10 text-amber-200";
  }
  return "border border-white/20 bg-white/5 text-white/80";
}

export function formatStatus(status: NotificationStatus): string {
  if (status === "processing") return "PROCESSING";
  if (status === "retrying") return "RETRYING";
  if (status === "sent") return "SENT";
  if (status === "failed") return "FAILED";
  return "QUEUED";
}

export function stringifyDetail(detail: Record<string, unknown> | null): string {
  if (!detail) return "";

  const entries = Object.entries(detail)
    .filter(([, value]) => value !== null && value !== undefined)
    .slice(0, 4)
    .map(([key, value]) => `${key}=${String(value)}`);

  return entries.join(" · ");
}

export function createCampaignForm(businessId: string): CampaignFormState {
  return {
    businessId,
    campaignName: "",
    channel: "email",
    audienceMode: "all",
    audienceValue: "",
    subject: "",
    message: "",
    sendMode: "send_now",
    scheduledFor: "",
    maxAttempts: "3",
    fallbackEmailAudience: "",
    fallbackSmsAudience: "",
  };
}

function base64UrlEncode(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  const encoded = btoa(binary);
  return encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function urlBase64ToArrayBuffer(base64: string): ArrayBuffer {
  const normalized = base64.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  const padded = padding === 0 ? normalized : `${normalized}${"=".repeat(4 - padding)}`;
  const raw = atob(padded);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output.buffer as ArrayBuffer;
}

export function encodeWebPushAudience(
  subscription: PushSubscriptionJsonShape | null,
): string | null {
  if (!subscription) return null;
  if (!subscription.endpoint) return null;
  if (!subscription.keys?.p256dh || !subscription.keys.auth) return null;
  return `webpush:${base64UrlEncode(JSON.stringify(subscription))}`;
}

export function browserPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export function shortAudienceToken(value: string): string {
  if (value.length <= 38) return value;
  return `${value.slice(0, 16)}...${value.slice(-16)}`;
}

export function resolveAudience(mode: AudienceMode, rawValue: string): string {
  const value = rawValue.trim();
  if (mode === "all") {
    return "all";
  }
  if (!value) {
    return "";
  }
  if (mode === "segment") {
    return `segment:${value}`;
  }
  return value;
}

export function buildNotificationJobStats(jobs: NotificationJobRecord[]): NotificationJobStats {
  let queued = 0;
  let processing = 0;
  let retrying = 0;
  let sent = 0;
  let failed = 0;

  for (const job of jobs) {
    if (job.status === "queued") queued += 1;
    if (job.status === "processing") processing += 1;
    if (job.status === "retrying") retrying += 1;
    if (job.status === "sent") sent += 1;
    if (job.status === "failed") failed += 1;
  }

  return { queued, processing, retrying, sent, failed };
}
