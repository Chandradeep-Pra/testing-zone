import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/web",
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
