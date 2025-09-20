import type {NextConfig} from 'next';

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
  experimental: {
    serverComponentsExternalPackages: ['exceljs'],
  },
  async headers() {
    const csp = `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' *.google.com *.google-analytics.com *.googletagmanager.com *.cloudworkstations.googleusercontent.com vscode-cdn.net;
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: blob:;
      font-src 'self' data:;
      connect-src 'self' *.google.com *.google-analytics.com *.googleapis.com *.cloudworkstations.googleusercontent.com vscode-cdn.net;
      frame-src 'self' *.google.com *.cloudworkstations.googleusercontent.com;
      worker-src 'self' blob:;
    `.replace(/\s{2,}/g, ' ').trim();

    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: csp,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
