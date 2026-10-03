import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  basePath: process.env.NEXT_PUBLIC_APP_BASE_PATH ?? "/web",
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
