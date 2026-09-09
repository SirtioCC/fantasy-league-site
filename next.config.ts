import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // The compare view now lives inside /head-to-head, next to the
      // rivalry record it overlapped with. Keep old links working.
      { source: '/compare', destination: '/head-to-head', permanent: true },
      // Entry fees are fully collected for 2026; the page is retired.
      { source: '/dues', destination: '/', permanent: false },
    ];
  },
};

export default nextConfig;
