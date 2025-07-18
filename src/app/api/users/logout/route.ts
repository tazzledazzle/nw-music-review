import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth-service';
import { AuthMiddleware } from '@/lib/auth/auth-middleware';

/**
 * POST /api/users/logout
 * Logout a user
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Authenticate request
    const authMiddleware = new AuthMiddleware();
    const authResult = await authMiddleware.authenticate(req);
    if (authResult) {
      return authResult;
    }

    // Get token from Authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    
    // Logout user
    const authService = new AuthService();
    const success = await authService.logout(token);

    if (success) {
      return NextResponse.json({ message: 'Logged out successfully' });
    } else {
      return NextResponse.json(
        { error: 'Logout failed' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Logout error:', error);
    
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}