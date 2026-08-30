import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@firecrawl/anydoc', 'unpdf', 'pdf-parse'],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
