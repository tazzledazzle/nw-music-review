import { NextResponse } from 'next/server';
import { CityRepository } from '@/lib/repositories/city-repository';

/**
 * GET /api/regions
 * Returns a list of regions (WA, OR, ID, BC)
 */
export async function GET() {
  try {
    // Define the specific regions we want to return based on requirements
    const targetRegions = ['WA', 'OR', 'ID', 'BC'];
    
    // Get all regions from the database
    const cityRepo = new CityRepository();
    const allRegions = await cityRepo.getRegions();
    
    // Filter to only include our target regions
    const filteredRegions = allRegions
      .map(country => {
        // Filter regions to only include our target regions
        const filteredRegionsList = country.regions.filter(region => 
          targetRegions.includes(region)
        );
        
        // Only return countries that have at least one of our target regions
        if (filteredRegionsList.length > 0) {
          return {
            country: country.country,
            regions: filteredRegionsList
          };
        }
        return null;
      })
      .filter(Boolean); // Remove null entries
    
    return NextResponse.json({
      regions: filteredRegions
    });
  } catch (error) {
    console.error('Error fetching regions:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch regions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}