import { EventRepository } from '@/lib/repositories/event-repository';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/venues/{venue}/events
 * Returns events for a specific venue with optional date filtering
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { venue: string } }
) {
    try {
        const { venue } = params;
        const { searchParams } = new URL(request.url);

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

        // Parse query parameters
        const page = parseInt(searchParams.get('page') || '1');
        const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100); // Cap at 100
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');

        // Validate date parameters if provided
        let parsedStartDate: Date | undefined;
        let parsedEndDate: Date | undefined;

        if (startDate) {
            parsedStartDate = new Date(startDate);
            if (isNaN(parsedStartDate.getTime())) {
                return NextResponse.json(
                    { error: "Invalid start_date format. Use ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)" },
                    { status: 400 }
                );
            }
        }

        if (endDate) {
            parsedEndDate = new Date(endDate);
            if (isNaN(parsedEndDate.getTime())) {
                return NextResponse.json(
                    { error: "Invalid end_date format. Use ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)" },
                    { status: 400 }
                );
            }
        }

        // Validate date range
        if (parsedStartDate && parsedEndDate && parsedStartDate > parsedEndDate) {
            return NextResponse.json(
                { error: "start_date cannot be after end_date" },
                { status: 400 }
            );
        }

        // Get events for the venue
        const eventRepo = new EventRepository();
        const eventsResult = await eventRepo.findByVenueId(venueId, {
            page,
            limit,
            start_date: parsedStartDate,
            end_date: parsedEndDate
        });

        return NextResponse.json({
            events: eventsResult.data,
            pagination: {
                page: eventsResult.page,
                limit: eventsResult.limit,
                total: eventsResult.total,
                total_pages: eventsResult.total_pages
            }
        });

    } catch (error) {
        console.error(`Error fetching events for venue ${params.venue}:`, error);
        return NextResponse.json(
            {
                error: 'Failed to fetch venue events',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}