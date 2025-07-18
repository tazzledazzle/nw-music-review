import { NextRequest, NextResponse } from 'next/server';
import { AuthMiddleware } from '@/lib/auth/auth-middleware';
import { FavoritesRepository } from '@/lib/repositories/favorites-repository';

const authMiddleware = new AuthMiddleware();
const favoritesRepository = new FavoritesRepository();

/**
 * POST /api/users/favorites
 * Add or remove a favorite item for the authenticated user
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  // Authenticate user
  const authResult = await authMiddleware.authenticate(req);
  if (authResult) {
    return authResult;
  }

  const user = AuthMiddleware.getUser(req);
  
  try {
    const { entityType, entityId, action } = await req.json();
    
    // Validate request body
    if (!entityType || !entityId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: entityType, entityId, action' },
        { status: 400 }
      );
    }
    
    // Validate entity type
    if (entityType !== 'venue' && entityType !== 'artist') {
      return NextResponse.json(
        { error: 'Invalid entity type. Must be "venue" or "artist"' },
        { status: 400 }
      );
    }
    
    // Validate action
    if (action !== 'add' && action !== 'remove') {
      return NextResponse.json(
        { error: 'Invalid action. Must be "add" or "remove"' },
        { status: 400 }
      );
    }
    
    // Add or remove favorite
    if (action === 'add') {
      const favorite = await favoritesRepository.addFavorite(user.id, entityType, entityId);
      return NextResponse.json({ success: true, favorite });
    } else {
      const removed = await favoritesRepository.removeFavorite(user.id, entityType, entityId);
      return NextResponse.json({ success: removed });
    }
  } catch (error: any) {
    console.error('Error managing favorites:', error);
    return NextResponse.json(
      { error: 'Failed to manage favorites', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/users/favorites
 * Get all favorites for the authenticated user
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  // Authenticate user
  const authResult = await authMiddleware.authenticate(req);
  if (authResult) {
    return authResult;
  }

  const user = AuthMiddleware.getUser(req);
  
  try {
    // Get query parameters
    const url = new URL(req.url);
    const entityType = url.searchParams.get('type') as 'venue' | 'artist' | undefined;
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const includeDetails = url.searchParams.get('details') === 'true';
    
    // Get favorites based on parameters
    if (includeDetails) {
      if (entityType === 'venue') {
        const venues = await favoritesRepository.getUserFavoriteVenues(user.id, page, limit);
        return NextResponse.json(venues);
      } else if (entityType === 'artist') {
        const artists = await favoritesRepository.getUserFavoriteArtists(user.id, page, limit);
        return NextResponse.json(artists);
      } else {
        // If no specific type with details requested, return separate lists
        const [venues, artists] = await Promise.all([
          favoritesRepository.getUserFavoriteVenues(user.id, page, limit),
          favoritesRepository.getUserFavoriteArtists(user.id, page, limit)
        ]);
        
        return NextResponse.json({
          venues,
          artists
        });
      }
    } else {
      // Return raw favorites without joining entity details
      const favorites = await favoritesRepository.getUserFavorites(user.id, entityType, page, limit);
      return NextResponse.json(favorites);
    }
  } catch (error: any) {
    console.error('Error fetching favorites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch favorites', details: error.message },
      { status: 500 }
    );
  }
}