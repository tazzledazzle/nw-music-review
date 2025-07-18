# Genre Subdomains

The Venue Explorer platform supports genre-specific subdomains that filter all content by a particular music genre. This document explains how the feature works and how to use it.

## Overview

Users can access genre-specific versions of the platform by using subdomains like:

- rock.venue-explorer.com
- jazz.venue-explorer.com
- electronic.venue-explorer.com
- etc.

When a user accesses the site through a genre subdomain, all content (venues, artists, events) is automatically filtered to show only items related to that genre.

## Supported Genres

The following genres are supported as subdomains:

- rock
- jazz
- electronic
- hiphop
- classical
- country
- blues
- folk
- metal
- pop
- indie
- punk
- reggae
- soul
- rnb
- world

## Implementation Details

The genre subdomain functionality is implemented through several components:

1. **Middleware**: Detects the subdomain from the hostname and adds a genre filter header to the request
2. **Genre Context**: React context that makes the genre information available throughout the frontend
3. **Repository Layer**: Applies genre filtering to database queries
4. **Elasticsearch**: Applies genre filtering to search queries

### How It Works

1. When a request comes in, the middleware checks if the subdomain matches a valid genre
2. If it does, the middleware adds an `x-genre-filter` header to the request
3. API endpoints read this header and apply genre filtering to their queries
4. The frontend uses the genre context to display the current genre and maintain consistent filtering

## Development and Testing

### Local Development

For local development, you can simulate genre subdomains by:

1. Adding entries to your hosts file:
   ```
   127.0.0.1 rock.localhost
   127.0.0.1 jazz.localhost
   ```

2. Running the development server with the hostname option:
   ```
   npm run dev -- -H localhost
   ```

3. Accessing the site at `http://rock.localhost:3000`

### Testing

The genre subdomain functionality has dedicated tests in:
- `src/app/api/cities/[city]/venues/__tests__/genre-filtering.test.ts`

Run these tests with:
```
npm test -- genre-filtering
```

## Adding New Genres

To add support for a new genre:

1. Add the genre to the `VALID_GENRES` array in `src/middleware.ts`
2. Update any genre-specific UI components to include the new genre
3. Ensure that artists in the database are tagged with the new genre