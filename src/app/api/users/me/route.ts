import { NextRequest, NextResponse } from 'next/server';
import { AuthMiddleware } from '@/lib/auth/auth-middleware';

/**
 * GET /api/users/me
 * Get current user profile
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // Authenticate request
    const authMiddleware = new AuthMiddleware();
    const authResult = await authMiddleware.authenticate(req);
    if (authResult) {
      return authResult;
    }

    // Get user from request
    const user = AuthMiddleware.getUser(req);
    
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Get user profile error:', error);
    
    return NextResponse.json(
      { error: 'Failed to get user profile' },
      { status: 500 }
    );
  }
}