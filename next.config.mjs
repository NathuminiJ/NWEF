import path from 'node:path';
import os from 'node:os';
import Module from 'node:module';

/** OneDrive placeholders are reparse points and break Next.js file reads. */
const onOneDrive = process.platform === 'win32' && process.cwd().toLowerCase().includes('\\onedrive\\');
const buildDirectory = onOneDrive
  ? path.relative(process.cwd(), path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'nwef-next'))
  : '.next';

if (onOneDrive) {
  const projectModules = path.join(process.cwd(), 'node_modules');
  process.env.NODE_PATH = [projectModules, process.env.NODE_PATH].filter(Boolean).join(path.delimiter);
  if (typeof Module._initPaths === 'function') Module._initPaths();
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: buildDirectory,
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'www.eastwest.lk', pathname: '/images/**' }],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
