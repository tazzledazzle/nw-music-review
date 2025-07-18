import { CityRepository } from '@/lib/repositories/city-repository';
import { VenueRepository } from '@/lib/repositories/venue-repository';
import { NextRequest, NextResponse } from 'next/server';
import { withCaching, CACHE_CONFIGS } from '@/lib/utils/cache-utils';

/**
 * GET /api/cities/{city}/venues
 * Returns venues in a specific city with pagination
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { city: string } }
) {
    try {
        const { city } = params;

        if (!city) {
            return NextResponse.json(
                { error: "City parameter is required" },
                { status: 400 }
            );
        }

        // Parse query parameters for pagination and filtering
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const sortBy = searchParams.get('sort_by') || 'name';
        const sortDir = (searchParams.get('sort_dir') || 'asc') as 'asc' | 'desc';
        
        // Get genre filter from request headers (set by middleware)
        const genreFilter = request.headers.get('x-genre-filter');

        // Find the city first
        const cityRepo = new CityRepository();
        const cities = await cityRepo.findAll();
        const targetCity = cities.find(c =>
            c.name.toLowerCase() === decodeURIComponent(city).toLowerCase()
        );

        if (!targetCity) {
            return NextResponse.json(
                { error: `No city found with name: ${city}` },
                { status: 404 }
            );
        }

        // Get venues for the city with pagination
        const venueRepo = new VenueRepository();
        
        // Apply genre filter if present
        if (genreFilter) {
            venueRepo.setGenreFilter(genreFilter);
        }
        
        const result = await venueRepo.findByCityId(targetCity.id, {
            page,
            limit,
            sort_by: sortBy,
            sort_dir: sortDir
        });

        // Create the response
        const response = NextResponse.json({
            city: targetCity.name,
            genre: genreFilter || null,
            venues: result.data,
            pagination: {
                page: result.page,
                limit: result.limit,
                total: result.total,
                total_pages: result.total_pages
            }
        });
        
        // Apply caching headers - use STANDARD cache for venue listings
        // This allows for a good balance between freshness and performance
        return withCaching(request, response);

    } catch (error) {
        console.error(`Error fetching venues for city ${params.city}:`, error);
        return NextResponse.json(
            {
                error: 'Failed to fetch venues',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// Configure Next.js to use ISR (Incremental Static Regeneration) for this route
export const revalidate = 3600; // Revalidate every hour