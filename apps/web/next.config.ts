import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: ["@ams/shared", "@ams/ui", "@ams/validation"],
  outputFileTracingRoot: path.join(__dirname, "../../"),
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
