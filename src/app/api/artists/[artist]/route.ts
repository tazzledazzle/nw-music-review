import { NextRequest, NextResponse } from 'next/server';
import { ArtistRepository } from '@/lib/repositories/artist-repository';

const artistRepository = new ArtistRepository();

/**
 * GET /api/artists/[artist] - Get artist profile with full data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { artist: string } }
) {
  try {
    const artistParam = params.artist;
    
    // Try to parse as ID first, then fall back to name search
    let artist;
    const artistId = parseInt(artistParam, 10);
    
    if (!isNaN(artistId)) {
      // Search by ID
      artist = await artistRepository.findByIdWithMedia(artistId);
    } else {
      // Search by name (URL decoded)
      const artistName = decodeURIComponent(artistParam);
      artist = await artistRepository.findByName(artistName);
      
      // If found by name, get full data with media
      if (artist) {
        artist = await artistRepository.findByIdWithMedia(artist.id);
      }
    }

    if (!artist) {
      return NextResponse.json(
        { error: { code: 'ARTIST_NOT_FOUND', message: 'Artist not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json(artist);
  } catch (error) {
    console.error('Error fetching artist:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
