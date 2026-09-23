/**
 * The browser talks only to Next.js (decision D002). Every `/api/*` request the
 * page makes - from the browser or from a server component - is forwarded to the
 * Express process, so web and API share one origin: no CORS, and the session
 * cookie behaves exactly as it does in development.
 *
 * @type {import('next').NextConfig}
 */
const apiOrigin = process.env.API_ORIGIN ?? 'http://127.0.0.1:4000';

const nextConfig = {
  reactStrictMode: true,
  // The shared workspace ships TypeScript source with no build step, so Next has
  // to compile it alongside the app.
  
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    };
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
