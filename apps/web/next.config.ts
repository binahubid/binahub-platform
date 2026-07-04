import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ams/shared", "@ams/validation"],
};

export default nextConfig;
