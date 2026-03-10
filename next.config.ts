import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',

  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ['firebase-admin'],
  turbopack: {},
  async rewrites() {
    return [
      {
        source: '/:path*',
        destination: '/:path*',
        has: [
          {
            type: 'host',
            value: 'nbis.localhost:3000',
          },
        ],
      },
      {
        source: '/:path*',
        destination: '/:path*',
        has: [
          {
            type: 'host',
            value: 'aspire.localhost:3000',
          },
        ],
      },
      {
        source: '/:path*',
        destination: '/:path*',
        has: [
          {
            type: 'host',
            value: 'dalimss.localhost:3000',
          },
        ],
      },
      // Merged from next.config.js
      {
        source: '/:path*',
        destination: '/:path*',
        has: [
          {
            type: 'host',
            value: 'aspire.career-9.com',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
