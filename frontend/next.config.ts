import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Emits a plain out/ directory for S3 + CloudFront hosting. Set before any
  // feature work so server-only constructs fail at build time, not deploy time.
  output: 'export',
  // No Next.js image optimizer exists behind static hosting.
  images: { unoptimized: true },
  // Emits nested routes as directories with index.html, which is what S3
  // static website hosting expects.
  trailingSlash: true,
};

export default nextConfig;
