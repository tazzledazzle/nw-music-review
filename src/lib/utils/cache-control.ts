import { NextResponse } from 'next/server';

/**
 * Cache control configuration for different content types
 */
export const CACHE_CONTROL = {
  /**
   * Static content that rarely changes (24 hours)
   * Use for: region lists, city lists, venue details
   */
  STATIC: 'public, max-age=86400, s-maxage=172800, stale-while-revalidate=604800',
  
  /**
   * Content that changes occasionally (5 minutes)
   * Use for: venue listings, artist profiles
   */
  STANDARD: 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600',
  
  /**
   * Dynamic content that changes frequently (1 minute)
   * Use for: search results, upcoming events
   */
  DYNAMIC: 'public, max-age=60, s-maxage=120, stale-while-revalidate=600',
  
  /**
   * Real-time content that should not be cached
   * Use for: user-specific content, authentication
   */
  REALTIME: 'private, no-cache, no-store, must-revalidate',
  
  /**
   * CDN-optimized content (1 year)
   * Use for: static assets, images, fonts
   */
  CDN: 'public, max-age=31536000, immutable',
};

/**
 * Apply cache control headers to a response
 * @param response NextResponse object
 * @param cacheType Type of cache control to apply
 * @returns NextResponse with cache headers
 */
export function withCacheControl(
  response: NextResponse,
  cacheType: keyof typeof CACHE_CONTROL
): NextResponse {
  response.headers.set('Cache-Control', CACHE_CONTROL[cacheType]);
  return response;
}

/**
 * Generate ETag for content-based caching
 * @param content Content to generate ETag for
 * @returns ETag string
 */
export function generateETag(content: string | object): string {
  const str = typeof content === 'string' ? content : JSON.stringify(content);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `"${hash.toString(16)}"`;
}

/**
 * Apply ETag header to a response
 * @param response NextResponse object
 * @param content Content to generate ETag from
 * @returns NextResponse with ETag header
 */
export function withETag(response: NextResponse, content: string | object): NextResponse {
  const etag = generateETag(content);
  response.headers.set('ETag', etag);
  return response;
}

/**
 * Apply both cache control and ETag headers to a response
 * @param response NextResponse object
 * @param cacheType Type of cache control to apply
 * @param content Content to generate ETag from
 * @returns NextResponse with cache headers and ETag
 */
export function withCaching(
  response: NextResponse,
  cacheType: keyof typeof CACHE_CONTROL,
  content: string | object
): NextResponse {
  return withETag(withCacheControl(response, cacheType), content);
}

/**
 * Determine appropriate cache type based on request path
 * @param path Request path
 * @returns Appropriate cache type
 */
export function getCacheTypeForPath(path: string): keyof typeof CACHE_CONTROL {
  // Static content
  if (
    path.match(/^\/api\/regions\/?$/) ||
    path.match(/^\/api\/regions\/[^/]+\/cities\/?$/) ||
    path.match(/^\/api\/venues\/\d+\/?$/)
  ) {
    return 'STATIC';
  }
  
  // Standard content
  if (
    path.match(/^\/api\/cities\/[^/]+\/venues\/?$/) ||
    path.match(/^\/api\/artists\/\d+\/?$/)
  ) {
    return 'STANDARD';
  }
  
  // Dynamic content
  if (
    path.match(/^\/api\/search/) ||
    path.match(/^\/api\/venues\/\d+\/events/) ||
    path.match(/^\/api\/events\/\d+/) ||
    path.match(/^\/api\/artists\/\d+\/events/)
  ) {
    return 'DYNAMIC';
  }
  
  // Real-time content (user-specific)
  if (
    path.match(/^\/api\/users/) ||
    path.match(/^\/api\/favorites/)
  ) {
    return 'REALTIME';
  }
  
  // Default to dynamic
  return 'DYNAMIC';
}