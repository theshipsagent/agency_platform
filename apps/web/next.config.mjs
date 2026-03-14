/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@shipops/shared', '@shipops/db', '@shipops/services'],
  experimental: {
    typedRoutes: false,
  },
}

export default nextConfig
