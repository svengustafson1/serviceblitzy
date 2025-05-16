import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'chart.googleapis.com',
        pathname: '/chart/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '*',
        pathname: '/**',
      }
    ],
    domains: ['localhost']
  },
  /* other config options */
};

export default nextConfig;
