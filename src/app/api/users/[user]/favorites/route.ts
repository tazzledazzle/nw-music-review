import { NextRequest, NextResponse } from 'next/server';
import { AuthMiddleware } from '@/lib/auth/auth-middleware';
import { FavoritesRepository } from '@/lib/repositories/favorites-repository';
import { UserRepository } from '@/lib/repositories/user-repository';

const authMiddleware = new AuthMiddleware();
const favoritesRepository = new FavoritesRepository();
const userRepository = new UserRepository();

/**
 * GET /api/users/{user}/favorites
 * Get favorites for a specific user
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { user: string } }
): Promise<NextResponse> {
  // Authenticate user
  const authResult = await authMiddleware.authenticate(req);
  if (authResult) {
    return authResult;
  }

  const currentUser = AuthMiddleware.getUser(req);
  const requestedUserId = parseInt(params.user, 10);
  
  try {
    // Validate user ID
    if (isNaN(requestedUserId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }
    
    // Check if requested user exists
    const requestedUser = await userRepository.findById(requestedUserId);
    if (!requestedUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Only allow users to access their own favorites or admins to access any user's favorites
    if (currentUser.id !== requestedUserId && currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized to access this user\'s favorites' },
        { status: 403 }
      );
    }
    
    // Get query parameters
    const url = new URL(req.url);
    const entityType = url.searchParams.get('type') as 'venue' | 'artist' | undefined;
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const includeDetails = url.searchParams.get('details') === 'true';
    
    // Get favorites based on parameters
    if (includeDetails) {
      if (entityType === 'venue') {
        const venues = await favoritesRepository.getUserFavoriteVenues(requestedUserId, page, limit);
        return NextResponse.json(venues);
      } else if (entityType === 'artist') {
        const artists = await favoritesRepository.getUserFavoriteArtists(requestedUserId, page, limit);
        return NextResponse.json(artists);
      } else {
        // If no specific type with details requested, return separate lists
        const [venues, artists] = await Promise.all([
          favoritesRepository.getUserFavoriteVenues(requestedUserId, page, limit),
          favoritesRepository.getUserFavoriteArtists(requestedUserId, page, limit)
        ]);
        
        return NextResponse.json({
          venues,
          artists
        });
      }
    } else {
      // Return raw favorites without joining entity details
      const favorites = await favoritesRepository.getUserFavorites(requestedUserId, entityType, page, limit);
      return NextResponse.json(favorites);
    }
  } catch (error: any) {
    console.error('Error fetching user favorites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch favorites', details: error.message },
      { status: 500 }
    );
  }
}