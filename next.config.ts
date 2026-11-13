import type { NextConfig } from "next";
import path from "node:path";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  // Cache Components is intentionally disabled. antd 6.7 (via
  // @ant-design/cssinjs-utils) calls Date.now() during render for its
  // memo cache, which Next 16 rejects during client-component prerendering.
  // See docs/architecture.md for the compatibility note.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "www.gutenberg.org" },
      { protocol: "https", hostname: "gutenberg.org" },
      { protocol: "http", hostname: "www.gutenberg.org" },
      { protocol: "http", hostname: "gutenberg.org" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      },
    ];
  },
  turbopack: {
    root: path.resolve(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
