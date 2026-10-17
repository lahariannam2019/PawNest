import type { NextConfig } from 'next';

const isRailway = Boolean(
  process.env.RAILWAY_ENVIRONMENT_NAME ||
  process.env.RAILWAY_PROJECT_ID ||
  process.env.RAILWAY_STATIC_URL ||
  process.env.RAILWAY_PRIVATE_DOMAIN ||
  process.env.RAILWAY_DEPLOYMENT_ID ||
  process.env.RAILWAY_ENVIRONMENT
);

const rawApiUrl =
  (process.env.API_URL && process.env.API_URL.trim()) ||
  (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.trim()) ||
  (isRailway ? 'http://api.railway.internal:8080' : 'http://localhost:4000');
const apiUrl = rawApiUrl.replace(/\/$/, '');

const nextConfig: NextConfig = {
  transpilePackages: ['@pawnest/shared'],
  reactStrictMode: true,
  devIndicators: false,
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiUrl}/api/v1/:path*`,
      },
    ];
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
};

export default nextConfig;
