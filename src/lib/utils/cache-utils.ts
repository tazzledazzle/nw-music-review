import { NextRequest, NextResponse } from 'next/server';

/**
 * Cache control options for API responses
 */
export type CacheControlOptions = {
  maxAge?: number;       // Max age in seconds
  staleWhileRevalidate?: number; // Stale while revalidate in seconds
  public?: boolean;      // Whether cache is public or private
  immutable?: boolean;   // Whether content is immutable
};

/**
 * Default cache control options
 */
const DEFAULT_CACHE_OPTIONS: CacheControlOptions = {
  maxAge: 60,            // 1 minute
  staleWhileRevalidate: 600, // 10 minutes
  public: true,
  immutable: false,
};

/**
 * Generate cache control header value
 * @param options Cache control options
 * @returns Cache control header value
 */
export function generateCacheControlHeader(options: CacheControlOptions = {}): string {
  const opts = { ...DEFAULT_CACHE_OPTIONS, ...options };
  
  const directives = [
    opts.public ? 'public' : 'private',
    `max-age=${opts.maxAge}`,
    `s-maxage=${opts.maxAge * 2}`, // CDN cache typically longer
    `stale-while-revalidate=${opts.staleWhileRevalidate}`,
  ];
  
  if (opts.immutable) {
    directives.push('immutable');
  }
  
  return directives.join(', ');
}

/**
 * Apply cache control headers to a response
 * @param response NextResponse object
 * @param options Cache control options
 * @returns NextResponse with cache headers
 */
export function applyCacheHeaders(
  response: NextResponse,
  options: CacheControlOptions = {}
): NextResponse {
  const cacheControl = generateCacheControlHeader(options);
  response.headers.set('Cache-Control', cacheControl);
  return response;
}

/**
 * Cache configuration for different content types
 */
export const CACHE_CONFIGS = {
  // Static content that rarely changes
  STATIC: {
    maxAge: 86400, // 24 hours
    staleWhileRevalidate: 604800, // 7 days
    public: true,
    immutable: false,
  },
  
  // Content that changes occasionally
  STANDARD: {
    maxAge: 300, // 5 minutes
    staleWhileRevalidate: 3600, // 1 hour
    public: true,
    immutable: false,
  },
  
  // Dynamic content that changes frequently
  DYNAMIC: {
    maxAge: 60, // 1 minute
    staleWhileRevalidate: 600, // 10 minutes
    public: true,
    immutable: false,
  },
  
  // Real-time content that should not be cached
  REALTIME: {
    maxAge: 0,
    staleWhileRevalidate: 0,
    public: false,
    immutable: false,
  },
};

/**
 * Determine cache config based on request path
 * @param path Request path
 * @returns Appropriate cache configuration
 */
export function getCacheConfigForPath(path: string): CacheControlOptions {
  // Static content
  if (
    path.includes('/api/regions') ||
    path.includes('/api/cities') ||
    path.match(/\/api\/venues\/\d+$/)
  ) {
    return CACHE_CONFIGS.STATIC;
  }
  
  // Standard content
  if (
    path.includes('/api/search') ||
    path.includes('/api/artists')
  ) {
    return CACHE_CONFIGS.STANDARD;
  }
  
  // Dynamic content
  if (
    path.match(/\/api\/venues\/\d+\/events/) ||
    path.match(/\/api\/events\/\d+/)
  ) {
    return CACHE_CONFIGS.DYNAMIC;
  }
  
  // Real-time content (user-specific)
  if (
    path.includes('/api/users') ||
    path.includes('/api/favorites')
  ) {
    return CACHE_CONFIGS.REALTIME;
  }
  
  // Default to dynamic
  return CACHE_CONFIGS.DYNAMIC;
}

/**
 * Cache middleware for API routes
 * @param request NextRequest object
 * @param response NextResponse object
 * @returns NextResponse with cache headers
 */
export function withCaching(request: NextRequest, response: NextResponse): NextResponse {
  const path = request.nextUrl.pathname;
  
  // Skip caching for non-GET requests
  if (request.method !== 'GET') {
    return response;
  }
  
  // Skip caching for authenticated requests
  if (request.headers.get('Authorization')) {
    return response;
  }
  
  // Get cache config based on path
  const cacheConfig = getCacheConfigForPath(path);
  
  // Apply cache headers
  return applyCacheHeaders(response, cacheConfig);
}