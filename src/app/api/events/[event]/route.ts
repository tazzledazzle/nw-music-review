import { EventRepository } from '@/lib/repositories/event-repository';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/events/{event}
 * Returns detailed event information including venue and artist details
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { event: string } }
) {
    try {
        const { event } = params;

        if (!event) {
            return NextResponse.json(
                { error: "Event parameter is required" },
                { status: 400 }
            );
        }

        const eventId = parseInt(event);
        
        if (isNaN(eventId)) {
            return NextResponse.json(
                { error: "Event ID must be a valid number" },
                { status: 400 }
            );
        }

        // Get event with full details
        const eventRepo = new EventRepository();
        const eventData = await eventRepo.findByIdWithDetails(eventId);

        if (!eventData) {
            return NextResponse.json(
                { error: `No event found with ID: ${eventId}` },
                { status: 404 }
            );
        }

        // Add event status based on date
        const now = new Date();
        const eventDate = new Date(eventData.event_datetime);
        let status = 'upcoming';
        
        if (eventDate < now) {
            // Check if event was within the last 24 hours (could be ongoing)
            const hoursSinceEvent = (now.getTime() - eventDate.getTime()) / (1000 * 60 * 60);
            if (hoursSinceEvent <= 24) {
                status = 'ongoing';
            } else {
                status = 'past';
            }
        } else {
            // Check if event is within the next 24 hours
            const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);
            if (hoursUntilEvent <= 24) {
                status = 'today';
            }
        }

        return NextResponse.json({
            event: {
                ...eventData,
                status,
                // Add formatted date for convenience
                formatted_date: eventDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                formatted_time: eventDate.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                })
            }
        });

    } catch (error) {
        console.error(`Error fetching event ${params.event}:`, error);
        return NextResponse.json(
            {
                error: 'Failed to fetch event',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}