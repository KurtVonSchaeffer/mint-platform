import type { NextConfig } from 'next';

const config: NextConfig = {
  productionBrowserSourceMaps: false,
  webpack(cfg) {
    // Stop source-map-loader fetching .map files from packages that don't
    // ship them (e.g. Framer Motion via @paper-design/shaders-react).
    // Eliminates the LayoutGroupContext.mjs.map 404 in dev tools.
    cfg.ignoreWarnings = [
      ...(cfg.ignoreWarnings ?? []),
      { module: /node_modules/ },
    ];
    return cfg;
  },
};

export default config;
