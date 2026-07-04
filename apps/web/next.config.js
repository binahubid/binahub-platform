/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@ams/shared', '@ams/ui'],
  experimental: {
    optimizePackageImports: ['lucide-react']
  }
};

module.exports = nextConfig;
