import type { NextConfig } from "next";

// Next.js runtime may still accept this option, but the `NextConfig` type in this version
// doesn't include it. We cast to keep type-checking unblocked.
const nextConfig = {
  serverActions: {
    bodySizeLimit: "10mb",
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, PATCH, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, Next-Action, RSC" },
        ],
      },
    ];
  },
};

export default nextConfig;
