# Search API Documentation

This directory contains the search API endpoints for the Venue Explorer platform, providing comprehensive search capabilities across venues, artists, and events with geographic filtering.

## Endpoints

### GET /api/search

Universal search endpoint that searches across venues, artists, and events with comprehensive filtering and categorization capabilities.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | Yes | Search query string |
| `type` | enum | No | Content type filter (`venue`, `artist`, `event`, `all`). Default: `all` |
| `page` | number | No | Page number for pagination. Default: `1` |
| `limit` | number | No | Results per page (max 50). Default: `10` |
| `genres` | string | No | Comma-separated list of genres to filter by |
| `state_province` | string | No | Comma-separated list of states/provinces |
| `country` | string | No | Comma-separated list of countries |
| `capacity_min` | number | No | Minimum venue capacity |
| `capacity_max` | number | No | Maximum venue capacity |
| `prosper_rank_min` | number | No | Minimum prosper rank for venues |
| `start_date` | string | No | Start date for event filtering (ISO string) |
| `end_date` | string | No | End date for event filtering (ISO string) |
| `has_tickets` | boolean | No | Filter events with ticket links |
| `has_bio` | boolean | No | Filter artists with bios |
| `has_photo` | boolean | No | Filter artists with photos |
| `sort_by` | string | No | Field to sort by |
| `sort_dir` | enum | No | Sort direction (`asc`, `desc`). Default: `desc` |

#### Example Requests

```bash
# Basic search
GET /api/search?q=rock

# Search venues in Washington with capacity > 500
GET /api/search?q=music&type=venue&state_province=WA&capacity_min=500

# Search upcoming events with tickets
GET /api/search?q=concert&type=event&start_date=2024-01-01T00:00:00Z&has_tickets=true
```

#### Response Format

```json
{
  "query": "rock",
  "type": "all",
  "results": {
    "venues": {
      "total": 15,
      "items": [
        {
          "id": 1,
          "name": "The Crocodile",
          "address": "2200 2nd Ave, Seattle, WA",
          "location": { "lat": 47.6062, "lon": -122.3321 },
          "capacity": 400,
          "prosper_rank": 8,
          "city": {
            "id": 1,
            "name": "Seattle",
            "state_province": "WA",
            "country": "US"
          },
          "score": 1.5
        }
      ]
    },
    "artists": {
      "total": 8,
      "items": [
        {
          "id": 1,
          "name": "Pearl Jam",
          "genres": ["rock", "grunge"],
          "photo_url": "https://example.com/pearl-jam.jpg",
          "profile_bio": "Legendary Seattle rock band...",
          "score": 2.1
        }
      ]
    },
    "events": {
      "total": 23,
      "items": [
        {
          "id": 1,
          "title": "Rock Night at The Crocodile",
          "description": "An evening of local rock bands",
          "event_datetime": "2024-12-01T20:00:00Z",
          "ticket_url": "https://example.com/tickets",
          "venue": {
            "id": 1,
            "name": "The Crocodile",
            "location": { "lat": 47.6062, "lon": -122.3321 },
            "city": { "name": "Seattle", "state_province": "WA", "country": "US" }
          },
          "artists": [
            { "id": 1, "name": "Local Band", "genres": ["rock"] }
          ],
          "score": 1.8
        }
      ]
    }
  },
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 46,
    "total_pages": 5
  },
  "filters": {
    "type": "all",
    "genres": null,
    "state_province": null,
    "country": null
  }
}
```

### GET /api/search/nearby

Geographic search endpoint that finds venues, artists, and events within a specified radius of a given location.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `lat` | number | Yes | Latitude coordinate (-90 to 90) |
| `lon` | number | Yes | Longitude coordinate (-180 to 180) |
| `radius` | number | No | Search radius in kilometers (0.1 to 500). Default: `25` |
| `q` | string | No | Optional search query string |
| `type` | enum | No | Content type filter (`venue`, `artist`, `event`, `all`). Default: `all` |
| `page` | number | No | Page number for pagination. Default: `1` |
| `limit` | number | No | Results per page (max 50). Default: `10` |
| `genres` | string | No | Comma-separated list of genres to filter by |
| `capacity_min` | number | No | Minimum venue capacity |
| `capacity_max` | number | No | Maximum venue capacity |
| `prosper_rank_min` | number | No | Minimum prosper rank for venues |
| `start_date` | string | No | Start date for event filtering (ISO string) |
| `end_date` | string | No | End date for event filtering (ISO string) |
| `has_tickets` | boolean | No | Filter events with ticket links |
| `upcoming_only` | boolean | No | Filter events to upcoming only. Default: `false` |
| `sort_by_distance` | boolean | No | Sort results by distance. Default: `true` |

