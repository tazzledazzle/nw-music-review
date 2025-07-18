import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from './auth-service';

/**
 * Authentication middleware for Next.js API routes
 */
export class AuthMiddleware {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Middleware to authenticate requests
   * @param req Next.js request
   * @returns Response with error or null if authenticated
   */
  async authenticate(req: NextRequest): Promise<NextResponse | null> {
    try {
      // Get token from Authorization header
      const authHeader = req.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      const token = authHeader.split(' ')[1];
      if (!token) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      // Verify token
      const userId = await this.authService.verifyToken(token);
      if (!userId) {
        return NextResponse.json(
          { error: 'Invalid token' },
          { status: 401 }
        );
      }

      // Get user
      const user = await this.authService.getUserById(userId);
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 401 }
        );
      }

      // Add user to request context
      (req as any).user = user;

      return null;
    } catch (error) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
  }

  /**
   * Middleware to require admin role
   * @param req Next.js request
   * @returns Response with error or null if authorized
   */
  async requireAdmin(req: NextRequest): Promise<NextResponse | null> {
    // First authenticate
    const authResult = await this.authenticate(req);
    if (authResult) {
      return authResult;
    }

    // Check if user is admin
    const user = (req as any).user;
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    return null;
  }

  /**
   * Helper function to get authenticated user from request
   * @param req Next.js request
   * @returns User object or null if not authenticated
   */
  static getUser(req: NextRequest): any {
    return (req as any).user || null;
  }
}