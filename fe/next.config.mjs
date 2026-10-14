/**
 * Security headers of every page (the API under /api/* sets its own with helmet).
 * The CSP only covers framing, <base> and plugins for now: blocking inline scripts needs a per-request nonce
 * (middleware), a later step. A future embed route (UC-10) needs its own frame-ancestors.
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self'",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // A second dev server (e.g. a Turbopack trial) needs its own build folder: NEXT_DIST_DIR=.next-turbo.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  reactStrictMode: true,
  poweredByHeader: false,
  // Tối ưu hoá bundling đồ hoạ 3D & shared packages
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei", "@wrapfit/shared"],
  // Tắt source maps trong production để tiết kiệm RAM build
  productionBrowserSourceMaps: false,
  async headers() {
    return [{ source: "/((?!api/).*)", headers: securityHeaders }];
  },
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
      // The studio is /editor/<project id> (docs/12 D1): every older entry point starts a new project. Not permanent,
      // so the paths stay free for later pages. The query (e.g. ?template=) is kept.
      ...['/editor', '/editor/studio', '/editor/step-1', '/editor/step-2', '/editor/step-3', '/editor/step-4'].map(
        (source) => ({ source, destination: '/editor/new', permanent: false }),
      ),
      // Former Stitch screens now living elsewhere: exported print files, the structure pages, the materials.
      { source: '/editor/export', destination: '/dashboard/orders', permanent: false },
      { source: '/editor/inspect/fefco', destination: '/structures/tuck-top', permanent: false },
      { source: '/editor/materials/backdrop', destination: '/dashboard/materials', permanent: false },
    ];
  },
  // The browser calls the API on this origin (/api), so the session cookies are first-party. `output: "standalone"`
  // fixes the destination at build time: BACKEND_INTERNAL_URL must be set when building (see fe/Dockerfile).
  async rewrites() {
    const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://localhost:8080';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
