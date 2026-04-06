import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'getclearclaim.co.uk',
      },
    ],
  },
};

export default nextConfig;
