export function safeRequestUrl(req: { url?: unknown }): URL {
  const rawUrl = req.url;
  const normalizedUrl =
    typeof rawUrl === "string"
      ? rawUrl
      : rawUrl instanceof URL
        ? rawUrl.toString()
        : rawUrl &&
            typeof rawUrl === "object" &&
            "href" in rawUrl &&
            typeof (rawUrl as { href?: unknown }).href === "string"
          ? (rawUrl as { href: string }).href
          : "http://localhost";

  try {
    return new URL(normalizedUrl);
  } catch {
    return new URL("http://localhost");
  }
}

export function safeSearchParams(req: { url?: unknown }): URLSearchParams {
  return safeRequestUrl(req).searchParams;
}
