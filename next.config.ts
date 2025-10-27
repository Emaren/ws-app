// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // isolate build output per mode (dev/preview/prod)
  distDir: process.env.NEXT_DIST_DIR || ".next",

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Permissions-Policy", value: "unload=*" },
        ],
      },
    ];
  },
};

export default nextConfig;
