import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb", // 例: 10mb/25mb/50mb など
    },
  },
};

export default nextConfig;
