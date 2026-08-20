import type { NextConfig } from "next";

const apiUrl = process.env.API_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  transpilePackages: ["@eaimesa/shared"],
  async rewrites() {
    return [
      { source: "/v1/:path*", destination: `${apiUrl}/v1/:path*` },
      { source: "/health", destination: `${apiUrl}/health` },
    ];
  },
};

export default nextConfig;
