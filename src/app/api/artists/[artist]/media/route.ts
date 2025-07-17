import { NextRequest, NextResponse } from 'next/server';
import { ArtistRepository } from '@/lib/repositories/artist-repository';

const artistRepository = new ArtistRepository();

/**
 * GET /api/artists/[artist]/media - Get media (photos and videos) for an artist
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
    const type = searchParams.get('type') as 'photo' | 'video' | null;

    // Validate type parameter if provided
    if (type && !['photo', 'video'].includes(type)) {
      return NextResponse.json(
        { error: { code: 'INVALID_TYPE', message: 'Type must be either "photo" or "video"' } },
        { status: 400 }
      );
    }

    // Get media for the artist
    const media = await artistRepository.findMedia(artistId, type || undefined);

    // Separate photos and videos for easier frontend consumption
    const photos = media.filter(m => m.type === 'photo');
    const videos = media.filter(m => m.type === 'video');

    return NextResponse.json({
      artist_id: artistId,
      media: {
        photos,
        videos,
        total: media.length,
        photo_count: photos.length,
        video_count: videos.length
      }
    });
  } catch (error) {
    console.error('Error fetching artist media:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
