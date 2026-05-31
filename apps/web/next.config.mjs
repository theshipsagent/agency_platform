/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@shipops/shared', '@shipops/db', '@shipops/services'],
  experimental: {
    typedRoutes: false,
    // Keep pdfkit out of the RSC bundle too (some Next codepaths consult this).
    serverComponentsExternalPackages: ['pdfkit'],
  },
  // PDFKit (and its fontkit transitive deps) load AFM font-metric files at
  // runtime via fs.readFileSync against paths inside their own node_modules.
  // Webpack's default behavior bundles the JS but not those data files, so
  // the require fails at first-use with ENOENT. The reliable fix for any
  // Node-native package with runtime asset loading is to mark them as
  // server-side externals so they remain plain Node requires resolved from
  // node_modules at runtime. fontkit and friends are transitive deps that
  // also touch fs — externalize the whole chain.
  webpack: (config, { isServer }) => {
    if (isServer) {
      const externals = Array.isArray(config.externals)
        ? config.externals
        : [config.externals].filter(Boolean)
      externals.push(
        'pdfkit',
        'fontkit',
        'linebreak',
        'unicode-properties',
        'unicode-trie',
        'restructure',
        'tiny-inflate',
        'brotli',
        'crypto-js',
        'png-js'
      )
      config.externals = externals
    }
    return config
  },
}

export default nextConfig
