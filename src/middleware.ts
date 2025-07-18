import { NextRequest, NextResponse } from 'next/server';
import { RequestTracker } from '@/lib/utils/monitoring';
import { randomUUID } from 'crypto';

// List of valid genres for subdomain filtering
export const VALID_GENRES = [
  'rock',
  'jazz',
  'electronic',
  'hiphop',
  'classical',
  'country',
  'blues',
  'folk',
  'metal',
  'pop',
  'indie',
  'punk',
  'reggae',
  'soul',
  'rnb',
  'world',
];

/**
 * Middleware to detect genre subdomains, add monitoring, and handle request tracking
 */
export function middleware(request: NextRequest) {
  const requestId = randomUUID();
  
  // Get hostname (e.g., rock.venue-explorer.com)
  const hostname = request.headers.get('host') || '';
  
  // Extract potential genre from subdomain
  const subdomain = hostname.split('.')[0];
  
  // Check if the subdomain is a valid genre
  const isValidGenre = VALID_GENRES.includes(subdomain.toLowerCase());
  
  // Clone the request headers to add genre and tracking information
  const requestHeaders = new Headers(request.headers);
  
  // Add request ID for tracking
  requestHeaders.set('x-request-id', requestId);
  
  if (isValidGenre) {
    // Add genre to request headers for downstream processing
    requestHeaders.set('x-genre-filter', subdomain.toLowerCase());
  } else {
    // Remove any existing genre filter if not a valid genre subdomain
    requestHeaders.delete('x-genre-filter');
  }
  
  // Track API requests
  if (request.nextUrl.pathname.startsWith('/api/')) {
    RequestTracker.startRequest(requestId, request.nextUrl.pathname, request.method);
  }
  
  // Create a new response with modified headers
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  
  // Add request ID to response headers for client tracking
  response.headers.set('x-request-id', requestId);
  
  // Add CORS headers for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-request-id');
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: response.headers });
    }
  }
  
  return response;
}

/**
 * Configure which paths the middleware runs on
 */
export const config = {
  // Run middleware on all paths except static files and api health check
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/|api/health).*)',
  ],
};