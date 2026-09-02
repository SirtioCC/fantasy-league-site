import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The compare view now lives inside /head-to-head, next to the rivalry
  // record it overlapped with. Keep old links working.
  async redirects() {
    return [{ source: '/compare', destination: '/head-to-head', permanent: true }];
  },
};

export default nextConfig;
