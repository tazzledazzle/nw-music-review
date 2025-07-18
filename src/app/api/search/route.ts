import { NextRequest, NextResponse } from 'next/server';
import { elasticsearchService } from '@/lib/search/elasticsearch';
import { z } from 'zod';

// Search query parameters schema
const searchParamsSchema = z.object({
  q: z.string().min(1, 'Query parameter is required'),
  type: z.enum(['venue', 'artist', 'event', 'all']).optional().default('all'),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(50).optional().default(10),
  genres: z.string().optional().transform(val => val ? val.split(',') : undefined),
  state_province: z.string().optional().transform(val => val ? val.split(',') : undefined),
  country: z.string().optional().transform(val => val ? val.split(',') : undefined),
  capacity_min: z.coerce.number().min(0).optional(),
  capacity_max: z.coerce.number().min(0).optional(),
  prosper_rank_min: z.coerce.number().min(0).optional(),
  start_date: z.string().optional().transform(val => val ? new Date(val) : undefined),
  end_date: z.string().optional().transform(val => val ? new Date(val) : undefined),
  has_tickets: z.coerce.boolean().optional(),
  has_bio: z.coerce.boolean().optional(),
  has_photo: z.coerce.boolean().optional(),
  sort_by: z.string().optional(),
  sort_dir: z.enum(['asc', 'desc']).optional().default('desc')
});

/**
 * GET /api/search
 * 
 * Universal search endpoint that searches across venues, artists, and events
 * with comprehensive filtering and categorization capabilities.
 * 
 * Query Parameters:
 * - q: Search query string (required)
 * - type: Content type filter (venue|artist|event|all, default: all)
 * - page: Page number for pagination (default: 1)
 * - limit: Results per page (max 50, default: 10)
 * - genres: Comma-separated list of genres to filter by
 * - state_province: Comma-separated list of states/provinces
 * - country: Comma-separated list of countries
 * - capacity_min: Minimum venue capacity
 * - capacity_max: Maximum venue capacity
 * - prosper_rank_min: Minimum prosper rank for venues
 * - start_date: Start date for event filtering (ISO string)
 * - end_date: End date for event filtering (ISO string)
 * - has_tickets: Filter events with ticket links
 * - has_bio: Filter artists with bios
 * - has_photo: Filter artists with photos
 * - sort_by: Field to sort by
 * - sort_dir: Sort direction (asc|desc)
 */
export async function GET(request: NextRequest) {
  try {
    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const params = Object.fromEntries(searchParams.entries());
    
    const validatedParams = searchParamsSchema.parse(params);
    
    const {
      q,
      type,
      page,
      limit,
      genres,
      state_province,
      country,
      capacity_min,
      capacity_max,
      prosper_rank_min,
      start_date,
      end_date,
      has_tickets,
      has_bio,
      has_photo,
      sort_by,
      sort_dir
    } = validatedParams;

    // Check Elasticsearch health
    const isHealthy = await elasticsearchService.healthCheck();
    if (!isHealthy) {
      return NextResponse.json(
        { error: 'Search service is currently unavailable' },
        { status: 503 }
      );
    }

    let results;

    if (type === 'all') {
      // Search across all content types
      results = await elasticsearchService.searchAll(q, {
        page,
        limit,
        sort_by,
        sort_dir
      });

      // Apply additional filtering for categorized results
      if (genres || state_province || country) {
        // Re-search with filters for each category
        const [venueResults, artistResults, eventResults] = await Promise.all([
          elasticsearchService.searchVenues(q, {
            page,
            limit,
            capacity_min,
            capacity_max,
            prosper_rank_min,
            state_province,
            country,
            sort_by,
            sort_dir
          }),
          elasticsearchService.searchArtists(q, {
            page,
            limit,
            genres,
            has_bio,
            has_photo,
            sort_by,
            sort_dir
          }),
          elasticsearchService.searchEvents(q, {
            page,
            limit,
            start_date,
            end_date,
            genres,
            has_tickets,
            sort_by,
            sort_dir
          })
        ]);

        results = {
          venues: venueResults,
          artists: artistResults,
          events: eventResults,
          total: venueResults.total + artistResults.total + eventResults.total
        };
      }
    } else if (type === 'venue') {
      // Search venues only
      const venueResults = await elasticsearchService.searchVenues(q, {
        page,
        limit,
        capacity_min,
        capacity_max,
        prosper_rank_min,
        state_province,
        country,
        sort_by,
        sort_dir
      });

      results = {
        venues: venueResults,
        artists: { total: 0, hits: [] },
        events: { total: 0, hits: [] },
        total: venueResults.total
      };
    } else if (type === 'artist') {
      // Search artists only
      const artistResults = await elasticsearchService.searchArtists(q, {
        page,
        limit,
        genres,
        has_bio,
        has_photo,
        sort_by,
        sort_dir
      });

      results = {
        venues: { total: 0, hits: [] },
        artists: artistResults,
        events: { total: 0, hits: [] },
        total: artistResults.total
      };
    } else if (type === 'event') {
      // Search events only
      const eventResults = await elasticsearchService.searchEvents(q, {
        page,
        limit,
        start_date,
        end_date,
        genres,
        has_tickets,
        sort_by,
        sort_dir
      });

      results = {
        venues: { total: 0, hits: [] },
        artists: { total: 0, hits: [] },
        events: eventResults,
        total: eventResults.total
      };
    }

    // Format response with categorized results and metadata
    const response = {
      query: q,
      type,
      results: {
        venues: {
          total: results.venues.total,
          items: results.venues.hits.map((hit: any) => ({
            id: hit._source.id,
            name: hit._source.name,
            address: hit._source.address,
            location: hit._source.location,
            capacity: hit._source.capacity,
            prosper_rank: hit._source.prosper_rank,
            city: hit._source.city,
            score: hit._score
          }))
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
          items: results.events.hits.map((hit: any) => ({
            id: hit._source.id,
            title: hit._source.title,
            description: hit._source.description,
            event_datetime: hit._source.event_datetime,
            ticket_url: hit._source.ticket_url,
            venue: hit._source.venue,
            artists: hit._source.artists,
            score: hit._score
          }))
        }
      },
      pagination: {
        page,
        limit,
        total: results.total,
        total_pages: Math.ceil(results.total / limit)
      },
      filters: {
        type,
        genres,
        state_province,
        country,
        capacity_min,
        capacity_max,
        prosper_rank_min,
        start_date: start_date?.toISOString(),
        end_date: end_date?.toISOString(),
        has_tickets,
        has_bio,
        has_photo
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Search API error:', error);
    
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