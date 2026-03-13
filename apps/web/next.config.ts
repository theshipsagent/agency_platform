import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@shipops/shared', '@shipops/db', '@shipops/services'],
  experimental: {
    typedRoutes: true,
  },
}

export default nextConfig
