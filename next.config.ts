// next.config.ts
import type { NextConfig } from "next";

/**
 * Real prod (NODE_ENV=production and not .next-preview) gets strict CSP.
 * Dev and preview builds (our prod-parity preview uses .next-preview) get a looser CSP:
 * - allow http: for images (so iPhone over LAN works)
 * - allow ws:/wss: and 'unsafe-eval' for HMR
 * - DO NOT send upgrade-insecure-requests (prevents Safari from auto-https’ing local assets)
 */
const env = process.env.NODE_ENV ?? "production";
const isProd = env === "production";
const isPreview = process.env.NEXT_DIST_DIR === ".next-preview";
const devLike = !isProd || isPreview;

// Directives that differ by mode
const scriptSrc = devLike
  ? ["'self'", "'unsafe-inline'", "'unsafe-eval'", "blob:"]
  : ["'self'", "'unsafe-inline'"];

const connectSrc = devLike
  ? ["'self'", "http:", "https:", "ws:", "wss:"]
  : ["'self'", "https:"];

const imgSrc = devLike
  ? "img-src 'self' http: https: data: blob:"
  : "img-src 'self' https: data: blob:";

// Common baseline
const base: string[] = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  imgSrc,
  "style-src 'self' 'unsafe-inline' blob:",
  "font-src 'self' data:",
  // Facebook comments iframe
  "frame-src 'self' https://www.facebook.com https://web.facebook.com https://staticxx.facebook.com",
  // Fallback for older UAs
  "child-src 'self' https://www.facebook.com https://web.facebook.com https://staticxx.facebook.com",
  // Clicking “Post” submits to FB
  "form-action 'self' https://www.facebook.com",
];

// Mode-specific extras
const extras: string[] = [
  `script-src ${scriptSrc.join(" ")}`,
  `connect-src ${connectSrc.join(" ")}`,
];

if (devLike) {
  extras.push("worker-src 'self' blob:");
} else {
  // In real prod we prefer HTTPS upgrades
  extras.push("upgrade-insecure-requests");
}

const csp = [...base, ...extras].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
