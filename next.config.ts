// next.config.ts
import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
// Allow a looser CSP even when NODE_ENV=production (for preview/prod-parity runs)
const previewLooser = process.env.PREVIEW_LOOSER_CSP === "1";

// Use the "loose/dev" policy when not prod, or when explicitly allowed in prod previews
const useLoosePolicy = !isProd || previewLooser;

const base: string[] = [
  "default-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "img-src 'self' https: data: blob:",
  "style-src 'self' 'unsafe-inline' blob:",
  "font-src 'self' data:",
  // Allow the FB Comments plugin iframe
  "frame-src 'self' https://www.facebook.com https://web.facebook.com https://staticxx.facebook.com",
  // For some older browsers where child-src controls frames
  "child-src 'self' https://www.facebook.com https://web.facebook.com https://staticxx.facebook.com",
  // Clicking “Post” submits to FB
  "form-action 'self' https://www.facebook.com",
];

const devOrPreviewExtras: string[] = [
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
  "connect-src 'self' http: https: ws:",
  "upgrade-insecure-requests",
];

const prodExtras: string[] = [
  "script-src 'self'",
  "connect-src 'self' https:",
  "upgrade-insecure-requests",
];

const csp = [...base, ...(useLoosePolicy ? devOrPreviewExtras : prodExtras)].join("; ");

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
