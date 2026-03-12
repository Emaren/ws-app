const DEFAULT_LOCAL_WS_API_PORT = "3012";
const DEFAULT_PRODUCTION_WS_API_URL = "http://127.0.0.1:3310";
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

function cleanBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function resolveLocalWsApiPort(env: NodeJS.ProcessEnv): string {
  const candidate = env.WS_API_PORT?.trim();
  if (candidate && /^\d+$/.test(candidate)) {
    return candidate;
  }
  return DEFAULT_LOCAL_WS_API_PORT;
}

function isLocalHostname(hostname: string): boolean {
  return LOCAL_HOSTNAMES.has(hostname.trim().toLowerCase());
}

export function deriveWsApiBaseUrlFromOrigin(
  origin: string,
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  try {
    const parsed = new URL(origin);
    const hostname = parsed.hostname.toLowerCase();

    if (isLocalHostname(hostname)) {
      return `http://127.0.0.1:${resolveLocalWsApiPort(env)}`;
    }

    if (hostname.startsWith("api.")) {
      return `${parsed.protocol}//${parsed.host}`;
    }

    const rootHostname = hostname.startsWith("www.")
      ? hostname.slice(4)
      : hostname;
    return `${parsed.protocol}//api.${rootHostname}`;
  } catch {
    return null;
  }
}

export function resolveWsApiBaseUrl(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const directCandidates = [
    env.WS_API_BASE_URL,
    env.WS_API_URL,
    env.INTERNAL_WS_API_BASE_URL,
    env.NEXT_PUBLIC_WS_API_BASE_URL,
    env.NEXT_PUBLIC_WS_API_URL,
    env.NEXT_PUBLIC_API_BASE_URL,
  ];

  for (const candidate of directCandidates) {
    if (candidate && candidate.trim().length > 0) {
      return cleanBaseUrl(candidate);
    }
  }

  const productionMode = env.NODE_ENV === "production";
  const originCandidates = [
    env.NEXTAUTH_URL,
    env.NEXT_PUBLIC_SITE_ORIGIN,
    env.NEXT_PUBLIC_APP_ORIGIN,
  ];

  if (productionMode) {
    for (const origin of originCandidates) {
      if (!origin || origin.trim().length === 0) {
        continue;
      }

      try {
        const hostname = new URL(origin.trim()).hostname.toLowerCase();
        if (isLocalHostname(hostname)) {
          const derived = deriveWsApiBaseUrlFromOrigin(origin.trim(), env);
          if (derived) {
            return cleanBaseUrl(derived);
          }
        }
      } catch {
        continue;
      }
    }

    return DEFAULT_PRODUCTION_WS_API_URL;
  }

  for (const origin of originCandidates) {
    if (!origin || origin.trim().length === 0) {
      continue;
    }
    const derived = deriveWsApiBaseUrlFromOrigin(origin.trim(), env);
    if (derived) {
      return cleanBaseUrl(derived);
    }
  }

  return `http://127.0.0.1:${resolveLocalWsApiPort(env)}`;
}