#### Geographic Restrictions

This endpoint only accepts coordinates within the Pacific Northwest region:
- **Latitude**: 42.0 to 60.0
- **Longitude**: -139.0 to -110.0

This covers Washington, Oregon, Idaho, and British Columbia.

#### Example Requests

```bash
# Find venues within 25km of Seattle
GET /api/search/nearby?lat=47.6062&lon=-122.3321

# Find upcoming events within 50km of Portland
GET /api/search/nearby?lat=45.5152&lon=-122.6784&radius=50&type=event&upcoming_only=true

# Find rock venues within 10km with capacity > 200
GET /api/search/nearby?lat=47.6062&lon=-122.3321&radius=10&type=venue&genres=rock&capacity_min=200
```

#### Response Format

```json
{
  "query": "",
  "location": { "lat": 47.6062, "lon": -122.3321 },
  "radius": 25,
  "type": "all",
  "results": {
    "venues": {
      "total": 12,
      "items": [
        {
          "id": 1,
          "name": "The Crocodile",
          "address": "2200 2nd Ave, Seattle, WA",
          "location": { "lat": 47.6062, "lon": -122.3321 },
          "capacity": 400,
          "prosper_rank": 8,
          "city": {
            "id": 1,
            "name": "Seattle",
            "state_province": "WA",
            "country": "US"
          },
          "distance": 0.15,
          "score": 1.5
        }
      ]
    },
    "artists": {
      "total": 5,
      "items": [
        {
          "id": 1,
          "name": "Local Artist",
          "genres": ["indie", "rock"],
          "photo_url": "https://example.com/artist.jpg",
          "profile_bio": "Seattle-based indie artist",
          "score": 1.2
        }
      ]
    },
    "events": {
      "total": 18,
      "items": [
        {
          "id": 1,
          "title": "Concert at The Crocodile",
          "description": "Live music event",
          "event_datetime": "2024-12-01T20:00:00Z",
          "ticket_url": "https://example.com/tickets",
          "venue": {
            "id": 1,
            "name": "The Crocodile",
            "location": { "lat": 47.6062, "lon": -122.3321 },
            "city": { "name": "Seattle", "state_province": "WA", "country": "US" },
            "distance": 0.15
          },
          "artists": [
            { "id": 1, "name": "Performer", "genres": ["rock"] }
          ],
          "distance": 0.15,
          "score": 1.8
        }
      ]
    }
  },
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 35,
    "total_pages": 4
  },
  "filters": {
    "location": { "lat": 47.6062, "lon": -122.3321 },
    "radius": 25,
    "type": "all",
    "upcoming_only": false,
    "sort_by_distance": true
  }
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid query parameters",
  "details": [
    {
      "path": ["q"],
      "message": "Invalid input: expected string, received undefined"
    }
  ]
}
```

### 503 Service Unavailable
```json
{
  "error": "Search service is currently unavailable"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

## Features

### Result Categorization
- Results are automatically categorized by type (venues, artists, events)
- Each category includes total count and paginated items
- Relevance scoring for ranking results

### Geographic Search
- Radius-based search with distance calculations
- Regional filtering (WA, OR, ID, BC only)
- Distance sorting for nearby results

### Advanced Filtering
- Genre-based filtering across all content types
- Venue capacity and prosper rank filtering
- Date range filtering for events
- Boolean filters (has_tickets, has_bio, has_photo)

### Performance Optimizations
- Parameter validation with Zod schemas
- Elasticsearch health checking
- Configurable pagination limits
- Efficient query builders

## Dependencies

- **Elasticsearch**: Full-text search and geographic queries
- **Zod**: Parameter validation and type safety
- **Next.js**: API route handling
- **TypeScript**: Type safety and development experience

## Testing

The search API includes comprehensive test coverage:

- **Unit Tests**: Parameter validation, search logic, error handling
- **Integration Tests**: End-to-end API functionality
- **Mock Tests**: Elasticsearch service mocking for reliable testing

Run tests with:
```bash
npm test -- --run src/app/api/search
```