// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // apply to all app routes; narrow this if desired
        source: "/:path*",
        headers: [
          // If another proxy/app is sending a restrictive policy, this will override when it reaches the browser last.
          // Modern syntax for Permissions-Policy (no “Feature-Policy”).
          { key: "Permissions-Policy", value: "unload=*" },
        ],
      },
    ];
  },
};

export default nextConfig;
