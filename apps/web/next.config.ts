import type { NextConfig } from 'next';

const config: NextConfig = {
  output: 'standalone',
  // Suppress missing source-map 404s from dependencies (e.g. Framer Motion)
  productionBrowserSourceMaps: false,
};

export default config;
