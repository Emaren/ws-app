import {
  PASSWORD_RESET_EMAIL_SUBJECT,
  type PasswordResetEmailConfig,
} from "./passwordResetSupport";

type TmailSummaryPayload = {
  identities?: Array<{
    id?: string;
    label?: string;
    email_address?: string;
    status?: string;
    health?: {
      secretConfigured?: boolean;
      status?: string;
    };
  }>;
  domains?: Array<{
    domain?: string;
    spf?: string;
    dkim?: string;
    dmarc?: string;
    mx?: string;
  }>;
  alerts?: Array<{
    id?: string;
    level?: string;
    title?: string;
    body?: string;
  }>;
};

type TmailMessagesPayload = {
  items?: Array<{
    id?: string;
    subject?: string;
    status?: string;
    sent_at?: string | null;
    created_at?: string | null;
    identity_id?: string | null;
    recipients?: unknown;
    error_message?: string | null;
  }>;
};

type TmailProbe = {
  url: string | null;
  reachable: boolean;
  status: number | null;
  error: string | null;
};

export type TmailSnapshot = {
  configured: boolean;
  reachable: boolean;
  baseUrl: string | null;
  publicHealth: TmailProbe;
  summaryFeed: TmailProbe;
  messagesFeed: TmailProbe;
  identityId: string | null;
  identityLabel: string | null;
  identityEmail: string | null;
  identityStatus: string | null;
  secretConfigured: boolean | null;
  error: string | null;
  alerts: Array<{
    id: string;
    level: string;
    title: string;
    body: string | null;
  }>;
  domains: Array<{
    domain: string;
    spf: string | null;
    dkim: string | null;
    dmarc: string | null;
    mx: string | null;
  }>;
  latestPasswordResetMessage: {
    id: string;
    subject: string;
    status: string;
    sentAt: string | null;
    createdAt: string | null;
    recipients: string[];
    errorMessage: string | null;
  } | null;
  recentPasswordResetMessages: Array<{
    id: string;
    subject: string;
    status: string;
    sentAt: string | null;
    createdAt: string | null;
    recipients: string[];
    errorMessage: string | null;
  }>;
};

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeEmail(value: unknown): string | null {
  const text = normalizeText(value);
  return text ? text.toLowerCase() : null;
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => normalizeText(entry))
    .filter((entry): entry is string => Boolean(entry));
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function normalizeBaseUrl(baseUrl: string | null): string | null {
  const text = normalizeText(baseUrl);
  return text ? text.replace(/\/+$/, "") : null;
}

