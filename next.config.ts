import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['firebase-admin'],
  // eslint: {
  //   // Allows builds to complete even if ESLint errors exist.
  //   ignoreDuringBuilds: true,
  // },
  turbopack: {},
  typescript: {
    // Allows builds to complete even if type errors exist.
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'firebase-admin': false,
    };
    return config;
  },
  async rewrites() {
    return [
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
    ];
  },
};

export default nextConfig;
