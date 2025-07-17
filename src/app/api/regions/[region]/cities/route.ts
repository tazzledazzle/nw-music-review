import { NextRequest, NextResponse } from 'next/server';
import { CityRepository } from '@/lib/repositories/city-repository';
import { VenueRepository } from '@/lib/repositories/venue-repository';

/**
 * GET /api/regions/{region}/cities
 * Returns cities in a specific region with venue counts
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { region: string } }
) {
  try {
    const { region } = params;
    
    if (!region) {
      return NextResponse.json(
        { error: 'Region parameter is required' },
        { status: 400 }
      );
    }
    
    // Get cities in the specified region
    const cityRepo = new CityRepository();
    const cities = await cityRepo.findByStateProvince(region);
    
    if (cities.length === 0) {
      return NextResponse.json(
        { error: `No cities found in region: ${region}` },
        { status: 404 }
      );
    }
    
    // Get venue counts for each city
    const venueRepo = new VenueRepository();
    const venueCounts = await venueRepo.getVenueCountsByCity();
    
    // Map venue counts to cities
    const citiesWithVenueCounts = cities.map(city => {
      const venueCount = venueCounts.find(vc => vc.city_id === city.id)?.venue_count || 0;
      return {
        ...city,
        venue_count: venueCount
      };
    });
    
    // Sort cities by name
    citiesWithVenueCounts.sort((a, b) => a.name.localeCompare(b.name));
    
    return NextResponse.json({
      region,
      cities: citiesWithVenueCounts
    });
  } catch (error) {
    console.error(`Error fetching cities for region ${params.region}:`, error);
    return NextResponse.json(
      {
        error: 'Failed to fetch cities',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

