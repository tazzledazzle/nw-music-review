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
  
  // Configure domain handling
  images: {
    domains: ['venue-explorer.com'],
  },
};

export default nextConfig;
