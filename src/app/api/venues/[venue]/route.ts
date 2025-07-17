import { VenueRepository } from '@/lib/repositories/venue-repository';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/venues/{venue}
 * Returns detailed venue information
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { venue: string } }
) {
    try {
        const { venue } = params;

        if (!venue) {
            return NextResponse.json(
                { error: "Venue parameter is required" },
                { status: 400 }
            );
        }

        const venueId = parseInt(venue);
        
        if (isNaN(venueId)) {
            return NextResponse.json(
                { error: "Venue ID must be a valid number" },
                { status: 400 }
            );
        }

        // Get venue with city information
        const venueRepo = new VenueRepository();
        const venueData = await venueRepo.findByIdWithCity(venueId);

        if (!venueData) {
            return NextResponse.json(
                { error: `No venue found with ID: ${venueId}` },
                { status: 404 }
            );
        }

        return NextResponse.json({
            venue: venueData
        });

    } catch (error) {
        console.error(`Error fetching venue ${params.venue}:`, error);
        return NextResponse.json(
            {
                error: 'Failed to fetch venue',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}