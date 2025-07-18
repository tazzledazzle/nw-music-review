import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Enable hostname rewrites for genre subdomains
  async rewrites() {
    return {
      beforeFiles: [
        // Handle genre subdomains by rewriting to the same path but preserving the subdomain info
        // This works with our middleware which extracts the genre from the hostname
        {
          source: '/:path*',
          has: [
            {
              type: 'host',
              value: '(?<genre>.*)\\.venue-explorer\\.com',
            },
          ],
          destination: '/:path*',
        },
      ],
    };
  },
  
  // Configure domain handling and image optimization
  images: {
    domains: ['venue-explorer.com'],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400, // 1 day cache for images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },
  
  // Configure static asset caching
  async headers() {
    return [
      // Cache static assets with long TTL
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache fonts with long TTL
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache images with medium TTL
      {
        source: '/_next/image/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
      // Cache Next.js bundles with long TTL
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Add security headers to all pages
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  
  // Enable compression for better performance
  compress: true,
  
  // Configure build optimization
  swcMinify: true,
  
  // Configure production source maps
  productionBrowserSourceMaps: false,
  
  // Configure runtime configuration
  publicRuntimeConfig: {
    // Public config exposed to the client
    appName: 'Venue Explorer',
    appVersion: '1.0.0',
  },
  
  // Configure server runtime configuration
  serverRuntimeConfig: {
    // Private config only available on the server
    dbConnectionLimit: 10,
    apiTimeout: 5000, // 5 seconds
  },
  
  // Configure page performance measurement
  experimental: {
    // Enable server components for better performance
    serverComponents: true,
    // Enable optimized font loading
    optimizeFonts: true,
    // Enable scroll restoration
    scrollRestoration: true,
  },
};

export default nextConfig;
