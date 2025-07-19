# Venue Explorer FastAPI Backend

This is the FastAPI conversion of the Next.js Venue Explorer API. The backend provides a comprehensive REST API for discovering music venues, shows, and artists across the Pacific Northwest.

## Architecture Overview

The FastAPI backend replaces the Next.js API routes with a dedicated Python-based API server, offering:

- **High Performance**: FastAPI with async/await support
- **Type Safety**: Pydantic models for request/response validation
- **Documentation**: Automatic OpenAPI/Swagger documentation
- **Monitoring**: Built-in performance tracking and health checks
- **Scalability**: Designed for horizontal scaling

## Key Features

### 🚀 **Performance**
- Async database operations with SQLAlchemy
- Connection pooling for optimal database performance
- Response time monitoring and optimization
- Elasticsearch integration for fast search

### 🔍 **Search & Discovery**
- Universal search across venues, artists, and events
- Geographic proximity search with PostGIS
- Advanced filtering and faceted search
- Real-time search suggestions

### 🗺️ **Geographic Features**
- PostGIS integration for spatial queries
- Distance-based venue discovery
- Region-based navigation (WA, OR, ID, BC)
- Coordinate-based search with radius filtering

### 🔐 **Security & Authentication**
- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting and request validation
- CORS configuration for web clients

## Project Structure

```
venue-explorer-api/
├── main.py                     # FastAPI application entry point
├── requirements.txt            # Python dependencies
├── Dockerfile                  # Container configuration
├── docker-compose.yml          # Multi-service setup
├── app/
│   ├── core/
│   │   ├── config.py          # Application settings
│   │   ├── database.py        # Database configuration
│   │   ├── error_handler.py   # Error handling utilities
│   │   └── monitoring.py      # Performance monitoring
│   ├── api/
│   │   └── routers/           # API route handlers
│   │       ├── health.py      # Health check endpoints
│   │       ├── venues.py      # Venue management
│   │       ├── artists.py     # Artist profiles
│   │       ├── events.py      # Event listings
│   │       ├── search.py      # Search endpoints
│   │       ├── cities.py      # City navigation
│   │       ├── regions.py     # Region navigation
│   │       └── users.py       # User management
│   ├── schemas/
│   │   └── models.py          # Pydantic models
│   ├── repositories/          # Data access layer
│   ├── services/              # Business logic
│   └── utils/                 # Utility functions
```

## Quick Start

### Using Docker (Recommended)

1. **Clone and navigate to the API directory:**
   ```bash
   cd venue-explorer-api
   ```

2. **Start all services with Docker Compose:**
   ```bash
   docker-compose up -d
   ```

3. **Access the API:**
   - API: http://localhost:8000
   - Documentation: http://localhost:8000/docs
   - Database: localhost:5432
   - Elasticsearch: http://localhost:9200

### Manual Setup

1. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Run database migrations:**
   ```bash
   alembic upgrade head
   ```

4. **Start the development server:**
   ```bash
   uvicorn main:app --reload
   ```

## API Conversion Details

### From Next.js API Routes to FastAPI

| Next.js Route | FastAPI Equivalent | Notes |
|---------------|-------------------|-------|
| `app/api/health/route.ts` | `GET /api/health` | Health monitoring with metrics |
| `app/api/venues/[venue]/route.ts` | `GET /api/venues/{venue_id}` | Path parameters with validation |
| `app/api/search/route.ts` | `GET /api/search` | Query parameter validation |
| `app/api/search/nearby/route.ts` | `GET /api/search/nearby` | Geographic search |

### Key Improvements

1. **Type Safety**: Pydantic models replace TypeScript interfaces
2. **Validation**: Automatic request/response validation
3. **Documentation**: Auto-generated OpenAPI docs
4. **Error Handling**: Centralized error management
5. **Monitoring**: Built-in performance tracking

### Request/Response Format

**Next.js Error Response:**
```typescript
{
  error: {
    code: "VENUE_NOT_FOUND",
    message: "Venue with ID 123 not found",
    details: {}
  }
}
```

**FastAPI Error Response:**
```json
{
  "error": {
    "code": "VENUE_NOT_FOUND", 
    "message": "Venue with ID 123 not found",
    "details": {"entity_type": "Venue", "entity_id": 123},
    "request_id": "uuid-string"
  }
}
```

## Environment Configuration

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL=postgresql://venue_user:venue_password@localhost:5432/venue_explorer

# Security
SECRET_KEY=your-super-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here
JWT_EXPIRE_MINUTES=30

# Search
ELASTICSEARCH_URL=http://localhost:9200

# External APIs
BANDSINTOWN_API_KEY=your-api-key
SONGKICK_API_KEY=your-api-key
TICKETMASTER_API_KEY=your-api-key

# Development
DEBUG=true
```

## Available Endpoints

### Core Endpoints

- `GET /api/health` - System health check
- `GET /api/venues/{venue_id}` - Get venue details
- `GET /api/venues/nearby` - Find nearby venues
- `GET /api/artists/{artist_id}` - Get artist profile
- `GET /api/events/{event_id}` - Get event details

### Search Endpoints

- `GET /api/search` - Universal search
- `GET /api/search/nearby` - Geographic search

### Navigation Endpoints

- `GET /api/regions` - List all regions
- `GET /api/regions/{region}/cities` - Cities in region
- `GET /api/cities/{city_id}/venues` - Venues in city

### User Endpoints

- `POST /api/users/register` - User registration
- `POST /api/users/login` - User authentication
- `GET /api/users/me` - Current user profile
- `POST /api/users/favorites` - Add to favorites

## Testing

### Run Tests
```bash
pytest
```

### API Testing
```bash
# Health check
curl http://localhost:8000/api/health

# Search venues
curl "http://localhost:8000/api/search?q=jazz&type=venue"

# Nearby venues
curl "http://localhost:8000/api/venues/nearby?lat=47.6062&lon=-122.3321&radius=10"
```

## Migration Notes

### Database Schema
The database schema remains unchanged from the Next.js version. All existing PostgreSQL tables and PostGIS extensions are compatible.

### Frontend Integration
The FastAPI backend maintains API compatibility with the existing React frontend. Only the base URL needs to be updated.

### Performance Monitoring
FastAPI includes enhanced monitoring capabilities:
- Request/response time tracking
- Database query performance
- Error rate monitoring
- Health check endpoints

## Deployment

### Production Considerations

1. **Environment Variables**: Use production secrets
2. **Database**: Configure connection pooling
3. **CORS**: Restrict origins in production
4. **Rate Limiting**: Implement API rate limits
5. **Logging**: Configure structured logging
6. **Monitoring**: Set up health check monitoring

### Docker Deployment
```bash
# Build production image
docker build -t venue-explorer-api .

# Run with environment file
docker run --env-file .env -p 8000:8000 venue-explorer-api
```

## Contributing

1. Follow Python PEP 8 style guidelines
2. Add type hints to all functions
3. Write tests for new endpoints
4. Update documentation for API changes
5. Use async/await for database operations

## Support

For questions or issues with the FastAPI conversion, please refer to:
- FastAPI Documentation: https://fastapi.tiangolo.com/
- SQLAlchemy Documentation: https://docs.sqlalchemy.org/
- Pydantic Documentation: https://docs.pydantic.dev/
