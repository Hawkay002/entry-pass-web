import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use the TypeScript CLI directly so we can run TS 7.0.2
  // (Next 16's built-in type-checker requires TS <=6 otherwise).
  experimental: {
    useTypeScriptCli: true,
  },
  turbopack: {
    // Pin the workspace root to this project so Next doesn't mis-detect
    // the stray package-lock.json in the user's home directory.
    root: __dirname,
  },
  // Allow the Cloudflare tunnel (and other dev origins) to use HMR.
  allowedDevOrigins: ["painting-gained-ward-cache.trycloudflare.com"],
};

export default nextConfig;
