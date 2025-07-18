import { NextRequest, NextResponse } from 'next/server';

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
 * Middleware to detect genre subdomains and add genre context to requests
 */
export function middleware(request: NextRequest) {
  // Get hostname (e.g., rock.venue-explorer.com)
  const hostname = request.headers.get('host') || '';
  
  // Extract potential genre from subdomain
  const subdomain = hostname.split('.')[0];
  
  // Check if the subdomain is a valid genre
  const isValidGenre = VALID_GENRES.includes(subdomain.toLowerCase());
  
  // Clone the request headers to add genre information
  const requestHeaders = new Headers(request.headers);
  
  if (isValidGenre) {
    // Add genre to request headers for downstream processing
    requestHeaders.set('x-genre-filter', subdomain.toLowerCase());
  } else {
    // Remove any existing genre filter if not a valid genre subdomain
    requestHeaders.delete('x-genre-filter');
  }
  
  // Create a new response with modified headers
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  
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