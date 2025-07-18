# Elasticsearch Integration

This directory contains the Elasticsearch integration for the Venue Explorer platform, providing powerful search capabilities across venues, artists, and events.

## Overview

The search system consists of three main components:

1. **ElasticsearchService** (`elasticsearch.ts`) - Core search operations and index management
2. **IndexingService** (`indexing-service.ts`) - Data synchronization between database and search indices
3. **Query Builders** (`query-builders.ts`) - Structured query building for different search scenarios

## Features

### Search Capabilities
- **Full-text search** across venues, artists, and events
- **Geographic search** with radius-based filtering
- **Date range filtering** for events
- **Genre-based filtering** for artists and events
- **Autocomplete suggestions** for search inputs
- **Categorized search results** by content type

### Index Management
- **Automatic index creation** with optimized mappings
- **Bulk indexing** for efficient data synchronization
- **Real-time updates** for individual documents
- **Health monitoring** and status checks

### Query Features
- **Fuzzy matching** for typo tolerance
- **Boosted fields** for relevance scoring
- **Geographic sorting** by distance
- **Prosper rank prioritization** for venues
- **Nested queries** for complex relationships

## Setup

### Prerequisites
- Elasticsearch 8.x running on `localhost:9200` (or configured via environment variables)
- PostgreSQL database with venue data

### Environment Variables
```bash
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_USERNAME=elastic  # optional
ELASTICSEARCH_PASSWORD=changeme # optional
```

### Installation
1. Install dependencies (already included in package.json):
   ```bash
   npm install
   ```

2. Initialize Elasticsearch indices:
   ```bash
   npm run es:init
   ```

3. Sync data from database:
   ```bash
   npm run es:sync
   ```

4. Or do both in one command:
   ```bash
   npm run es:setup
   ```

## Usage

### Basic Search
```typescript
import { elasticsearchService } from './lib/search/elasticsearch';

// Search across all content types
const results = await elasticsearchService.searchAll('rock concert');

// Search venues near a location
const venues = await elasticsearchService.searchVenues('music hall', {
  lat: 47.6062,
  lon: -122.3321,
  radius: 10,
  page: 1,
  limit: 20
});

// Search artists by genre
const artists = await elasticsearchService.searchArtists('indie', {
  genres: ['indie', 'alternative'],
  has_photo: true
});

// Search upcoming events
const events = await elasticsearchService.searchEvents('concert', {
  start_date: new Date(),
  end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  lat: 47.6062,
  lon: -122.3321,
  radius: 25
});
```

### Data Indexing
```typescript
import { indexingService } from './lib/search/indexing-service';

// Index a single venue
await indexingService.indexVenue(venueId);

// Index a single artist
await indexingService.indexArtist(artistId);

// Index a single event
await indexingService.indexEvent(eventId);

// Remove from index
await indexingService.removeFromIndex('venue', venueId);

// Full data sync
await indexingService.fullSync();
```

### Autocomplete Suggestions
```typescript
// Get search suggestions
const suggestions = await elasticsearchService.getSuggestions('sea');
// Returns: ['Seattle', 'Seaside Tavern', 'Sea Monster Lounge', ...]

// Type-specific suggestions
const venueSuggestions = await elasticsearchService.getSuggestions('par', 'venue');
```

## Index Mappings

### Venues Index
- **name**: Text with keyword and completion fields
- **address**: Text field for address search
- **location**: Geo-point for geographic queries
- **capacity**: Integer for venue size filtering
- **prosper_rank**: Integer for venue popularity ranking
- **city**: Nested object with city information

### Artists Index
- **name**: Text with keyword and completion fields
- **genres**: Keyword array for genre filtering
- **profile_bio**: Text field for bio search
- **photo_url**: Keyword field for media availability

### Events Index
- **title**: Text with keyword and completion fields
- **description**: Text field for event details
- **event_datetime**: Date field for temporal queries
- **venue**: Nested object with venue and location data
- **artists**: Nested array of associated artists
- **ticket_url**: Keyword field for ticket availability

## Query Builders

The query builders provide structured ways to build complex Elasticsearch queries:

### VenueQueryBuilder
- Geographic filtering with distance
- Capacity range filtering
- Prosper rank filtering
- State/province filtering

### ArtistQueryBuilder
- Genre filtering
- Bio/photo availability filtering
- Name-based search with boosting

### EventQueryBuilder
- Date range filtering
- Artist/venue association filtering
- Geographic filtering via venue location
- Genre filtering via associated artists

### SuggestionQueryBuilder
- Autocomplete suggestions
- Phrase suggestions for typo correction

## Performance Considerations

### Index Settings
- **Single shard** configuration for development
- **No replicas** for local development
- **Custom analyzers** for improved text search
- **Proper field mappings** for optimal query performance

### Search Optimization
- **Boosted fields** for relevance scoring
- **Minimum should match** for better precision
- **Fuzziness** for typo tolerance
- **Result pagination** with reasonable limits

### Bulk Operations
- **Batch indexing** for large data sets
- **Bulk updates** for efficient synchronization
- **Index refresh** control for immediate availability

## Monitoring and Health

### Health Checks
```bash
# Check Elasticsearch health
npm run es:health

# Or programmatically
const health = await indexingService.healthCheck();
console.log(health.healthy ? 'OK' : 'Error:', health.message);
```

### Logging
The indexing service provides console logging for:
- Index initialization progress
- Data synchronization status
- Error reporting and debugging

## Testing

Run the test suite to verify functionality:
```bash
npm test src/lib/search/__tests__/elasticsearch.test.ts
```

The tests cover:
- Index management operations
- Document indexing and retrieval
- Search operations with various filters
- Suggestion and autocomplete functionality
- Health monitoring and error handling

## Integration with API Routes

The search services are designed to integrate seamlessly with Next.js API routes:

```typescript
// pages/api/search/route.ts
import { elasticsearchService } from '@/lib/search/elasticsearch';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  
  const results = await elasticsearchService.searchAll(query, {
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '10')
  });
  
  return Response.json(results);
}
```

## Troubleshooting

### Common Issues

1. **Connection refused**: Ensure Elasticsearch is running on the configured port
2. **Index not found**: Run `npm run es:init` to create indices
3. **No search results**: Run `npm run es:sync` to populate indices with data
4. **Mapping conflicts**: Delete and recreate indices if schema changes

### Debug Mode
Set environment variable for detailed logging:
```bash
DEBUG=elasticsearch npm run es:setup
```