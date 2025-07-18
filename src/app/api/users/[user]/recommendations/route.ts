import { NextRequest, NextResponse } from 'next/server';
import { RecommendationRepository } from '@/lib/repositories/recommendation-repository';
import { UserRepository } from '@/lib/repositories/user-repository';
import { authMiddleware } from '@/lib/auth/auth-middleware';

/**
 * GET /api/users/{user}/recommendations
 * 
 * Get personalized recommendations for a user based on their favorites
 * 
 * Query parameters:
 * - limit: Maximum number of each type of recommendation (default: 5)
 * - type: Type of recommendations to return ('venues', 'artists', 'events', or 'all')
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { user: string } }
) {
  try {
    // Authenticate the request
    const authResult = await authMiddleware(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the user is requesting their own recommendations or is an admin
    const userId = parseInt(params.user);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    if (authResult.user.id !== userId && authResult.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify the user exists
    const userRepository = new UserRepository();
    const user = await userRepository.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '5');
    const type = searchParams.get('type') || 'all';

    // Get recommendations
    const recommendationRepository = new RecommendationRepository();

    switch (type) {
      case 'venues':
        const venues = await recommendationRepository.getRecommendedVenues(userId, limit);
        return NextResponse.json({ venues });

      case 'artists':
        const artists = await recommendationRepository.getRecommendedArtists(userId, limit);
        return NextResponse.json({ artists });

      case 'events':
        const events = await recommendationRepository.getRecommendedEvents(userId, limit);
        return NextResponse.json({ events });

      case 'all':
      default:
        const recommendations = await recommendationRepository.getAllRecommendations(userId, limit);
        return NextResponse.json(recommendations);
    }
  } catch (error) {
    console.error('Error getting recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to get recommendations' },
      { status: 500 }
    );
  }
}