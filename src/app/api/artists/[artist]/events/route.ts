import { NextRequest, NextResponse } from 'next/server';
import { ArtistRepository } from '@/lib/repositories/artist-repository';

const artistRepository = new ArtistRepository();

/**
 * GET /api/artists/[artist]/events - Get upcoming events for an artist
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { artist: string } }
) {
  try {
    const artistParam = params.artist;
    const { searchParams } = new URL(request.url);
    
    // Parse artist ID or name
    let artistId: number;
    const parsedId = parseInt(artistParam, 10);
    
    if (!isNaN(parsedId)) {
      artistId = parsedId;
    } else {
      // Search by name first to get ID
      const artistName = decodeURIComponent(artistParam);
      const artist = await artistRepository.findByName(artistName);
      
      if (!artist) {
        return NextResponse.json(
          { error: { code: 'ARTIST_NOT_FOUND', message: 'Artist not found' } },
          { status: 404 }
        );
      }
      
      artistId = artist.id;
    }

    // Parse query parameters
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const limit = searchParams.get('limit');
    const page = searchParams.get('page');

    const eventParams: any = {};
    
    if (startDate) {
      eventParams.start_date = new Date(startDate);
    }
    
    if (endDate) {
      eventParams.end_date = new Date(endDate);
    }
    
    if (limit) {
      eventParams.limit = parseInt(limit, 10);
    }
    
    if (page) {
      eventParams.page = parseInt(page, 10);
    }

    // Get upcoming events for the artist
    const events = await artistRepository.findUpcomingEvents(artistId, eventParams);

    return NextResponse.json({
      artist_id: artistId,
      events,
      total: events.length
    });
  } catch (error) {
    console.error('Error fetching artist events:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
