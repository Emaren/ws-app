export type PulseIntegrationConfig = {
  webBaseUrl: string | null;
  apiBaseUrl: string | null;
  internalTokenConfigured: boolean;
  projectSlug: string | null;
  configured: boolean;
};

function normalizeText(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function cleanUrl(value: string | null): string | null {
  return value ? value.replace(/\/+$/, "") : null;
}

export function resolvePulseIntegrationConfig(
  env: Record<string, string | undefined> = process.env,
): PulseIntegrationConfig {
  const webBaseUrl = cleanUrl(
    normalizeText(env.PULSE_WEB_BASE_URL) ??
      normalizeText(env.NEXT_PUBLIC_PULSE_WEB_BASE_URL),
  );
  const apiBaseUrl = cleanUrl(
    normalizeText(env.PULSE_API_BASE_URL) ??
      normalizeText(env.NEXT_PUBLIC_PULSE_API_BASE_URL),
  );
  const projectSlug =
    normalizeText(env.PULSE_PROJECT_SLUG) ??
    normalizeText(env.NEXT_PUBLIC_PULSE_PROJECT_SLUG);
  const internalTokenConfigured = Boolean(
    normalizeText(env.PULSE_INTERNAL_API_TOKEN),
  );

  return {
    webBaseUrl,
    apiBaseUrl,
    internalTokenConfigured,
    projectSlug,
    configured: Boolean(webBaseUrl || apiBaseUrl || projectSlug || internalTokenConfigured),
  };
}

type PulseHealthPayload = {
  status?: string;
  time?: string;
};

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function fetchPulseReadinessSnapshot(
  config: PulseIntegrationConfig,
  options?: {
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
  },
) {
  const snapshot = {
    configured: config.configured,
    webBaseUrl: config.webBaseUrl,
    apiBaseUrl: config.apiBaseUrl,
    projectSlug: config.projectSlug,
    internalTokenConfigured: config.internalTokenConfigured,
    reachable: false,
    status: null as string | null,
    checkedAt: null as string | null,
    error: null as string | null,
  };

  if (!config.apiBaseUrl) {
    return {
      ...snapshot,
      error: "Pulse API base URL is not configured yet.",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options?.timeoutMs ?? 4500);
  const fetchImpl = options?.fetchImpl ?? fetch;

  try {
    const response = await fetchImpl(`${config.apiBaseUrl}/health`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    const payload = (await response.json().catch(() => null)) as PulseHealthPayload | null;
    if (!response.ok) {
      return {
        ...snapshot,
        error: `request returned ${response.status}`,
      };
    }

    return {
      ...snapshot,
      reachable: true,
      status: typeof payload?.status === "string" ? payload.status : "ok",
      checkedAt: typeof payload?.time === "string" ? payload.time : null,
      error: null,
    };
  } catch (error) {
    return {
      ...snapshot,
      error: safeErrorMessage(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}
