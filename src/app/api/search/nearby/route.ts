import { NextRequest, NextResponse } from 'next/server';
import { elasticsearchService } from '@/lib/search/elasticsearch';
import { z } from 'zod';

// Nearby search parameters schema
const nearbyParamsSchema = z.object({
  lat: z.coerce.number().min(-90).max(90, 'Latitude must be between -90 and 90'),
  lon: z.coerce.number().min(-180).max(180, 'Longitude must be between -180 and 180'),
  radius: z.coerce.number().min(0.1).max(500).optional().default(25), // Default 25km radius
  q: z.string().optional().default(''), // Optional search query
  type: z.enum(['venue', 'artist', 'event', 'all']).optional().default('all'),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(50).optional().default(10),
  genres: z.string().optional().transform(val => val ? val.split(',') : undefined),
  capacity_min: z.coerce.number().min(0).optional(),
  capacity_max: z.coerce.number().min(0).optional(),
  prosper_rank_min: z.coerce.number().min(0).optional(),
  start_date: z.string().optional().transform(val => val ? new Date(val) : undefined),
  end_date: z.string().optional().transform(val => val ? new Date(val) : undefined),
  has_tickets: z.coerce.boolean().optional(),
  upcoming_only: z.coerce.boolean().optional().default(false),
  sort_by_distance: z.coerce.boolean().optional().default(true)
});

/**
 * GET /api/search/nearby
 * 
 * Geographic search endpoint that finds venues, artists, and events
 * within a specified radius of a given location.
 * 
 * Query Parameters:
 * - lat: Latitude coordinate (required, -90 to 90)
 * - lon: Longitude coordinate (required, -180 to 180)
 * - radius: Search radius in kilometers (0.1 to 500, default: 25)
 * - q: Optional search query string
 * - type: Content type filter (venue|artist|event|all, default: all)
 * - page: Page number for pagination (default: 1)
 * - limit: Results per page (max 50, default: 10)
 * - genres: Comma-separated list of genres to filter by
 * - capacity_min: Minimum venue capacity
 * - capacity_max: Maximum venue capacity
 * - prosper_rank_min: Minimum prosper rank for venues
 * - start_date: Start date for event filtering (ISO string)
 * - end_date: End date for event filtering (ISO string)
 * - has_tickets: Filter events with ticket links
 * - upcoming_only: Filter events to upcoming only (default: false)
 * - sort_by_distance: Sort results by distance (default: true)
 */
