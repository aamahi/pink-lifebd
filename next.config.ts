import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Product photographs are pre-cut webp files in /public, served as-is by the <Img> primitive
  // (a plain <img>), so no image optimiser configuration is needed.
  images: { unoptimized: true },
};

export default nextConfig;
