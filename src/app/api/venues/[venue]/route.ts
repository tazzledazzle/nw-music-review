import { VenueRepository } from '@/lib/repositories/venue-repository';
import { NextRequest, NextResponse } from 'next/server';
import { ErrorHandler, AppError } from '@/lib/utils/error-handler';
import { PerformanceMonitor, RequestTracker } from '@/lib/utils/monitoring';
import { randomUUID } from 'crypto';

/**
 * GET /api/venues/{venue}
 * Returns detailed venue information
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { venue: string } }
) {
    const requestId = randomUUID();
    const startTime = Date.now();
    
    // Start request tracking
    RequestTracker.startRequest(requestId, `/api/venues/${params.venue}`, 'GET');

    try {
        const { venue } = params;

        if (!venue) {
            throw ErrorHandler.validationError("Venue parameter is required");
        }

        const venueId = parseInt(venue);
        
        if (isNaN(venueId)) {
            throw ErrorHandler.validationError("Venue ID must be a valid number");
        }

        // Get venue with city information
        const venueRepo = new VenueRepository();
        const dbStartTime = Date.now();
        const venueData = await venueRepo.findByIdWithCity(venueId);
        const dbDuration = Date.now() - dbStartTime;

        // Record database performance
        PerformanceMonitor.recordDatabaseQuery('SELECT', 'venues', dbDuration, !!venueData);

        if (!venueData) {
            throw ErrorHandler.notFound('Venue', venueId);
        }

        // Record successful response metrics
        const responseTime = Date.now() - startTime;
        PerformanceMonitor.recordApiResponseTime(`/api/venues/${venue}`, 'GET', 200, responseTime);
        RequestTracker.endRequest(requestId, 200);

        return NextResponse.json({
            venue: venueData
        });

    } catch (error) {
        // Record error metrics
        const responseTime = Date.now() - startTime;
        const statusCode = error instanceof AppError ? error.statusCode : 500;
        PerformanceMonitor.recordApiResponseTime(`/api/venues/${params.venue}`, 'GET', statusCode, responseTime);
        RequestTracker.endRequest(requestId, statusCode);

        return ErrorHandler.handleError(error, requestId);
    }
}