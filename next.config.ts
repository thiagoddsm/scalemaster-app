import type {NextConfig} from 'next';

// Adding a comment here to try to force a full rebuild.
const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Adding this experimental flag to trigger a rebuild.
  experimental: {
    serverComponentsExternalPackages: ['exceljs'],
  },
};

export default nextConfig;
