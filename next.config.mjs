import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The browser talks only to Next.js (decision D002). Every `/api/*` request the
 * page makes - from the browser or from a server component - is forwarded to the
 * Express process, so web and API share one origin: no CORS, and the session
 * cookie behaves exactly as it does in development.
 *
 * @type {import('next').NextConfig}
 */
const apiOrigin = process.env.API_ORIGIN ?? 'http://127.0.0.1:4000';
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  reactStrictMode: true,
  // `shared/` ships TypeScript source with no build step, so Next has to compile
  // it alongside the app.
  webpack: (config) => {
    // Resolve `@/...` from the project root here, in webpack, instead of leaving
    // it to the tsconfig `paths` lookup. The lookup covers typechecking and the
    // editor but not reliably every webpack compiler (the client one in
    // particular), which is why `@/shared/index` failed in some components while
    // the identical relative import worked. Webpack matches an alias on path
    // boundaries, so `@` covers `@/shared/index` and still leaves a scoped
    // package such as `@tanstack/react-query` alone.
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': projectRoot,
    };
    // `shared/schemas/*` import each other with NodeNext-style `../permissions.js`
    // specifiers, which have to land on the TypeScript source.
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