export async function GET(request: NextRequest) {
  try {
    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const params = Object.fromEntries(searchParams.entries());
    
    const validatedParams = nearbyParamsSchema.parse(params);
    
    const {
      lat,
      lon,
      radius,
      q,
      type,
      page,
      limit,
      genres,
      capacity_min,
      capacity_max,
      prosper_rank_min,
      start_date,
      end_date,
      has_tickets,
      upcoming_only,
      sort_by_distance
    } = validatedParams;

    // Check Elasticsearch health
    const isHealthy = await elasticsearchService.healthCheck();
    if (!isHealthy) {
      return NextResponse.json(
        { error: 'Search service is currently unavailable' },
        { status: 503 }
      );
    }

    // Validate coordinates are within Pacific Northwest region
    // WA, OR, ID, BC boundaries (approximate)
    const isInRegion = (
      lat >= 42.0 && lat <= 60.0 && // Latitude range
      lon >= -139.0 && lon <= -110.0 // Longitude range
    );

    if (!isInRegion) {
      return NextResponse.json(
        { 
          error: 'Location is outside supported regions',
          message: 'This service only covers Washington, Oregon, Idaho, and British Columbia'
        },
        { status: 400 }
      );
    }

    let results;

    // Prepare date filters for upcoming events
    const eventStartDate = upcoming_only ? new Date() : start_date;
    const eventEndDate = end_date;

    if (type === 'all') {
      // Search across all content types with geographic filtering
      const [venueResults, eventResults] = await Promise.all([
        elasticsearchService.searchVenues(q, {
          lat,
          lon,
          radius,
          page,
          limit,
          capacity_min,
          capacity_max,
          prosper_rank_min
        }),
        elasticsearchService.searchEvents(q, {
          lat,
          lon,
          radius,
          page,
          limit,
          start_date: eventStartDate,
          end_date: eventEndDate,
          genres,
          has_tickets
        })
      ]);

      // Artists don't have direct geographic data, so we find them through events
      const artistResults = await elasticsearchService.searchArtists(q, {
        page,
        limit,
        genres
      });

      results = {
        venues: venueResults,
        artists: artistResults,
        events: eventResults,
        total: venueResults.total + artistResults.total + eventResults.total
      };
    } else if (type === 'venue') {
      // Search venues with geographic filtering
      const venueResults = await elasticsearchService.searchVenues(q, {
        lat,
        lon,
        radius,
        page,
        limit,
        capacity_min,
        capacity_max,
        prosper_rank_min
      });

      results = {
        venues: venueResults,
        artists: { total: 0, hits: [] },
        events: { total: 0, hits: [] },
        total: venueResults.total
      };
    } else if (type === 'event') {
      // Search events with geographic filtering
      const eventResults = await elasticsearchService.searchEvents(q, {
        lat,
        lon,
        radius,
        page,
        limit,
        start_date: eventStartDate,
        end_date: eventEndDate,
        genres,
        has_tickets
      });

      results = {
        venues: { total: 0, hits: [] },
        artists: { total: 0, hits: [] },
        events: eventResults,
        total: eventResults.total
      };
    } else if (type === 'artist') {
      // For artists, we search through their events in the area
      const eventResults = await elasticsearchService.searchEvents('', {
        lat,
        lon,
        radius,
        page: 1,
        limit: 100, // Get more events to find unique artists
        start_date: eventStartDate,
        end_date: eventEndDate,
        genres
      });

      // Extract unique artists from events
      const artistIds = new Set<number>();
      const artistsMap = new Map<number, any>();

      eventResults.hits.forEach((hit: any) => {
        hit._source.artists?.forEach((artist: any) => {
          if (!artistIds.has(artist.id)) {
            artistIds.add(artist.id);
            artistsMap.set(artist.id, artist);
          }
        });
      });

      const uniqueArtists = Array.from(artistsMap.values());
      
      // Apply search query filter if provided
      const filteredArtists = q ? 
        uniqueArtists.filter(artist => 
          artist.name.toLowerCase().includes(q.toLowerCase())
        ) : uniqueArtists;

      // Paginate results
      const startIndex = (page - 1) * limit;
      const paginatedArtists = filteredArtists.slice(startIndex, startIndex + limit);

      results = {
        venues: { total: 0, hits: [] },
        artists: { 
          total: filteredArtists.length, 
          hits: paginatedArtists.map(artist => ({
            _source: artist,
            _score: 1.0
          }))
        },
        events: { total: 0, hits: [] },
        total: filteredArtists.length
      };
    }

    // Calculate distances for venues and events
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371; // Earth's radius in kilometers
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };

    // Format response with distance calculations
    const response = {
      query: q || '',
      location: { lat, lon },
      radius,
      type,
      results: {
        venues: {
          total: results.venues.total,
          items: results.venues.hits.map((hit: any) => {
            const venue = hit._source;
            const distance = calculateDistance(
              lat, lon, 
              venue.location.lat, venue.location.lon
            );
            
            return {
              id: venue.id,
              name: venue.name,
              address: venue.address,
              location: venue.location,
              capacity: venue.capacity,
              prosper_rank: venue.prosper_rank,
              city: venue.city,
              distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
              score: hit._score
            };
          }).sort((a: any, b: any) => 
            sort_by_distance ? a.distance - b.distance : b.score - a.score
          )
        },
        artists: {
          total: results.artists.total,
          items: results.artists.hits.map((hit: any) => ({
            id: hit._source.id,
            name: hit._source.name,
            genres: hit._source.genres,
            photo_url: hit._source.photo_url,
            profile_bio: hit._source.profile_bio,
            score: hit._score
          }))
        },
        events: {
          total: results.events.total,
          items: results.events.hits.map((hit: any) => {
            const event = hit._source;
            const distance = calculateDistance(
              lat, lon,
              event.venue.location.lat, event.venue.location.lon
            );
            
            return {
              id: event.id,
              title: event.title,
              description: event.description,
              event_datetime: event.event_datetime,
              ticket_url: event.ticket_url,
              venue: {
                ...event.venue,
                distance: Math.round(distance * 100) / 100
              },
              artists: event.artists,
              distance: Math.round(distance * 100) / 100,
              score: hit._score
            };
          }).sort((a: any, b: any) => 
            sort_by_distance ? a.distance - b.distance : b.score - a.score
          )
        }
      },
      pagination: {
        page,
        limit,
        total: results.total,
        total_pages: Math.ceil(results.total / limit)
      },
      filters: {
        location: { lat, lon },
        radius,
        type,
        genres,
        capacity_min,
        capacity_max,
        prosper_rank_min,
        start_date: eventStartDate?.toISOString(),
        end_date: eventEndDate?.toISOString(),
        has_tickets,
        upcoming_only,
        sort_by_distance
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Nearby search API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid query parameters',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}