function resolvePublicHealthUrl(baseUrl: string | null): string | null {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  if (!normalizedBaseUrl) {
    return null;
  }

  try {
    const url = new URL(normalizedBaseUrl);
    const normalizedPath = url.pathname.replace(/\/+$/, "");
    if (normalizedPath === "/api") {
      url.pathname = "/healthz";
    } else if (normalizedPath.length === 0 || normalizedPath === "/") {
      url.pathname = "/healthz";
    } else {
      url.pathname = `${normalizedPath}/healthz`;
    }
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

async function fetchJsonWithTimeout<T>(
  url: string,
  init: RequestInit,
  options?: {
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
  },
): Promise<{ ok: boolean; status: number | null; payload: T | null; error: string | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options?.timeoutMs ?? 4500);
  const fetchImpl = options?.fetchImpl ?? fetch;

  try {
    const response = await fetchImpl(url, {
      cache: "no-store",
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(init.headers ?? {}),
      },
    });

    const payload = (await response.json().catch(() => null)) as T | null;
    return {
      ok: response.ok,
      status: response.status,
      payload,
      error: response.ok ? null : `request returned ${response.status}`,
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      payload: null,
      error: safeErrorMessage(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function toProbe(url: string | null, response: {
  ok: boolean;
  status: number | null;
  error: string | null;
}): TmailProbe {
  return {
    url,
    reachable: response.ok,
    status: response.status,
    error: response.error,
  };
}

function summarizeProbeFailures(
  probes: Array<{
    label: string;
    probe: TmailProbe;
  }>,
): string | null {
  const failures = probes
    .filter(({ probe }) => !probe.reachable)
    .map(({ label, probe }) => `${label} ${probe.error ?? "unreachable"}`);

  return failures.length > 0 ? failures.join(" · ") : null;
}

export async function fetchTmailSnapshot(
  config: PasswordResetEmailConfig,
  options?: {
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
  },
): Promise<TmailSnapshot> {
  const disabledSnapshot: TmailSnapshot = {
    configured: false,
    reachable: false,
    baseUrl: config.apiBaseUrl,
    publicHealth: {
      url: resolvePublicHealthUrl(config.apiBaseUrl),
      reachable: false,
      status: null,
      error: null,
    },
    summaryFeed: {
      url: normalizeBaseUrl(config.apiBaseUrl)
        ? `${normalizeBaseUrl(config.apiBaseUrl)}/dashboard/summary`
        : null,
      reachable: false,
      status: null,
      error: null,
    },
    messagesFeed: {
      url: normalizeBaseUrl(config.apiBaseUrl)
        ? `${normalizeBaseUrl(config.apiBaseUrl)}/messages?limit=12`
        : null,
      reachable: false,
      status: null,
      error: null,
    },
    identityId: config.tmailIdentityId,
    identityLabel: null,
    identityEmail: null,
    identityStatus: null,
    secretConfigured: null,
    error: null,
    alerts: [],
    domains: [],
    latestPasswordResetMessage: null,
    recentPasswordResetMessages: [],
  };

  if (config.provider !== "tmail") {
    return disabledSnapshot;
  }

  if (!config.configured || !config.apiKey || !config.apiBaseUrl) {
    return {
      ...disabledSnapshot,
      configured: config.configured,
      error: "TMail provider is selected but app-side TMail configuration is incomplete.",
    };
  }

  const normalizedBaseUrl = normalizeBaseUrl(config.apiBaseUrl);
  if (!normalizedBaseUrl) {
    return {
      ...disabledSnapshot,
      configured: config.configured,
      error: "TMail API base URL is invalid.",
    };
  }
  const publicHealthUrl = resolvePublicHealthUrl(config.apiBaseUrl);

  const authHeaders = {
    Authorization: `Bearer ${config.apiKey}`,
  };

  const [publicHealthResponse, summaryResponse, messagesResponse] = await Promise.all([
    publicHealthUrl
      ? fetchJsonWithTimeout<Record<string, unknown>>(
          publicHealthUrl,
          {
            method: "GET",
          },
          options,
        )
      : Promise.resolve({
          ok: false,
          status: null,
          payload: null,
          error: "public health URL unavailable",
        }),
    fetchJsonWithTimeout<TmailSummaryPayload>(
      `${normalizedBaseUrl}/dashboard/summary`,
      {
        method: "GET",
        headers: authHeaders,
      },
      options,
    ),
    fetchJsonWithTimeout<TmailMessagesPayload>(
      `${normalizedBaseUrl}/messages?limit=12`,
      {
        method: "GET",
        headers: authHeaders,
      },
      options,
    ),
  ]);

  const identities = Array.isArray(summaryResponse.payload?.identities)
    ? summaryResponse.payload.identities
    : [];
  const configuredIdentity = identities.find((identity) => {
    const id = normalizeText(identity.id);
    const emailAddress = normalizeEmail(identity.email_address);
    return (
      (config.tmailIdentityId && id === config.tmailIdentityId) ||
      (config.from && emailAddress === normalizeEmail(config.from))
    );
  });

  const recentPasswordResetMessages = (Array.isArray(messagesResponse.payload?.items)
    ? messagesResponse.payload.items
    : []
  )
    .filter((message) => normalizeText(message.subject) === PASSWORD_RESET_EMAIL_SUBJECT)
    .map((message, index) => ({
      id: normalizeText(message.id) ?? `tmail-message-${index + 1}`,
      subject: normalizeText(message.subject) ?? PASSWORD_RESET_EMAIL_SUBJECT,
      status: normalizeText(message.status) ?? "unknown",
      sentAt: normalizeText(message.sent_at),
      createdAt: normalizeText(message.created_at),
      recipients: normalizeStringList(message.recipients),
      errorMessage: normalizeText(message.error_message),
    }));

  const latestPasswordResetMessage = recentPasswordResetMessages[0] ?? null;
  const publicHealthProbe = toProbe(publicHealthUrl, publicHealthResponse);
  const summaryFeedProbe = toProbe(
    normalizedBaseUrl ? `${normalizedBaseUrl}/dashboard/summary` : null,
    summaryResponse,
  );
  const messagesFeedProbe = toProbe(
    normalizedBaseUrl ? `${normalizedBaseUrl}/messages?limit=12` : null,
    messagesResponse,
  );

  return {
    configured: config.configured,
    reachable: summaryResponse.ok && messagesResponse.ok,
    baseUrl: config.apiBaseUrl,
    publicHealth: publicHealthProbe,
    summaryFeed: summaryFeedProbe,
    messagesFeed: messagesFeedProbe,
    identityId: normalizeText(configuredIdentity?.id) ?? config.tmailIdentityId,
    identityLabel: normalizeText(configuredIdentity?.label),
    identityEmail: normalizeEmail(configuredIdentity?.email_address) ?? normalizeEmail(config.from),
    identityStatus:
      normalizeText(configuredIdentity?.health?.status) ?? normalizeText(configuredIdentity?.status),
    secretConfigured:
      typeof configuredIdentity?.health?.secretConfigured === "boolean"
        ? configuredIdentity.health.secretConfigured
        : null,
    error: summarizeProbeFailures([
      { label: "public health", probe: publicHealthProbe },
      { label: "summary feed", probe: summaryFeedProbe },
      { label: "messages feed", probe: messagesFeedProbe },
    ]),
    alerts: (Array.isArray(summaryResponse.payload?.alerts) ? summaryResponse.payload.alerts : [])
      .map((alert, index) => ({
        id: normalizeText(alert.id) ?? `alert-${index + 1}`,
        level: normalizeText(alert.level) ?? "info",
        title: normalizeText(alert.title) ?? "TMail alert",
        body: normalizeText(alert.body),
      })),
    domains: (Array.isArray(summaryResponse.payload?.domains) ? summaryResponse.payload.domains : [])
      .map((domain) => ({
        domain: normalizeText(domain.domain) ?? "unknown",
        spf: normalizeText(domain.spf),
        dkim: normalizeText(domain.dkim),
        dmarc: normalizeText(domain.dmarc),
        mx: normalizeText(domain.mx),
      })),
    latestPasswordResetMessage,
    recentPasswordResetMessages,
  };
}
