import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  basePath: "/web",
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
