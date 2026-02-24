import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['docusign-esign'],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
