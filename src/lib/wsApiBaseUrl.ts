import "server-only";

const DEFAULT_LOCAL_WS_API_PORT = "3012";
const DEFAULT_PRODUCTION_WS_API_URL = "http://127.0.0.1:3310";

function cleanBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function resolveLocalWsApiPort(): string {
  const candidate = process.env.WS_API_PORT?.trim();
  if (candidate && /^\d+$/.test(candidate)) {
    return candidate;
  }
  return DEFAULT_LOCAL_WS_API_PORT;
}

function deriveFromOrigin(origin: string): string | null {
  try {
    const parsed = new URL(origin);
    const hostname = parsed.hostname.toLowerCase();

    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1"
    ) {
      return `http://127.0.0.1:${resolveLocalWsApiPort()}`;
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

export function getWsApiBaseUrl(): string {
  const directCandidates = [
    process.env.WS_API_BASE_URL,
    process.env.WS_API_URL,
    process.env.INTERNAL_WS_API_BASE_URL,
    process.env.NEXT_PUBLIC_WS_API_BASE_URL,
    process.env.NEXT_PUBLIC_WS_API_URL,
    process.env.NEXT_PUBLIC_API_BASE_URL,
  ];

  for (const candidate of directCandidates) {
    if (candidate && candidate.trim().length > 0) {
      return cleanBaseUrl(candidate);
    }
  }

  const originCandidates = [
    process.env.NEXTAUTH_URL,
    process.env.NEXT_PUBLIC_SITE_ORIGIN,
    process.env.NEXT_PUBLIC_APP_ORIGIN,
  ];

  for (const origin of originCandidates) {
    if (!origin || origin.trim().length === 0) {
      continue;
    }
    const derived = deriveFromOrigin(origin.trim());
    if (derived) {
      return cleanBaseUrl(derived);
    }
  }

  if (process.env.NODE_ENV === "production") {
    return DEFAULT_PRODUCTION_WS_API_URL;
  }

  return `http://127.0.0.1:${resolveLocalWsApiPort()}`;
}
